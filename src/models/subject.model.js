const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    color: { type: String, default: '#8884d8' },
    lectures: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lecture' }]
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

subjectSchema.virtual('lecturesList', {
    ref: 'Lecture',
    localField: '_id',
    foreignField: 'subject',
});

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject; 