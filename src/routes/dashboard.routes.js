const express = require('express');
const passport = require('passport');
const statsController = require('../controllers/stats.controller');
const router = express.Router();


router.put('/task', passport.authenticate('jwt', { session: false }), statsController.CompleteTask);

router.put('/dec', passport.authenticate('jwt', { session: false }), statsController.DecrementTask);

router.post('/addHabit', passport.authenticate('jwt', { session: false }), statsController.addHabit);

router.post('/removeHabit', passport.authenticate('jwt', { session: false }), statsController.removeHabit);

router.put('/updateHabit', passport.authenticate('jwt', { session: false }), statsController.updateHabit);

router.get('/getHabits', passport.authenticate('jwt', { session: false }), statsController.getHabits);

router.post('/progressHabit', passport.authenticate('jwt', { session: false }), statsController.progressHabit);

router.put('/session', passport.authenticate('jwt', { session: false }), statsController.IncSessions);


router.put('/hours', passport.authenticate('jwt', { session: false }), statsController.IncreaseHours);


router.get('/get', passport.authenticate('jwt', { session: false }), statsController.GetAllStats);


module.exports = router;