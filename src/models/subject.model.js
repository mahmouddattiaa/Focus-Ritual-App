const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

subjectSchema.virtual('lectures', {
    ref: 'Lecture',
    localField: '_id',
    foreignField: 'subject',
});

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject; 