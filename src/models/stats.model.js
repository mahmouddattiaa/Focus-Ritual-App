const mongoose = require('mongoose');

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
    tasks:{
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
                required: true
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
default:[]
},
habits: {
    type:[
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
category:{
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
priority:{
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
completed :
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
    }


},
    {
        timestamps: true
    }
);


StatsSchema.pre('save', async function(next) {
    if (this.isModified('habits')) {
        const allHabitsCompleted = this.habits.length > 0 && 
                                  this.habits.every(habit => habit.completed);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const lastActiveDate = this.lastActiveDate ? new Date(this.lastActiveDate) : null;
        if (lastActiveDate) lastActiveDate.setHours(0, 0, 0, 0);
        
       
        if (!lastActiveDate || (lastActiveDate.getTime() !== today.getTime() && today.getTime() - lastActiveDate > 24*60*60*1000)) {
           
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (allHabitsCompleted) {
               
                if (!lastActiveDate || lastActiveDate.getTime() === yesterday.getTime()) {
                    this.habitStreak += 1;
                } else {
                   
                    this.habitStreak = 1;
                }
                this.lastActiveDate = today;
            } else {
               
                this.habitStreak = 0;
            }
        }
    }
    
    next();
});
module.exports = mongoose.model('Stats', StatsSchema); 