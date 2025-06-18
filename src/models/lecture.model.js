const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    fileId: {
        type: String,
    },
    contentId: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Lecture = mongoose.model('Lecture', lectureSchema);

module.exports = Lecture; 