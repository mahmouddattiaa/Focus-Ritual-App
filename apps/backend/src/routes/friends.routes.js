const friendsController = require('../controllers/friends.controller');
const express = require('express');
const passport = require('passport');
const router = express.Router();

router.put('/request', passport.authenticate('jwt', {session: false}), friendsController.addFriend);
router.put('/accept', passport.authenticate('jwt', {session: false}), friendsController.acceptFriend);
router.put('/decline', passport.authenticate('jwt', {session: false}), friendsController.declineFriend);
router.get('/list', passport.authenticate('jwt', {session: false}), friendsController.getFriendList);
router.get('/info/:friendId', passport.authenticate('jwt', {session: false}), friendsController.getFriendInfo);
router.get('/requests', passport.authenticate('jwt', {session: false}), friendsController.getFriendRequests);
router.put('/unfriend', passport.authenticate('jwt', {session: false}), friendsController.unfriend);
module.exports = router;