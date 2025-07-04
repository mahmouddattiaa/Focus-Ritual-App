const express = require('express');
const router = express.Router();
const passport = require('passport');
const aiController = require('../controllers/ai.controller');

// Route for analyzing a PDF that has been uploaded to GCS
router.post('/analyze-pdf', passport.authenticate('jwt', { session: false }), aiController.analyzePdf);

// Route for retrieving lecture content
router.get('/lecture-content/:lectureId', passport.authenticate('jwt', { session: false }), aiController.getLectureContent);

// Route for checking job status
router.get('/job-status/:jobId', passport.authenticate('jwt', { session: false }), aiController.getJobStatus);

// Add routes for new AI features
router.post('/document-qa', passport.authenticate('jwt', { session: false }), aiController.documentQA);
router.post('/generate-flashcards', passport.authenticate('jwt', { session: false }), aiController.generateFlashcards);
router.post('/learning-path', passport.authenticate('jwt', { session: false }), aiController.generateLearningPath);
router.post('/analyze-notes', passport.authenticate('jwt', { session: false }), aiController.analyzeNotes);

// Add a new route for AI chat functionality
router.post('/chat', passport.authenticate('jwt', { session: false }), aiController.handleChatMessage);

module.exports = router; 