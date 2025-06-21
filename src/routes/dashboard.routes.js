const express = require('express');
const passport = require('passport');
const statsController = require('../controllers/stats.controller');
const router = express.Router();


router.put('/task', passport.authenticate('jwt', { session: false }), statsController.CompleteTask);


router.put('/dec', passport.authenticate('jwt', { session: false }), statsController.DecTasks);


router.put('/session', passport.authenticate('jwt', { session: false }), statsController.IncSessions);


router.put('/hours', passport.authenticate('jwt', { session: false }), statsController.IncreaseHours);


router.get('/get', passport.authenticate('jwt', { session: false }), statsController.GetAllStats);



router.post('/addTask', passport.authenticate('jwt', { session: false }), statsController.addTask);


router.delete('/removeTask', passport.authenticate('jwt', { session: false }), statsController.removeTask);


router.put('/updateTask', passport.authenticate('jwt', { session: false }), statsController.updateTask);


router.get('/getTasks', passport.authenticate('jwt', { session: false }), statsController.getTasks);

router.post('/addHabit', passport.authenticate('jwt', { session: false }), statsController.addHabit);

router.delete('/removeHabit', passport.authenticate('jwt', { session: false }), statsController.removeHabit);

router.put('/updateHabit', passport.authenticate('jwt', { session: false }), statsController.updateHabit);

router.put('/progressHabit', passport.authenticate('jwt', { session: false }), statsController.progressHabit);

router.get('/getHabits', passport.authenticate('jwt', { session: false }), statsController.getHabits);

router.get('/achievements', passport.authenticate('jwt', { session: false }), statsController.getAchievements);

// Add a route to seed test hourly data
router.post('/seedHourly', passport.authenticate('jwt', { session: false }), statsController.SeedHourlyData);


module.exports = router;