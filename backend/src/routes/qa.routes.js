const express = require('express');
const router = express.Router();
const qaController = require('../controllers/qa.controller');
const passport = require('passport');

// Apply JWT authentication to all routes
router.use(passport.authenticate('jwt', { session: false }));

// Create a new Q&A session
router.post('/', qaController.createSession);

// Get all Q&A sessions for a lecture
router.get('/lecture/:lectureId', qaController.getSessionsByLecture);

// Get a specific Q&A session
router.get('/:sessionId', qaController.getSessionById);

// Ask a question in a Q&A session
router.post('/:sessionId/ask', qaController.askQuestion);

// Delete a Q&A session
router.delete('/:sessionId', qaController.deleteSession);

module.exports = router; 