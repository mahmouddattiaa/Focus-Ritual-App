const Stats = require('../models/stats.model.js');
const { Task, Habit } = require('../models/models');
const User = require('../models/user.model.js');

exports.IncSessions = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user._id;
        const today = new Date();
        const dateKey = today.toISOString().split('T')[0];
        const updatedStats = await Stats.findOneAndUpdate(
            { userId },
            {
                $inc: {
                    focusSessions: 1,
                    [`dailyActivity.${dateKey}.focusSessions`]: 1
                }
            },
            {
                new: true,
                upsert: true
            }
        );
        if (updatedStats) {
            return res.status(200).json({
                message: 'Focus sessions updated successfully!',
                focusSession: updatedStats.focusSessions,
                dailyFocusSession: updatedStats.dailyActivity.get(dateKey)?.focusSessions || 0
            });
        }
        else {
            return res.status(400).json({
                message: 'failed to update focus sessions'
            });
        }


    } catch (err) {
        console.log('failed to update focus sessions due to: ', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }

};

exports.IncreaseHours = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user._id;
        const today = new Date();
        const dateKey = today.toISOString().split('T')[0];
        const { time, distractions } = req.body;
        if (typeof time !== 'number' || isNaN(time) || time < 0) {
            return res.status(400).json({
                message: 'Invalid Input'
            });
        }
        const updatedStats = await Stats.findOneAndUpdate(
            { userId },
            {
                $inc: {
                    focusTime: time,
                    [`dailyActivity.${dateKey}.focusTime`]: time,
                    totalDistractions: distractions
                }
            },
            {
                new: true,
                upsert: true
            }
        );
        if (updatedStats) {
            const focusSessions = updatedStats.focusSessions;
            const focusTime = updatedStats.focusTime;
            const totalCompleted = updatedStats.tasksCompleted.totalCompleted;
            const totalTasks = updatedStats.tasksCompleted.totalTasks;
            const habitStreak = updatedStats.habitStreak;
            const totalDistractions = updatedStats.totalDistractions || 0;


            const completionRate = totalTasks > 0 ? totalCompleted / totalTasks : 0;


            const normFocusSessions = Math.min(focusSessions / 10, 1); // 10 sessions = max
            const normFocusTime = Math.min(focusTime / 600, 1);        // 600 min (10h) = max
            const normCompletionRate = completionRate;                 // already 0-1
            const normStreak = Math.min(habitStreak / 30, 1);          // 30 days = max
            const normDistractions = Math.min(totalDistractions / 50, 1); // 50 distractions = max


            const productivityScore = (
                0.3 * normFocusSessions +
                0.3 * normFocusTime +
                0.2 * normCompletionRate +
                0.2 * normStreak -
                0.1 * normDistractions
            ) * 100;

            const finalProductivityScore = Math.round(Math.max(0, Math.min(100, productivityScore)));
            const updatedProductivity = await Stats.findOneAndUpdate(
                {
                    userId
                },
                {
                    $set: {
                        productivityScore: finalProductivityScore
                    }
                }
            )
            if (updatedProductivity) {
                return res.status(200).json({
                    message: 'Focus time updated successfully!',
                    focusTime: updatedStats.focusTime,
                    dailyFocusTime: updatedStats.dailyActivity.get(dateKey)?.focusTime || 0,
                    productivityScore: updatedProductivity.productivityScore
                });
            }
            else {
                return res.status(400).json({
                    message: 'failed to update Completed tasks'
                });
            }

        }
        else {
            return res.status(400).json({
                message: 'failed to update focus time'
            });
        }


    } catch (err) {
        console.log('failed to update focus time due to: ', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }

};

exports.CompleteTask = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user._id;
        const today = new Date();
        const dateKey = today.toISOString().split('T')[0];
        await Streak(userId);
        const updatedStats = await Stats.findOneAndUpdate(
            { userId },
            {
                $inc: {
                    'tasksCompleted.totalCompleted': 1,
                    [`dailyActivity.${dateKey}.tasksCompleted`]: 1
                }
            },
            {
                new: true,
                upsert: true
            }
        );
        if (updatedStats) {

            const focusSessions = updatedStats.focusSessions;
            const focusTime = updatedStats.focusTime;
            const totalCompleted = updatedStats.tasksCompleted.totalCompleted;
            const totalTasks = updatedStats.tasksCompleted.totalTasks;
            const habitStreak = updatedStats.habitStreak;
            const totalDistractions = updatedStats.totalDistractions || 0;


            const completionRate = totalTasks > 0 ? totalCompleted / totalTasks : 0;


            const normFocusSessions = Math.min(focusSessions / 10, 1); // 10 sessions = max
            const normFocusTime = Math.min(focusTime / 600, 1);        // 600 min (10h) = max
            const normCompletionRate = completionRate;                 // already 0-1
            const normStreak = Math.min(habitStreak / 30, 1);          // 30 days = max
            const normDistractions = Math.min(totalDistractions / 50, 1); // 50 distractions = max


            const productivityScore = (
                0.3 * normFocusSessions +
                0.3 * normFocusTime +
                0.2 * normCompletionRate +
                0.2 * normStreak -
                0.1 * normDistractions
            ) * 100;

            const finalProductivityScore = Math.round(Math.max(0, Math.min(100, productivityScore)));
            const updatedProductivity = await Stats.findOneAndUpdate(
                {
                    userId
                },
                {
                    $set: {
                        productivityScore: finalProductivityScore
                    }
                }
            )
            if (updatedProductivity) {
                return res.status(200).json({
                    message: 'Completed tasks updated successfully!',
                    Completedtasks: updatedStats.tasksCompleted.totalCompleted,
                    dailyFocusTime: updatedStats.dailyActivity.get(dateKey)?.tasksCompleted || 0,
                    productivityScore: updatedProductivity.productivityScore
                });
            }
            else {
                return res.status(400).json({
                    message: 'failed to update Completed tasks'
                });
            }
        }
        else {
            return res.status(400).json({
                message: 'failed to update Completed tasks'
            });
        }


    } catch (err) {
        console.log('failed to update Completed tasks due to: ', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }

};

exports.DecrementTask = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user._id;

        const updatedStats = await Stats.findOneAndUpdate(
            { userId, 'tasksCompleted.totalCompleted': { $gt: 0 } }, // Ensure it doesn't go below 0
            {
                $inc: {
                    'tasksCompleted.totalCompleted': -1,
                }
            },
            { new: true }
        );

        if (updatedStats) {
            return res.status(200).json({
                message: 'Completed tasks decremented successfully!',
                Completedtasks: updatedStats.tasksCompleted.totalCompleted,
            });
        } else {
            return res.status(400).json({
                message: 'Failed to decrement completed tasks or count is already 0'
            });
        }
    } catch (err) {
        console.log('failed to decrement Completed tasks due to: ', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }
};

const Streak = async (userId) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = await Stats.findOne({ userId });
        let lastActiveDate = stats?.lastActiveDate ? new Date(stats.lastActiveDate) : null;
        if (lastActiveDate) lastActiveDate.setHours(0, 0, 0, 0);

        let streakUpdate = {};

        if (!lastActiveDate) {
            streakUpdate = { $set: { habitStreak: 1 } };
        } else if (lastActiveDate.getTime() !== today.getTime()) {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            if (lastActiveDate.getTime() === yesterday.getTime()) {
                streakUpdate = { $inc: { habitStreak: 1 } };
            } else {
                streakUpdate = { $set: { habitStreak: 1 } };
            }
        } else {
            // Already updated today, do nothing
            return;
        }

        await Stats.findOneAndUpdate(
            { userId },
            {
                ...streakUpdate,
                $set: { lastActiveDate: today }
            },
            { new: true, upsert: true }
        );
    } catch (err) {
        console.log('Failed to update habit streak due to: ', err);

    }
};

exports.GetAllStats = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user._id;
        const stats = await Stats.findOne({ userId });
        if (!stats) {
            return res.status(404).json({ message: 'Stats not found for this user.' });
        }
        return res.status(200).json({
            message: 'Stats fetched successfully!',
            stats: {
                focusSessions: stats.focusSessions,
                focusTime: stats.focusTime,
                tasksCompleted: stats.tasksCompleted,
                habitStreak: stats.habitStreak,
                productivityScore: stats.productivityScore,
                level: stats.level,
                lastActiveDate: stats.lastActiveDate,
                dailyActivity: Object.fromEntries(stats.dailyActivity)
            }
        });
    } catch (err) {
        console.log('Failed to fetch stats due to: ', err);
        return res.status(500).json({
            message: 'Server error',
            error: err.message
        });
    }
};

exports.getTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user._id });
        res.status(200).json({
            message: "Tasks fetched successfully!",
            tasks: tasks.map(task => ({
                taskId: task._id,
                taskTitle: task.title,
                taskDescription: task.description,
                priority: task.priority.level,
                category: task.category,
                estimatedTime: task.estimatedTime,
                dueDate: task.dueDate,
                tags: task.tags,
                subTasks: (task.subtasks || []).map(st => st.title),
                status: task.status.type,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt,
                completedAt: task.completedAt,
            }))
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching tasks", error: error.message });
    }
};

exports.addTask = async (req, res) => {
    try {
        const { taskTitle, taskDescription, priority, category, estimatedTime, dueDate, tags, subTasks } = req.body;
        const priorityLevel = priority.toLowerCase();

        const newTask = new Task({
            userId: req.user._id,
            title: taskTitle,
            description: taskDescription,
            priority: {
                level: priorityLevel,
                color: getPriorityColor(priorityLevel)
            },
            urgency: {
                level: priorityLevel,
                color: getPriorityColor(priorityLevel)
            },
            status: { type: 'todo', label: 'To Do', color: '#6B7280' },
            category,
            estimatedTime,
            dueDate,
            tags,
            subtasks: (subTasks || []).map((title, index) => ({ id: `${Date.now()}-${index}`, title, completed: false })),
            dependencies: []
        });

        const savedTask = await newTask.save();

        res.status(201).json({
            message: "Task added successfully!",
            task: savedTask
        });
    } catch (error) {
        res.status(500).json({ message: "Error adding task", error: error.message });
    }
};

exports.updateTask = async (req, res) => {
    try {
        const { taskId, taskTitle, taskDescription, priority, category, estimatedTime, dueDate, tags, subTasks } = req.body;
        const priorityLevel = priority.toLowerCase();

        const updatedTask = await Task.findByIdAndUpdate(taskId, {
            title: taskTitle,
            description: taskDescription,
            priority: {
                level: priorityLevel,
                color: getPriorityColor(priorityLevel)
            },
            urgency: {
                level: priorityLevel,
                color: getPriorityColor(priorityLevel)
            },
            category,
            estimatedTime,
            dueDate,
            tags,
            subtasks: (subTasks || []).map((title, index) => ({ id: `${taskId}-sub-${index}`, title, completed: false })),
        }, { new: true });

        if (!updatedTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.status(200).json({
            message: "Task updated successfully!",
            task: updatedTask
        });
    } catch (error) {
        res.status(500).json({ message: "Error updating task", error: error.message });
    }
};

exports.removeTask = async (req, res) => {
    try {
        const { taskId } = req.body;
        const deletedTask = await Task.findByIdAndDelete(taskId);

        if (!deletedTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.status(200).json({ message: "Task removed successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Error removing task", error: error.message });
    }
};

const getPriorityColor = (level) => {
    switch (level) {
        case 'urgent':
        case 'high':
            return '#EF4444'; // Red
        case 'medium':
            return '#F59E0B'; // Orange
        case 'low':
            return '#10B981'; // Green
        default:
            return '#6B7280'; // Gray
    }
};

exports.addHabit = async (req, res) => {
    try {
        const { name, description, frequency, category, targetCount, priority } = req.body;

        const newHabit = new Habit({
            userId: req.user._id,
            name,
            description,
            frequency,
            category,
            targetCount,
            priority,
        });

        const savedHabit = await newHabit.save();

        res.status(201).json({
            message: "Habit added successfully!",
            habit: savedHabit
        });
    } catch (error) {
        res.status(500).json({ message: "Error adding habit", error: error.message });
    }
};

exports.removeHabit = async (req, res) => {
    try {
        const { habitId } = req.body;
        const deletedHabit = await Habit.findOneAndDelete({ _id: habitId, userId: req.user._id });

        if (!deletedHabit) {
            return res.status(404).json({ message: "Habit not found or user not authorized" });
        }

        res.status(200).json({ message: "Habit removed successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Error removing habit", error: error.message });
    }
};

exports.updateHabit = async (req, res) => {
    try {
        const { _id, name, description, frequency, category, targetCount, priority } = req.body;

        const updatedHabit = await Habit.findOneAndUpdate(
            { _id: _id, userId: req.user._id },
            { name, description, frequency, category, targetCount, priority },
            { new: true }
        );

        if (!updatedHabit) {
            return res.status(404).json({ message: "Habit not found or user not authorized" });
        }

        res.status(200).json({
            message: "Habit updated successfully!",
            habit: updatedHabit
        });
    } catch (error) {
        res.status(500).json({ message: "Error updating habit", error: error.message });
    }
};

exports.progressHabit = async (req, res) => {
    try {
        const { habitId } = req.body;
        const habit = await Habit.findOne({ _id: habitId, userId: req.user._id });

        if (!habit) {
            return res.status(404).json({ message: "Habit not found or user not authorized" });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastCompleted = habit.lastCompleted ? new Date(habit.lastCompleted) : null;
        if (lastCompleted) lastCompleted.setHours(0, 0, 0, 0);

        // if not completed today, progress it
        if (!lastCompleted || lastCompleted.getTime() !== today.getTime()) {
            habit.completions.push({ date: new Date() });
            habit.lastCompleted = new Date();

            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);

            if (lastCompleted && lastCompleted.getTime() === yesterday.getTime()) {
                habit.currentStreak += 1;
            } else {
                habit.currentStreak = 1;
            }

            if (habit.currentStreak > habit.longestStreak) {
                habit.longestStreak = habit.currentStreak;
            }
        }

        const updatedHabit = await habit.save();

        res.status(200).json({
            message: "Habit progress updated successfully!",
            habit: updatedHabit
        });

    } catch (error) {
        res.status(500).json({ message: "Error progressing habit", error: error.message });
    }
};

exports.getHabits = async (req, res) => {
    try {
        const habits = await Habit.find({ userId: req.user._id });
        res.status(200).json({
            message: "habits fetched successfully!",
            habits: habits.map(habit => ({
                habitId: habit._id,
                name: habit.name,
                description: habit.description,
                frequency: habit.frequency,
                category: habit.category,
                targetCount: habit.targetCount,
                priority: habit.priority,
                streak: habit.currentStreak,
                progress: 0, // Placeholder
                completed: false, // Placeholder
                lastCompleted: habit.lastCompleted,
                startDate: habit.createdAt
            }))
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching habits", error: error.message });
    }
};