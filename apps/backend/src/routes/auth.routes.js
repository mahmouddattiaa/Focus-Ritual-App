const express = require('express');
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const router = express.Router();
const {forgotPasswordLimiter} = require('../middleware/rateLimiter');

router.post('/register', authController.register);


router.post('/login', passport.authenticate('local', {session: false}), authController.login);


router.get('/me', passport.authenticate('jwt', {session: false}), authController.getCurrentUser);

router.post('/refresh', authController.refresh);

router.post('/logout', passport.authenticate('jwt', {session: false}), authController.logout);

router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);

router.put('/reset-password',authController.resetPassword );

module.exports = router;