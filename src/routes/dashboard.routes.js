const express = require('express');
const passport = require('passport');
const statsController = require('../controllers/stats.controller');
const router = express.Router();


router.put('/task', passport.authenticate('jwt', {session: false}), statsController.CompleteTask);


router.put('/session', passport.authenticate('jwt', {session: false}), statsController.IncSessions);


router.put('/hours', passport.authenticate('jwt', {session: false}), statsController.IncreaseHours);


router.get('/get', passport.authenticate('jwt', { session: false }), statsController.GetAllStats);


module.exports = router;