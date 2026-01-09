const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const qaSessionSchema = new mongoose.Schema({
    messages: [messageSchema],
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
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
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

const QASession = mongoose.model('QASession', qaSessionSchema);

module.exports = QASession; 