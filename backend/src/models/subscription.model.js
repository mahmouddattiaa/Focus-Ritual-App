const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId:{
        type : mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    startDate:{
        type: Date,
        required: true,
        default: Date.now
    },
    subscriptionLength:{
        type: Number,
        required: true
    }
});
module.exports = mongoose.model('Subscription', subscriptionSchema);