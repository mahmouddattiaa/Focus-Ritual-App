const Flashcard = require('../models/flashcard.model');
const cloudStorage = require('../config/gcs');

// Create a new flashcard
exports.createFlashcard = async (req, res) => {
    try {
        const { front, back, tags, difficulty, lectureId } = req.body;

        if (!front || !back || !lectureId) {
            return res.status(400).json({
                message: 'Front, back, and lectureId are required fields'
            });
        }

        // Store minimal data in MongoDB
        const flashcard = new Flashcard({
            front: '', // Keep MongoDB record minimal
            back: '', // Keep MongoDB record minimal
            tags: tags || [],
            difficulty: difficulty || 2.5,
            lectureId,
            userId: req.user._id,
            contentStoredInCloud: true,
            nextReview: new Date() // Due immediately for first review
        });

        // Save minimal record to get an ID
        await flashcard.save();

        // Store the full flashcard content in GCS
        try {
            const fileName = `flashcards/${req.user._id}/${flashcard._id}.json`;
            const fileContent = JSON.stringify({
                front, // Store full content in GCS
                back, // Store full content in GCS
                tags: tags || [],
                difficulty: difficulty || 2.5,
                lectureId,
                userId: req.user._id.toString(),
                createdAt: flashcard.createdAt,
                updatedAt: flashcard.updatedAt
            });

            const bucket = cloudStorage.storage.bucket(process.env.GCS_BUCKET || 'focus-ritual-files');
            const file = bucket.file(fileName);

            await file.save(fileContent, {
                contentType: 'application/json',
                metadata: {
                    userId: req.user._id.toString(),
                    lectureId,
                    flashcardId: flashcard._id.toString()
                }
            });

            // Add cloud storage path to the flashcard
            flashcard.cloudPath = fileName;
            await flashcard.save();

            // Create a response object with content included
            const responseFlashcard = flashcard.toObject();
            responseFlashcard.front = front;
            responseFlashcard.back = back;

            res.status(201).json(responseFlashcard);
        } catch (cloudError) {
            console.error('Error saving flashcard to cloud storage:', cloudError);
            // If cloud storage fails, delete the MongoDB entry
            await Flashcard.deleteOne({ _id: flashcard._id });
            return res.status(500).json({
                message: 'Error saving flashcard to cloud storage',
                error: cloudError.message
            });
        }
    } catch (error) {
        console.error('Error creating flashcard:', error);
        res.status(500).json({ message: 'Error creating flashcard', error: error.message });
    }
};

// Get all flashcards for a lecture
exports.getFlashcardsByLecture = async (req, res) => {
    try {
        const { lectureId } = req.params;

        // Get basic flashcard metadata from MongoDB
        const flashcards = await Flashcard.find({
            lectureId,
            userId: req.user._id
        }).sort({ nextReview: 1 });

        // Fetch full content for each flashcard from GCS
        const flashcardsWithContent = await Promise.all(
            flashcards.map(async (flashcard) => {
                const cardObj = flashcard.toObject();

                if (flashcard.contentStoredInCloud && flashcard.cloudPath) {
                    try {
                        const bucket = cloudStorage.storage.bucket(process.env.GCS_BUCKET || 'focus-ritual-files');
                        const file = bucket.file(flashcard.cloudPath);

                        if (await file.exists().then(([exists]) => exists)) {
                            const [fileContent] = await file.download();
                            const parsedContent = JSON.parse(fileContent.toString());
                            cardObj.front = parsedContent.front;
                            cardObj.back = parsedContent.back;
                        }
                    } catch (cloudError) {
                        console.error(`Error fetching flashcard ${flashcard._id} from GCS:`, cloudError);
                        // Return flashcard with empty content if cloud fetch fails
                        cardObj.fetchError = true;
                    }
                }

                return cardObj;
            })
        );

        res.json(flashcardsWithContent);
    } catch (error) {
        console.error('Error getting flashcards:', error);
        res.status(500).json({ message: 'Error getting flashcards', error: error.message });
    }
};

// Get all due flashcards
exports.getDueFlashcards = async (req, res) => {
    try {
        // Get all flashcards due for review (where nextReview <= now)
        const flashcards = await Flashcard.find({
            userId: req.user._id,
            nextReview: { $lte: new Date() }
        }).sort({ nextReview: 1 });

        // Fetch full content for each flashcard from GCS
        const flashcardsWithContent = await Promise.all(
            flashcards.map(async (flashcard) => {
                const cardObj = flashcard.toObject();

                if (flashcard.contentStoredInCloud && flashcard.cloudPath) {
                    try {
                        const bucket = cloudStorage.storage.bucket(process.env.GCS_BUCKET || 'focus-ritual-files');
                        const file = bucket.file(flashcard.cloudPath);

                        if (await file.exists().then(([exists]) => exists)) {
                            const [fileContent] = await file.download();
                            const parsedContent = JSON.parse(fileContent.toString());
                            cardObj.front = parsedContent.front;
                            cardObj.back = parsedContent.back;
                        }
                    } catch (cloudError) {
                        console.error(`Error fetching flashcard ${flashcard._id} from GCS:`, cloudError);
                        cardObj.fetchError = true;
                    }
                }

                return cardObj;
            })
        );

        res.json(flashcardsWithContent);
    } catch (error) {
        console.error('Error getting due flashcards:', error);
        res.status(500).json({ message: 'Error getting due flashcards', error: error.message });
    }
};

// Update a flashcard
exports.updateFlashcard = async (req, res) => {
    try {
        const { flashcardId } = req.params;
        const { front, back, tags, difficulty } = req.body;

        const flashcard = await Flashcard.findOne({
            _id: flashcardId,
            userId: req.user._id
        });

        if (!flashcard) {
            return res.status(404).json({ message: 'Flashcard not found' });
        }

        // Update metadata in MongoDB
        if (tags) flashcard.tags = tags;
        if (difficulty) flashcard.difficulty = difficulty;
        flashcard.updatedAt = Date.now();

        // Save updated metadata to MongoDB
        await flashcard.save();

        // Update the full content in GCS
        try {
            const fileName = flashcard.cloudPath || `flashcards/${req.user._id}/${flashcard._id}.json`;

            // Get current content from GCS if new content not provided
            let currentFront = front;
            let currentBack = back;

            if ((!currentFront || !currentBack) && flashcard.contentStoredInCloud) {
                const bucket = cloudStorage.storage.bucket(process.env.GCS_BUCKET || 'focus-ritual-files');
                const file = bucket.file(fileName);

                if (await file.exists().then(([exists]) => exists)) {
                    const [fileContent] = await file.download();
                    const parsedContent = JSON.parse(fileContent.toString());

                    if (!currentFront) currentFront = parsedContent.front;
                    if (!currentBack) currentBack = parsedContent.back;
                }
            }

            // Update the file in GCS
            const fileContent = JSON.stringify({
                front: currentFront || '',
                back: currentBack || '',
                tags: flashcard.tags,
                difficulty: flashcard.difficulty,
                userId: req.user._id.toString(),
                lectureId: flashcard.lectureId.toString(),
                createdAt: flashcard.createdAt,
                updatedAt: flashcard.updatedAt
            });

            const bucket = cloudStorage.storage.bucket(process.env.GCS_BUCKET || 'focus-ritual-files');
            const file = bucket.file(fileName);

            await file.save(fileContent, {
                contentType: 'application/json',
                metadata: {
                    userId: req.user._id.toString(),
                    lectureId: flashcard.lectureId.toString(),
                    flashcardId: flashcard._id.toString()
                }
            });

            // Make sure cloudPath is set
            if (!flashcard.cloudPath) {
                flashcard.cloudPath = fileName;
                flashcard.contentStoredInCloud = true;
                await flashcard.save();
            }

            // Create a response object with the content included
            const responseFlashcard = flashcard.toObject();
            responseFlashcard.front = currentFront || '';
            responseFlashcard.back = currentBack || '';

            res.json(responseFlashcard);
        } catch (cloudError) {
            console.error('Error updating flashcard in cloud storage:', cloudError);
            return res.status(500).json({
                message: 'Error updating flashcard in cloud storage',
                error: cloudError.message
            });
        }
    } catch (error) {
        console.error('Error updating flashcard:', error);
        res.status(500).json({ message: 'Error updating flashcard', error: error.message });
    }
};

// Delete a flashcard
exports.deleteFlashcard = async (req, res) => {
    try {
        const { flashcardId } = req.params;

        const flashcard = await Flashcard.findOne({
            _id: flashcardId,
            userId: req.user._id
        });

        if (!flashcard) {
            return res.status(404).json({ message: 'Flashcard not found' });
        }

        // Delete from cloud storage first
        try {
            if (flashcard.cloudPath) {
                const bucket = cloudStorage.storage.bucket(process.env.GCS_BUCKET || 'focus-ritual-files');
                const file = bucket.file(flashcard.cloudPath);
                await file.delete();
            }
        } catch (cloudError) {
            console.error('Error deleting flashcard from cloud storage:', cloudError);
            // We'll still try to delete from MongoDB
        }

        // Delete from database
        await Flashcard.deleteOne({ _id: flashcardId });

        res.json({ message: 'Flashcard deleted successfully' });
    } catch (error) {
        console.error('Error deleting flashcard:', error);
        res.status(500).json({ message: 'Error deleting flashcard', error: error.message });
    }
};

// Review a flashcard (update spaced repetition data)
exports.reviewFlashcard = async (req, res) => {
    try {
        const { flashcardId } = req.params;
        const { difficulty, wasCorrect } = req.body;

        const flashcard = await Flashcard.findOne({
            _id: flashcardId,
            userId: req.user._id
        });

        if (!flashcard) {
            return res.status(404).json({ message: 'Flashcard not found' });
        }

        // Calculate new values using SM-2 algorithm
        const oldEaseFactor = flashcard.easeFactor;
        let newEaseFactor, newInterval, newRepetitions;

        if (wasCorrect) {
            newEaseFactor = Math.max(1.3, oldEaseFactor + (0.1 - (5 - difficulty) * (0.08 + (5 - difficulty) * 0.02)));

            if (flashcard.repetitions === 0) {
                newInterval = 1; // First correct answer: 1 day
            } else if (flashcard.repetitions === 1) {
                newInterval = 6; // Second correct answer: 6 days
            } else {
                newInterval = Math.round(flashcard.interval * newEaseFactor);
            }

            newRepetitions = flashcard.repetitions + 1;
        } else {
            newEaseFactor = Math.max(1.3, oldEaseFactor - 0.2);
            newInterval = 1; // Reset interval to 1 day after incorrect answer
            newRepetitions = 0; // Reset repetitions
        }

        // Update the review data in MongoDB
        flashcard.easeFactor = newEaseFactor;
        flashcard.interval = newInterval;
        flashcard.repetitions = newRepetitions;
        flashcard.lastReviewed = new Date();
        flashcard.nextReview = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000); // Add days to current date

        await flashcard.save();

        // Also update the review data in GCS
        if (flashcard.cloudPath) {
            try {
                const bucket = cloudStorage.storage.bucket(process.env.GCS_BUCKET || 'focus-ritual-files');
                const file = bucket.file(flashcard.cloudPath);

                // Get current content first
                const [fileContent] = await file.download();
                const parsedContent = JSON.parse(fileContent.toString());

                // Update review data
                parsedContent.easeFactor = newEaseFactor;
                parsedContent.interval = newInterval;
                parsedContent.repetitions = newRepetitions;
                parsedContent.lastReviewed = flashcard.lastReviewed;
                parsedContent.nextReview = flashcard.nextReview;

                // Save updated content back to GCS
                await file.save(JSON.stringify(parsedContent), {
                    contentType: 'application/json',
                    metadata: file.metadata
                });
            } catch (cloudError) {
                console.error('Error updating review data in cloud storage:', cloudError);
                // Continue since we've already updated MongoDB
            }
        }

        res.json(flashcard);
    } catch (error) {
        console.error('Error reviewing flashcard:', error);
        res.status(500).json({ message: 'Error reviewing flashcard', error: error.message });
    }
}; 