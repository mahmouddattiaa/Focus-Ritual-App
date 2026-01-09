const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FlashcardSchema = new Schema({
    front: {
        type: String,
        default: '' // Store minimal or no content in MongoDB
    },
    back: {
        type: String,
        default: '' // Store minimal or no content in MongoDB
    },
    contentStoredInCloud: {
        type: Boolean,
        default: true
    },
    cloudPath: {
        type: String,
        required: false
    },
    lectureId: {
        type: Schema.Types.ObjectId,
        ref: 'Lecture',
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tags: [String],
    difficulty: {
        type: Number,
        default: 2.5, // Default medium difficulty on a scale of 1-5
        min: 1,
        max: 5
    },
    nextReview: {
        type: Date,
        default: Date.now
    },
    interval: {
        type: Number,
        default: 1 // Days until next review
    },
    repetitions: {
        type: Number,
        default: 0
    },
    easeFactor: {
        type: Number,
        default: 2.5 // SM-2 algorithm default ease factor
    },
    lastReviewed: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('Flashcard', FlashcardSchema); 