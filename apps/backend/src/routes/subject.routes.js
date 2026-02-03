const express = require('express');
const router = express.Router();
const passport = require('passport');
const subjectController = require('../controllers/subject.controller');
const lectureController = require('../controllers/lecture.controller');

// Subject routes
router.get('/', passport.authenticate('jwt', { session: false }), subjectController.getSubjects);
router.post('/', passport.authenticate('jwt', { session: false }), subjectController.createSubject);
router.put('/:id', passport.authenticate('jwt', { session: false }), subjectController.updateSubject);
router.delete('/:id', passport.authenticate('jwt', { session: false }), subjectController.deleteSubject);

// Lecture routes within a subject
router.post('/:subjectId/lectures', passport.authenticate('jwt', { session: false }), lectureController.createLecture);

// Lecture routes
router.delete('/lectures/:id', passport.authenticate('jwt', { session: false }), lectureController.deleteLecture);

module.exports = router; 