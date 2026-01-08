const express = require('express');
const passport = require('passport');
const router = express.Router();
const feedController = require('../controllers/feed.controller');
const upload = require('../middleware/upload');

router.post('/post', passport.authenticate('jwt', {session: false}), upload.single('file'), feedController.Post);
router.put('/edit', passport.authenticate('jwt', {session: false}), feedController.editPost);
router.put('/like', passport.authenticate('jwt', {session: false}), feedController.likePost);
router.put('/unlike', passport.authenticate('jwt', {session: false}), feedController.removeLike);
router.delete('/:postId', passport.authenticate('jwt', {session: false}), feedController.deletePost);
router.get('/get', passport.authenticate('jwt', {session: false}), feedController.getPosts);

module.exports = router;