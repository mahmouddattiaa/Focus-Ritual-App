const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Focus',
            'Streak',
            'Task',
            'Level',
            'Community',
            'Special',
            'Badge']
    },
    xp: {
        type: Number,
        required: true
    },
    criteria: {
       type: mongoose.Schema.Types.Mixed,
        required: true,
    }
    
});


module.exports = mongoose.model('Achievement', AchievementSchema); 

