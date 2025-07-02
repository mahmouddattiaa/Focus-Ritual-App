const Message = require('../models/messages.model');
const express = require('express');
const passport = require('passport');
const router = express.Router();
const mongoose = require('mongoose');

// Get unread message counts for the logged-in user
router.get('/unread-count', passport.authenticate('jwt', { session: false }), async (req, res) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const userId = req.user._id;
        const unreadCounts = await Message.aggregate([
            { $match: { recipient: new mongoose.Types.ObjectId(userId), read: false } },
            { $group: { _id: '$sender', count: { $sum: 1 } } }
        ]);

        const countsMap = unreadCounts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        res.status(200).json(countsMap);
    } catch (err) {
        console.error('Could not get unread message counts:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get messages between the logged-in user and another user
router.get('/:friendId', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: 'unauthorized'
            });

        }
        const userId = req.user._id;
        const friendId = req.params.friendId;
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 50;
        const skip = page * limit;
        const messages = await Message.find({

            $or: [
                { sender: userId, recipient: friendId },
                { sender: friendId, recipient: userId }
            ]
        })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender', 'firstName profilePicture');
        return res.status(200).json(messages.reverse());
    } catch (err) {
        console.log('couldnt get messages to :', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }
})

// Mark messages as read
router.post('/read', passport.authenticate('jwt', { session: false }), async (req, res) => {
    // ... existing code ...
});

module.exports = router;