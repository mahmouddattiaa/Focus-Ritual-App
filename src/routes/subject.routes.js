const express = require('express');
const router = express.Router();
const passport = require('passport');
const {
    getSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    createLecture,
    updateLecture,
    deleteLecture,
} = require('../controllers/subject.controller');

const auth = passport.authenticate('jwt', { session: false });

router.route('/').get(auth, getSubjects).post(auth, createSubject);
router.route('/:id').put(auth, updateSubject).delete(auth, deleteSubject);
router.route('/:id/lectures').post(auth, createLecture);
router.route('/lectures/:id').put(auth, updateLecture).delete(auth, deleteLecture);

module.exports = router; 