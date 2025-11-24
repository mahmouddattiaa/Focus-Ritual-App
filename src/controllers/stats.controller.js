const { Stats } = require('../models/stats.model.js');
const mongoose = require('mongoose');
const User = require('../models/user.model.js');
const Notification = require('../models/notification.model');

const ensureProductivityByHour = async (userId) => {
    try {
        const stats = await Stats.findOne({ userId });
        if (!stats) return null;

        // Check if productivityByHour exists and has the right structure
        if (!stats.productivityByHour || !Array.isArray(stats.productivityByHour) || stats.productivityByHour.length !== 24) {
            console.log(`Initializing productivityByHour for user ${userId}`);

            // Create the default 24-hour array
            const defaultProductivityByHour = Array.from({ length: 24 }, (_, i) => ({
                hour: i,
                tasksCompleted: 0,
                focusTime: 0,
                productivityScore: 0
            }));

            // Update the user's stats with the default array
            await Stats.findOneAndUpdate(
                { userId },
                { $set: { productivityByHour: defaultProductivityByHour } },
                { new: true }
            );

            return defaultProductivityByHour;
        }

        return stats.productivityByHour;
    } catch (err) {
        console.error(`Error ensuring productivityByHour for user ${userId}:`, err);
        return null;
    }
};

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
        const currentHour = today.getHours();
        const { time, distractions } = req.body;
        if (typeof time !== 'number' || isNaN(time) || time < 0) {
            return res.status(400).json({
                message: 'Invalid Input'
            });
        }

        // First get current stats to update hour-based productivity
        const currentStats = await Stats.findOne({ userId });

        // Prepare the update operation
        const updateOperation = {
            $inc: {
                focusTime: time,
                [`dailyActivity.${dateKey}.focusTime`]: time,
                totalDistractions: distractions,
                [`productivityByHour.${currentHour}.focusTime`]: time
            }
        };

        // Calculate productivity score for this hour
        if (currentStats && currentStats.productivityByHour && currentStats.productivityByHour[currentHour]) {
            const hourData = currentStats.productivityByHour[currentHour];
            // Simple productivity score calculation for this hour
            const hourScore = Math.min(100, Math.round((time / 60) * 80 + (hourData.tasksCompleted * 20)));
            updateOperation.$set = {
                [`productivityByHour.${currentHour}.productivityScore`]: hourScore
            };
        }

        const updatedStats = await Stats.findOneAndUpdate(
            { userId },
            updateOperation,
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
        const { taskId } = req.body;
        const today = new Date();
        const dateKey = today.toISOString().split('T')[0];
        const currentHour = today.getHours();
        const taskObjectId = new mongoose.Types.ObjectId(taskId);
        const stats = await Stats.findOne({ userId });

        if (!stats) {
            return res.status(404).json({ message: 'User stats not found' });
        }

        const task = stats.tasks.find(t => t._id.toString() === taskId.toString());
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        if (task.completed === true) {
            return res.status(400).json({
                message: 'task already completed'
            });
        }

        // Prepare update operation with productivityByHour increments
        const updateOperation = {

            $inc: {
                'tasksCompleted.totalCompleted': 1,
                [`dailyActivity.${dateKey}.tasksCompleted`]: 1,
                [`productivityByHour.${currentHour}.tasksCompleted`]: 1

            },
            $set: {
                'tasks.$.completed': true
            }
        };

        // If we have hour data, also update productivity score
        if (stats.productivityByHour && stats.productivityByHour[currentHour]) {
            const hourData = stats.productivityByHour[currentHour];
            // Task completion boosts productivity score
            const hourScore = Math.min(100, Math.round((hourData.focusTime / 60) * 80 + ((hourData.tasksCompleted + 1) * 20)));
            updateOperation.$set[`productivityByHour.${currentHour}.productivityScore`] = hourScore;
        }

        const updatedStats = await Stats.findOneAndUpdate(
            { userId, 'tasks._id': taskObjectId },
            updateOperation,
            {
                new: true,
                upsert: true
            }
        );
        console.log('taskId:', taskId, 'typeof:', typeof taskId);
        console.log('taskObjectId:', taskObjectId, 'typeof:', typeof taskObjectId);
        if (updatedStats) {
            console.log('Updated stats:', updatedStats);
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
                    dailyCompletedTasks: updatedStats.dailyActivity.get(dateKey)?.tasksCompleted || 0,
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

        // Ensure productivityByHour is properly initialized
        const productivityByHour = await ensureProductivityByHour(userId);

        return res.status(200).json({
            message: 'Stats fetched successfully!',
            stats: {
                focusSessions: stats.focusSessions,
                focusTime: stats.focusTime,
                tasksCompleted: stats.tasksCompleted,
                habitStreak: stats.habitStreak,
                productivityScore: stats.productivityScore,
                level: stats.level,
                xp: stats.xp,
                lastActiveDate: stats.lastActiveDate,
                dailyActivity: Object.fromEntries(stats.dailyActivity),
                productivityByHour: productivityByHour || stats.productivityByHour
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

exports.DecTasks = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user._id;
        const { taskId } = req.body;
        const stats = await Stats.findOne({ userId });

        if (!stats) {
            return res.status(404).json({ message: 'User stats not found' });
        }

        const taskObjectId = new mongoose.Types.ObjectId(taskId);
        const today = new Date();
        const dateKey = today.toISOString().split('T')[0];

        const task = stats.tasks.find(t => t._id.toString() === taskId.toString());
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        if (task.completed === false) {
            return res.status(400).json({
                message: 'task not completed'
            });
        }

        const updatedaily = {};
        if (stats.dailyActivity.get(dateKey)?.tasksCompleted > 0) {
            updatedaily[`dailyActivity.${dateKey}.tasksCompleted`] = -1;
        }

        const updatedStats = await Stats.findOneAndUpdate(
            { userId, 'tasks._id': taskObjectId },
            {
                $inc: {
                    'tasksCompleted.totalCompleted': -1,
                    ...updatedaily
                },
                $set: {
                    'tasks.$.completed': false
                }

            },
            { new: true, upsert: true }
        );
        console.log('taskId:', taskId, 'typeof:', typeof taskId);
        console.log('taskObjectId:', taskObjectId, 'typeof:', typeof taskObjectId);
        if (!updatedStats) {
            return res.status(400).json({
                message: 'Couldnt update stats'
            });
        } else {
            console.log('Updated stats:', updatedStats);
            return res.status(200).json({
                message: 'Compeleted tasks decremented successfully',
                completedTasks: updatedStats.tasksCompleted.totalCompleted,
                dailyCompletedTasks: updatedStats.dailyActivity.get(dateKey)?.tasksCompleted
            });
        }

    } catch (err) {
        console.log('failed to decrement tasks', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }

};

exports.addTask = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(400).json({
                message: 'not authorized'
            });
        }
        const userId = req.user._id;
        const { taskTitle, taskDescription, priority, category, estimatedTime, dueDate, tags, subTasks } = req.body;
        const stats = await Stats.findOne({ userId });
        stats.tasks.push({
            taskTitle,
            taskDescription,
            priority,
            category,
            estimatedTime,
            dueDate: new Date(dueDate),
            tags: tags || [],
            subTasks: subTasks || []
        });
        stats.tasksCompleted.totalTasks++;
        await stats.save();
        const newTask = stats.tasks[stats.tasks.length - 1];
        if (newTask) {
            return res.status(200).json({
                message: 'task added successfully!',
                id: newTask._id,
                title: newTask.taskTitle,
                description: newTask.taskDescription,
                priority: newTask.priority,
                category: newTask.category,
                estimatedTime: newTask.estimatedTime,
                dueDate: newTask.dueDate,
                tags: newTask.tags,
                subTasks: newTask.subTasks
            }
            );
        } else {
            return res.status(400).json({
                message: 'failed to add task'
            });
        }
    } catch (err) {
        console.log('failed to add task', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }



};

exports.removeTask = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(400).json({
                message: 'not authorized'
            });
        }
        const userId = req.user._id;
        const { taskId, deleteTask } = req.body;
        if (taskId == undefined) {
            return res.status(400).json({
                message: 'taskId is required'
            });
        }
        const stats = await Stats.findOne({ userId });
        if (!stats) {
            return res.status(404).json({
                message: 'Stats not found'
            });
        }
        const taskExists = stats.tasks.id(taskId);
        if (!taskExists) {
            return res.status(404).json({
                message: 'Task not found'
            });
        }
        if (typeof deleteTask !== 'boolean') {
            return res.status(400).json({
                message: 'deleteTask must be a boolean'
            });
        }
        if (deleteTask == true && stats.tasksCompleted.totalTasks > 0) {
            stats.tasksCompleted.totalTasks--;
        }

        // Remove the task
        stats.tasks.pull({ _id: taskId });

        // Save with validation disabled to avoid issues with existing data
        await stats.save({ validateBeforeSave: false });

        return res.status(200).json({
            message: 'task removed successfully!',
            tasks: stats.tasks
        });
    } catch (err) {
        console.log('failed to remove task', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }
};

exports.updateTask = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(400).json({
                message: 'not authorized'
            });
        }
        const userId = req.user._id;
        const updateFields = {};
        const { taskId, taskTitle, taskDescription, priority, category, estimatedTime, dueDate, tags, subTasks } = req.body;
        const stats = await Stats.findOne({ userId });
        const taskExists = stats.tasks.id(taskId);
        if (!taskExists) {
            return res.status(404).json({
                message: 'Task not found'
            });
        }
        if (taskTitle !== undefined) updateFields['tasks.$.taskTitle'] = taskTitle;
        if (taskDescription !== undefined) updateFields['tasks.$.taskDescription'] = taskDescription;
        if (priority !== undefined) updateFields['tasks.$.priority'] = priority;
        if (category !== undefined) updateFields['tasks.$.category'] = category;
        if (estimatedTime !== undefined) updateFields['tasks.$.estimatedTime'] = estimatedTime;
        if (dueDate !== undefined) updateFields['tasks.$.dueDate'] = new Date(dueDate);
        if (tags !== undefined) updateFields['tasks.$.tags'] = tags;
        if (subTasks !== undefined) updateFields['tasks.$.subTasks'] = subTasks;

        const updatedStats = await Stats.findOneAndUpdate(
            { userId, 'tasks._id': taskId },
            { $set: updateFields },
            { new: true }
        );
        if (!updatedStats) {
            return res.status(400).json({
                message: 'failed to update task'
            });
        }
        return res.status(200).json({
            message: 'task updated successfully!',
            taskId: updatedStats.tasks.find(task => task._id.toString() === taskId)._id,
            task: updatedStats.tasks.find(task => task._id.toString() === taskId)
        });
    } catch (err) {
        console.log('failed to update task', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }
};

exports.getTasks = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(400).json({
                message: 'not authorized'
            });
        }
        const userId = req.user._id;
        const stats = await Stats.findOne({ userId });
        const tasks = stats.tasks.map(task => ({
            taskId: task._id,
            taskTitle: task.taskTitle,
            taskDescription: task.taskDescription,
            priority: task.priority,
            category: task.category,
            estimatedTime: task.estimatedTime,
            dueDate: task.dueDate,
            tags: task.tags,
            subTasks: task.subTasks,
            completed: task.completed
        }));
        if (tasks.length === 0) {
            return res.status(404).json({
                message: 'no tasks found'
            });
        }
        return res.status(200).json({
            message: 'tasks fetched successfully!',
            tasks: tasks
        });
    } catch (err) {
        console.log('failed to fetch tasks', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }
};


exports.addHabit = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(400).json({
                message: 'not authorized'
            });
        }
        const userId = req.user._id;
        const { name, description, frequency, category, targetCount, priority } = req.body;
        const stats = await Stats.findOne({ userId });

        stats.habits.push({
            name,
            description,
            frequency,
            category,
            targetCount,
            priority
        });
        await stats.save();
        return res.status(200).json({
            message: 'Habit added successfully!',
            habitId: stats.habits[stats.habits.length - 1]._id,
            habit: stats.habits[stats.habits.length - 1]
        });
    } catch (err) {
        console.log('failed to add habit', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }
};

exports.removeHabit = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(400).json({
                message: 'not authorized'
            });
        }
        const userId = req.user._id;
        const { habitId } = req.body;
        const stats = await Stats.findOne({ userId });
        const habitExists = stats.habits.id(habitId);
        if (!habitExists) {
            return res.status(404).json({
                message: 'Habit not found'
            });
        }
        stats.habits.pull({ _id: habitId });
        await stats.save();
        return res.status(200).json({
            message: 'Habit removed successfully!',
            habits: stats.habits
        });
    } catch (err) {
        console.log('failed to remove habit', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }
};

exports.updateHabit = async (req, res) => {

    try {
        if (!req.user) {
            return res.status(400).json({
                message: 'not authorized'
            });
        }
        const userId = req.user._id;
        const updateFields = {};
        const { habitId, name, description, frequency, category, targetCount, priority } = req.body;
        if (name !== undefined) updateFields['habits.$.name'] = name;
        if (description !== undefined) updateFields['habits.$.description'] = description;
        if (frequency !== undefined) updateFields['habits.$.frequency'] = frequency;
        if (category !== undefined) updateFields['habits.$.category'] = category;
        if (targetCount !== undefined) updateFields['habits.$.targetCount'] = targetCount;
        if (priority !== undefined) updateFields['habits.$.priority'] = priority;
        const stats = await Stats.findOne({ userId });
        const habitExists = stats.habits.id(habitId);
        if (!habitExists) {
            return res.status(404).json({
                message: 'habit doesnt exist'
            });
        }
        const updatedStats = await Stats.findOneAndUpdate(
            { userId, 'habits._id': habitId },
            {
                $set: updateFields
            },
            {
                new: true
            }
        );

        if (!updatedStats) {
            return res.status(404).json({
                message: 'failed to update habits'
            });
        }
        return res.status(200).json({
            message: 'Habit updated successfully!',
            habit: updatedStats.habits.find(habit => habit._id.toString() === habitId)
        });

    } catch (err) {
        console.log('failed to update habit', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });

    }
};

exports.progressHabit = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: 'not authorized'
            });
        }
        const userId = req.user._id;
        const { habitId } = req.body;
        const stats = await Stats.findOne({ userId });

        if (!stats) {
            return res.status(404).json({
                message: 'Stats not found'
            });
        }

        const habitExists = stats.habits.id(habitId);
        if (!habitExists) {
            return res.status(404).json({
                message: 'Habit not found'
            });
        }


        if (habitExists.progress === habitExists.targetCount) {
            return res.status(400).json({
                message: 'Habit already completed'
            });
        }

        const willComplete = habitExists.progress === habitExists.targetCount - 1;


        habitExists.progress += 1;

        if (willComplete) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const lastCompleted = habitExists.lastCompleted ? new Date(habitExists.lastCompleted) : null;
            const resetDate = habitExists.resetDate ? new Date(habitExists.resetDate) : null;

            if (lastCompleted) lastCompleted.setHours(0, 0, 0, 0);
            if (resetDate) resetDate.setHours(0, 0, 0, 0);

            let newStreak = habitExists.streak;

            if ((!resetDate || today >= resetDate) &&
                (!lastCompleted || lastCompleted.getTime() !== today.getTime())) {
                newStreak += 1;
            }

            // Set completion properties directly on the document
            habitExists.completed = true;
            habitExists.lastCompleted = today;
            habitExists.streak = newStreak;
        }

        // Save the document - this will trigger the pre-save hook
        stats.markModified('habits');
        await stats.save();

        return res.status(200).json({
            message: 'Habit progress updated successfully!',
            habit: stats.habits.id(habitId)
        });
    } catch (err) {
        console.log('failed to progress habit', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }
};

exports.getHabits = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: 'not authorized'
            });
        }
        const userId = req.user._id;
        const stats = await Stats.findOne({ userId });

        if (!stats) {
            return res.status(404).json({
                message: 'Stats not found'
            });
        }

        const habits = stats.habits.map(habit => ({
            habitId: habit._id,
            name: habit.name,
            description: habit.description,
            frequency: habit.frequency,
            category: habit.category,
            targetCount: habit.targetCount,
            priority: habit.priority,
            streak: habit.streak,
            progress: habit.progress,
            completed: habit.completed,
            lastCompleted: habit.lastCompleted,
            startDate: habit.startDate,
            resetDate: habit.resetDate
        }));

        if (habits.length === 0) {
            return res.status(404).json({
                message: 'no habits found'
            });
        }

        return res.status(200).json({
            message: 'habits fetched successfully!',
            habits: habits
        });
    } catch (err) {
        console.log('failed to fetch habits', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }
};

exports.getAchievements = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: 'not authorized'
            });
        }
        const userId = req.user._id;
        const stats = await Stats.findOne({ userId }).populate('achievements.achievementId');
        if (!stats) {
            return res.status(404).json({ message: 'Stats not found for this user.' });
        }
        return res.status(200).json({
            message: 'achievements fetched successfully!',
            stats: {
                achievements: stats.achievements
            }
        });
    } catch (err) {
        console.log('Failed to fetch achievements due to: ', err);
        return res.status(500).json({
            message: 'Server error',
            error: err.message
        });
    }

};

exports.getLeaderboard = async (req, res) => {
    try {

        const topUsers = await Stats.find({})
            .sort({ pts: -1 })
            .limit(100)
            .populate('userId', 'firstName lastName');


        const leaderboard = topUsers.map(stat => ({
            userId: stat.userId._id,
            firstName: stat.userId.firstName,
            lastName: stat.userId.lastName,
            pts: stat.pts
        }));

        return res.status(200).json({
            message: 'Top 100 users by points',
            leaderboard
        });
    } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        return res.status(500).json({
            message: 'Server error',
            error: err.message
        });
    }
};


exports.getNotifications = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }


        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ timestamp: -1 });

        return res.status(200).json({
            message: 'Notifications fetched successfully',
            notifications
        });
    } catch (err) {
        console.error('Failed to fetch notifications:', err);
        return res.status(500).json({
            message: 'Server error',
            error: err.message
        });
    }
};


