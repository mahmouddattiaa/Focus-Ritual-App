const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId : {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    description:{
        type: mongoose.Schema.Types.Mixed
    },
    timestamp:{
        type: Date,
        default: Date.now
    },
    isRead:{
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('notification', notificationSchema);