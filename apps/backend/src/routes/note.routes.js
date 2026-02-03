const express = require('express');
const router = express.Router();
const noteController = require('../controllers/note.controller');
const passport = require('passport');

// Apply JWT authentication to all routes
router.use(passport.authenticate('jwt', { session: false }));

// Create a new note
router.post('/', noteController.createNote);

// Get all notes for a lecture
router.get('/lecture/:lectureId', noteController.getNotesByLecture);

// Get a specific note
router.get('/:noteId', noteController.getNoteById);

// Update a note
router.put('/:noteId', noteController.updateNote);

// Delete a note
router.delete('/:noteId', noteController.deleteNote);

module.exports = router; 