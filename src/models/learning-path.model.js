const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['not-started', 'in-progress', 'completed'],
        default: 'not-started'
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    resources: [{
        type: String
    }]
});

const learningPathSchema = new mongoose.Schema({
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    strengths: [{
        type: String
    }],
    areasToImprove: [{
        type: String
    }],
    topics: [topicSchema],
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lectureId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lecture',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const LearningPath = mongoose.model('LearningPath', learningPathSchema);

module.exports = LearningPath; 