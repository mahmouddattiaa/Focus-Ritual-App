const express = require('express');
const { getGeminiResponse, getGeminiChatResponse } = require('../controllers/gemini.controller');
const passport = require('passport');

const router = express.Router();

// Middleware to authenticate using JWT
const authenticateJwt = passport.authenticate('jwt', { session: false });

// Route for generating a single response from Gemini
router.post('/generate', authenticateJwt, getGeminiResponse);

// Route for generating a response with chat history
router.post('/chat', authenticateJwt, getGeminiChatResponse);

module.exports = router;