const mongoose = require('mongoose');
const EventEmitter = require('events');
const achievementEmitter = new EventEmitter();
const Achievement = require('../models/achievement.model');
console.log('Achievement emitter created:', achievementEmitter);
const levelThresholds = [
    0,      // Level 1
    100,    // Level 2
    250,    // Level 3
    500,    // Level 4
    1000,   // Level 5 (Rising Star)
    2000,   // Level 6
    3500,   // Level 7
    5000,   // Level 8
    7500,   // Level 9
    10000,  // Level 10 (Level Up)
    12500,  // Level 11
    15000,  // Level 12
    17500,  // Level 13
    20000,  // Level 14
    22500,  // Level 15 (High Achiever)
    25000,  // Level 16
    27500,  // Level 17
    30000,  // Level 18
    32500,  // Level 19
    35000   // Level 20 (Level Pro)
];
const StatsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    focusSessions: {
        type: Number,
        default: 0
    },
    focusTime: {
        type: Number,
        default: 0
    },
    tasksCompleted: {
        totalTasks: {
            type: Number,
            default: 0
        },
        totalCompleted: {
            type: Number,
            default: 0
        }
    },
    tasks: {
        type: [
            {
                taskTitle: {
                    type: String,
                    required: true

                },
                taskDescription: {
                    type: String,
                    required: true
                },
                priority: {
                    type: String,
                    enum: ['Low', 'Medium', 'High', 'Urgent'],
                    required: true
                },
                category: {
                    type: String,
                    required: true
                },
                estimatedTime: {
                    type: Number,
                    required: true
                },
                dueDate:
                {
                    type: Date,
                },
                tags: {
                    type: [
                        {
                            type: String

                        }
                    ],
                    default: []
                },
                subTasks: {
                    type: [
                        {
                            type: String
                        }
                    ],
                    default: []


                }

            }
        ],
        default: []
    },
    habits: {
        type: [
            {
                name: {
                    type: String,
                    required: true
                },
                description: {
                    type: String,
                    required: true
                },
                frequency: {
                    type: String,
                    enum: ['Daily', 'Weekly', 'Monthly'],
                    required: true
                },
                category: {
                    type: String,
                    enum: ['Wellness', 'Learning', 'Fitness', 'Productivity', 'Mindfulness'],
                    required: true
                },
                targetCount: {
                    type: Number,
                    required: true
                },
                startDate: {
                    type: Date,
                    required: true,
                    default: new Date()
                },
                resetDate: {
                    type: Date,
                    default: null
                },
                priority: {
                    type: String,
                    enum: ['Low', 'Medium', 'High'],
                    required: true
                },
                streak: {
                    type: Number,
                    default: 0
                },
                lastCompleted: {
                    type: Date,
                    default: null
                },
                progress: {
                    type: Number,
                    default: 0
                },
                completed:
                {
                    type: Boolean,
                    default: false
                }
            }
        ],
        default: []
    },
    habitStreak: {
        type: Number,
        default: 0
    },
    productivityScore: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 1
    },
    xp: {
        type: Number,
        default: 0
    },
    totalDistractions: {
        type: Number,
        default: 0
    },
    lastActiveDate: {
        type: Date,
        default: null
    },
    dailyActivity: {
        type: Map,
        of: {
            focusSessions: {
                type: Number,
                default: 0
            },
            focusTime: {
                type: Number,
                default: 0
            },
            tasksCompleted: {
                type: Number,
                default: 0
            }
        },
        default: new Map()
    },
    achievements: {
        type: [{
            achievementId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Achievement",
                required: true,
                index: true

            },
            dateUnlocked: {
                type: Date,
                default: null
            }

        }
        ],
        default: []
    },
    productivityByHour: {
        type: [{
            hour: {
                type: Number,
                required: true
            },
            tasksCompleted: {
                type: Number,
                default: 0
            },
            focusTime: {
                type: Number,
                default: 0
            },
            productivityScore: {
                type: Number,
                default: 0
            }
        }],
        default: Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            tasksCompleted: 0,
            focusTime: 0,
            productivityScore: 0
        }))
    }
},
    {
        timestamps: true
    }
);


StatsSchema.pre('save', async function (next) {
    // Logic for Habit Streak Calculation
    if (this.isModified('habits')) {
        const allHabitsCompleted = this.habits.length > 0 && this.habits.every(h => h.completed);

        if (allHabitsCompleted) {

            // --- NEW, MORE ROBUST DATE CREATION ---
            const now = new Date();
            // This creates a new date object representing the start of the current day in UTC, avoiding any mutation issues.
            const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            // --- END OF NEW LOGIC ---

            const lastActiveUTC = this.lastActiveDate ? new Date(this.lastActiveDate) : null;
            if (lastActiveUTC) {
                lastActiveUTC.setUTCHours(0, 0, 0, 0);
            }

            const yesterdayUTC = new Date(todayUTC);
            yesterdayUTC.setUTCDate(todayUTC.getUTCDate() - 1);

            console.log(`Checking dates -> Today: ${todayUTC.toISOString()}, Yesterday: ${yesterdayUTC.toISOString()}, Last Active: ${lastActiveUTC ? lastActiveUTC.toISOString() : 'null'}`);

            if (lastActiveUTC && lastActiveUTC.getTime() === yesterdayUTC.getTime()) {
                this.habitStreak += 1;
                console.log(`✅✅✅ SUCCESS: Habit streak INCREMENTED to: ${this.habitStreak}`);
            } else if (!lastActiveUTC || lastActiveUTC.getTime() < yesterdayUTC.getTime()) {
                this.habitStreak = 1;
                console.log(`⚠️  INFO: Habit streak STARTED or RESET to: ${this.habitStreak}`);
            } else {
                console.log(`🔴 SKIPPED: Streak already processed for today.`);
            }

            // This line will now save the CORRECT date.
            this.lastActiveDate = todayUTC;
        }
    }
    this._modifiedPaths = {};

    // For each path you care about, check if it was modified and flag it
    if (this.isModified('focusSessions')) {
        this._modifiedPaths.focusSessions = true;
    }
    if (this.isModified('focusTime')) {
        this._modifiedPaths.focusTime = true;
    }
    if (this.isModified('habits')) {
        this._modifiedPaths.habits = true;
    }
    if (this.isModified('tasksCompleted.totalCompleted')) {
        this._modifiedPaths.tasksCompleted = true; // Flag the parent path
    }
    if (this.isModified('level')) {
        this._modifiedPaths.level = true;
    }
    if (this.isModified('habitStreak')) {
        this._modifiedPaths.habitStreak = true;
    }
    next();
    // Logic for Achievement Event Emissions (for 'save' operations)
    // Access new values directly from 'this'
});
StatsSchema.post('findOneAndUpdate', async function () {
    const update = this.getUpdate();
    const userId = this.getQuery().userId;
    const updatedStats = await this.model.findOne(this.getQuery());
    console.log('Im here');
    if (update.$inc && update.$inc.focusSessions) {
        achievementEmitter.emit('focus:session:completed', {
            userId,
            sessionCount: updatedStats.focusSessions
        });
        console.log('focus sessions incremented');

        const currentHour = new Date().getHours();
        if (currentHour >= 0 && currentHour < 4) {
            achievementEmitter.emit('focus:session:special', {
                userId,
                type: 'night_owl'
            });
        }
    }

    // Focus Time Events
    if (update.$inc && update.$inc.focusTime) {
        achievementEmitter.emit('focus:time:added', {
            userId,
            timeAdded: updatedStats.focusTime
        });

        // Check for Deep Work achievement
        if (update.$inc.focusTime >= 180) {
            achievementEmitter.emit('special:deep:work', {
                userId,
                duration: updatedStats.focusTime
            });
        }

        // Check for Weekend Warrior
        const day = new Date().getDay();
        if (day === 0 || day === 6) {
            achievementEmitter.emit('focus:time:weekend', {
                userId,
                timeAdded: updatedStats.focusTime,
                isWeekend: true
            });
        }
    }

    // Habit Streak Events
    if (update.$set && update.$set.habits) {
        achievementEmitter.emit('habit:streak:updated', {
            userId,
            habits: updatedStats.habits
        });
    }

    // Task Completion Events
    if (update.$inc && update.$inc['tasksCompleted.totalCompleted']) {
        achievementEmitter.emit('task:completed', {
            userId,
            completedCount: updatedStats.tasksCompleted.totalCompleted
        });
    }

    // Level Events
    if (update.$set && update.$set.level) {
        achievementEmitter.emit('level:up', {
            userId,
            newLevel: updatedStats.level
        });
    }
    // Perfect Week Achievement
    if (update.$set && update.$set.habitStreak) {
        console.log('hopefully I get here');
        achievementEmitter.emit('habit:perfect:week', {
            userId,
            habitstreak: updatedStats.habitStreak
        });
    }
}
);

StatsSchema.post('save', async function (doc) { // It's good practice to use 'doc' here
    const userId = doc.userId;
    console.log('post-save hook executed'); // Debugging log

    // Check if the temporary object exists and has the required flags
    const modified = doc._modifiedPaths || {};

    if (modified.focusSessions) {
        achievementEmitter.emit('focus:session:completed', {
            userId,
            sessionCount: doc.focusSessions
        });

        const currentHour = new Date().getHours();
        if (currentHour >= 0 && currentHour < 4) {
            achievementEmitter.emit('focus:session:special', {
                userId,
                type: 'night_owl'
            });
        }
    }

    if (modified.focusTime) {
        achievementEmitter.emit('focus:time:added', {
            userId,
            timeAdded: doc.focusTime
        });

        if (doc.focusTime >= 180) {
            achievementEmitter.emit('special:deep:work', {
                userId,
                duration: doc.focusTime
            });
        }

        const day = new Date().getDay();
        if (day === 0 || day === 6) {
            achievementEmitter.emit('focus:time:weekend', {
                userId,
                timeAdded: doc.focusTime,
                isWeekend: true
            });
        }
    }

    if (modified.habits) {
        console.log('I am heremmmmmm');
        achievementEmitter.emit('habit:streak:updated', {
            userId,
            habits: doc.habits
        });
    }

    if (modified.tasksCompleted) {
        achievementEmitter.emit('task:completed', {
            userId,
            completedCount: doc.tasksCompleted.totalCompleted
        });
    }

    if (modified.level) {
        achievementEmitter.emit('level:up', {
            userId,
            newLevel: doc.level
        });
    }

    if (modified.habitStreak) {
        achievementEmitter.emit('habit:perfect:week', {
            userId,
            habitstreak: doc.habitStreak
        });
    }
});

const Stats = mongoose.model('Stats', StatsSchema);

module.exports = {
    Stats,
    achievementEmitter,
    levelThresholds
};