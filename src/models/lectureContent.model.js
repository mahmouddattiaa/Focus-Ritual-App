const mongoose = require('mongoose');

const lectureContentSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    file_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UploadedFile' },
    lecture_id: { type: String, required: true },
    subject_id: { type: String, required: true },
    title: { type: String, required: true },
    summary: { type: mongoose.Schema.Types.Mixed }, // Can be string or array of bullet points
    flashcards: [{ question: String, answer: String }],
    examQuestions: [{ question: String, answer: String }], // Updated to include answers
    revision: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

const LectureContent = mongoose.model('LectureContent', lectureContentSchema);

module.exports = LectureContent; 