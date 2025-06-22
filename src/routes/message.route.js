const Message = require('../models/messages.model');
const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/:friendId', passport.authenticate('jwt', {session: false}), async (req, res)=>{
    try{
        if (!req.user) {
            return res.status(401).json({
                message: 'unauthorized'
            });
           
        }
        const userId = req.user._id;
        const friendId= req.params.friendId;
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 50;
        const skip = page*limit;
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
    }catch (err) {
        console.log('couldnt get messages to :', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }
})

module.exports = router;