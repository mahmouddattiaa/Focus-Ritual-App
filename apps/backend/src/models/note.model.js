const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        default: '' // Store minimal or no content in MongoDB
    },
    contentStoredInCloud: {
        type: Boolean,
        default: true
    },
    cloudPath: {
        type: String
    },
    tags: {
        type: [String],
        default: []
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lectureId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lecture',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema); 