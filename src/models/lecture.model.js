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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UploadedFile',
    },
    fileIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UploadedFile',
    }],
    contentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LectureContent',
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    },
    toObject: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    }
});

const Lecture = mongoose.model('Lecture', lectureSchema);

module.exports = Lecture; 