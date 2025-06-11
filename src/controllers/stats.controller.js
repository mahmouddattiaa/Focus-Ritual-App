const Stats = require('../models/stats.model.js');

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