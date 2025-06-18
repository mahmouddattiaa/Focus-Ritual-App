const express = require('express');
const router = express.Router();
const passport = require('passport');
const aiController = require('../controllers/ai.controller');

// Route for analyzing a PDF that has been uploaded to GCS
router.post('/analyze-pdf', passport.authenticate('jwt', { session: false }), aiController.analyzePdf);

// Route for retrieving lecture content
router.get('/lecture-content/:lectureId', passport.authenticate('jwt', { session: false }), aiController.getLectureContent);

// Route for checking processing status
router.get('/processing-status/:lectureId', passport.authenticate('jwt', { session: false }), aiController.getProcessingStatus);

module.exports = router; 