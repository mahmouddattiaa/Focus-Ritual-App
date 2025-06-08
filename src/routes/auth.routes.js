const express = require('express');
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const router = express.Router();

// Register route
router.post('/register', authController.register);

// Login route
router.post('/login', passport.authenticate('local', {session: false}), authController.login);

// Get current user route
router.get('/me', passport.authenticate('jwt', {session: false}), authController.getCurrentUser);

module.exports = router;