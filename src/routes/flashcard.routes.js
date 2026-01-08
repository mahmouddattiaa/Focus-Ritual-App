const express = require('express');
const router = express.Router();
const flashcardController = require('../controllers/flashcard.controller');
const passport = require('passport');

// Apply JWT authentication to all routes
router.use(passport.authenticate('jwt', { session: false }));

// Check if controller handlers are functions
const ensureHandler = (handler, name) => {
    if (typeof handler !== 'function') {
        console.error(`Warning: ${name} is not a function in flashcardController`);
        return (req, res) => res.status(500).json({
            error: `Handler ${name} is not implemented`
        });
    }
    return handler;
};

// Create a new flashcard
router.post('/', ensureHandler(flashcardController.createFlashcard, 'createFlashcard'));

// Get all flashcards for a lecture
router.get('/lecture/:lectureId', ensureHandler(flashcardController.getFlashcardsByLecture, 'getFlashcardsByLecture'));

// Get all due flashcards
router.get('/due', ensureHandler(flashcardController.getDueFlashcards, 'getDueFlashcards'));

// Update a flashcard
router.put('/:flashcardId', ensureHandler(flashcardController.updateFlashcard, 'updateFlashcard'));

// Delete a flashcard
router.delete('/:flashcardId', ensureHandler(flashcardController.deleteFlashcard, 'deleteFlashcard'));

// Review a flashcard (update spaced repetition data)
router.post('/:flashcardId/review', ensureHandler(flashcardController.reviewFlashcard, 'reviewFlashcard'));

module.exports = router; 