const express = require('express');
const router = express.Router();
const learningPathController = require('../controllers/learning-path.controller');
const passport = require('passport');

// Apply JWT authentication to all routes
router.use(passport.authenticate('jwt', { session: false }));

// Generate or update a learning path for a lecture
router.post('/:lectureId/generate', learningPathController.generateLearningPath);

// Get a learning path for a lecture
router.get('/:lectureId', learningPathController.getLearningPath);

// Update a topic status in a learning path
router.put('/:lectureId/topics/:topicId', learningPathController.updateTopicStatus);

module.exports = router; 