const mongoose = require('mongoose');

const StatsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
      },
focusSessions:{
    type:Number,
    default: 0
},
focusTime: {
    type:Number,
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
lastActiveDate: {
    type: Date,
    default: null
},
dailyActivity: {
    type: Map,
    of: {
        focusSessions:{
            type:Number,
            default: 0
        },
        focusTime: {
            type:Number,
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


module.exports = mongoose.model('Stats', StatsSchema); 