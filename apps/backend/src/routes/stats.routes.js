const express = require('express');
const router = express.Router();
const passport = require('passport');
const statsController = require('../controllers/stats.controller');

const auth = passport.authenticate('jwt', { session: false });

// GET all tasks for the logged-in user
router.get('/getTasks', auth, statsController.getTasks);

// POST to add a new task
router.post('/addTask', auth, statsController.addTask);

// POST to update an existing task
router.post('/updateTask', auth, statsController.updateTask);

// POST to remove a task
router.post('/removeTask', auth, statsController.removeTask);

module.exports = router; 