const Note = require('../models/note.model');
const cloudStorage = require('../config/gcs');

exports.createNote = async (req, res) => {
    try {
        const { title, content, tags, lectureId } = req.body;

        if (!title || !content || !lectureId) {
            return res.status(400).json({ message: 'Title, content, and lectureId are required' });
        }

        // Create a new note with minimal data in MongoDB
        const note = new Note({
            title,
            content: '', // Don't store the actual content in MongoDB
            contentStoredInCloud: true, // Flag indicating content is in GCS
            tags: tags || [],
            userId: req.user._id,
            lectureId
        });

        // Save the minimal record to MongoDB first to get an ID
        await note.save();

        // Store the full content in Google Cloud Storage
        try {
            const fileName = `notes/${req.user._id}/${note._id}.json`;
            const fileContent = JSON.stringify({
                title,
                content, // Full content stored in GCS
                tags: tags || [],
                userId: req.user._id.toString(),
                lectureId,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt
            });

            const bucket = cloudStorage.storage.bucket(process.env.GCS_BUCKET || 'focus-ritual-files');
            const file = bucket.file(fileName);

            await file.save(fileContent, {
                contentType: 'application/json',
                metadata: {
                    userId: req.user._id.toString(),
                    lectureId,
                    noteId: note._id.toString()
                }
            });

            // Add cloud storage path to the note
            note.cloudPath = fileName;
            await note.save();

            // Create a response object that includes the content from GCS
            const responseNote = note.toObject();
            responseNote.content = content; // Add the content back for the response
            res.status(201).json(responseNote);
        } catch (cloudError) {
            console.error('Error saving note to cloud storage:', cloudError);
            // If cloud storage fails, delete the MongoDB entry and return error
            await Note.deleteOne({ _id: note._id });
            return res.status(500).json({
                message: 'Error saving note to cloud storage',
                error: cloudError.message
            });
        }
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ message: 'Error creating note', error: error.message });
    }
};

exports.updateNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const { title, content, tags } = req.body;

        const note = await Note.findOne({
            _id: noteId,
            userId: req.user._id
        });

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        // Update metadata in MongoDB
        if (title) note.title = title;
        if (tags) note.tags = tags;
        note.updatedAt = Date.now();

        // Save updated metadata to MongoDB
        await note.save();

        // Update the full content in GCS
        try {
            const fileName = note.cloudPath || `notes/${req.user._id}/${note._id}.json`;

            // Get current content from GCS if not provided
            let currentContent = content;
            if (!currentContent && note.contentStoredInCloud) {
                const bucket = cloudStorage.storage.bucket(process.env.GCS_BUCKET || 'focus-ritual-files');
                const file = bucket.file(fileName);

                if (await file.exists().then(([exists]) => exists)) {
                    const [fileContent] = await file.download();
                    const parsedContent = JSON.parse(fileContent.toString());
                    currentContent = parsedContent.content;
                }
            }

            // Update the file in GCS
            const fileContent = JSON.stringify({
                title: note.title,
                content: currentContent || '', // Use updated content or existing content
                tags: note.tags,
                userId: req.user._id.toString(),
                lectureId: note.lectureId.toString(),
                createdAt: note.createdAt,
                updatedAt: note.updatedAt
            });

            const bucket = cloudStorage.storage.bucket(process.env.GCS_BUCKET || 'focus-ritual-files');
            const file = bucket.file(fileName);

            await file.save(fileContent, {
                contentType: 'application/json',
                metadata: {
                    userId: req.user._id.toString(),
                    lectureId: note.lectureId.toString(),
                    noteId: note._id.toString()
                }
            });

            // Make sure cloudPath is set
            if (!note.cloudPath) {
                note.cloudPath = fileName;
                note.contentStoredInCloud = true;
                await note.save();
            }

            // Create a response object with the content included
            const responseNote = note.toObject();
            responseNote.content = currentContent || '';
            res.json(responseNote);
        } catch (cloudError) {
            console.error('Error updating note in cloud storage:', cloudError);
            return res.status(500).json({
                message: 'Error updating note in cloud storage',
                error: cloudError.message
            });
        }
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ message: 'Error updating note', error: error.message });
    }
};

exports.deleteNote = async (req, res) => {
    try {
        const { noteId } = req.params;

        const note = await Note.findOne({
            _id: noteId,
            userId: req.user._id
        });

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        // Delete from cloud storage first
        try {
            if (note.cloudPath) {
                const bucket = cloudStorage.storage.bucket(process.env.GCS_BUCKET || 'focus-ritual-files');
                const file = bucket.file(note.cloudPath);
                await file.delete();
            }
        } catch (cloudError) {
            console.error('Error deleting note from cloud storage:', cloudError);
            // We'll still try to delete from MongoDB
        }

        // Delete from database
        await Note.deleteOne({ _id: noteId });

        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ message: 'Error deleting note', error: error.message });
    }
};

exports.getNotesByLecture = async (req, res) => {
    try {
        const { lectureId } = req.params;

        // Get basic note metadata from MongoDB
        const notes = await Note.find({
            userId: req.user._id,
            lectureId
        }).sort({ updatedAt: -1 });

        // Fetch full content for each note from GCS
        const notesWithContent = await Promise.all(
            notes.map(async (note) => {
                const noteObj = note.toObject();

                if (note.contentStoredInCloud && note.cloudPath) {
                    try {
                        const bucket = cloudStorage.storage.bucket(process.env.GCS_BUCKET || 'focus-ritual-files');
                        const file = bucket.file(note.cloudPath);

                        if (await file.exists().then(([exists]) => exists)) {
                            const [fileContent] = await file.download();
                            const parsedContent = JSON.parse(fileContent.toString());
                            noteObj.content = parsedContent.content;
                        }
                    } catch (cloudError) {
                        console.error(`Error fetching note ${note._id} from GCS:`, cloudError);
                        // Return note without content if cloud fetch fails
                        noteObj.content = ''; // Empty content as fallback
                        noteObj.fetchError = true;
                    }
                }

                return noteObj;
            })
        );

        res.json(notesWithContent);
    } catch (error) {
        console.error('Error getting notes:', error);
        res.status(500).json({ message: 'Error getting notes', error: error.message });
    }
};

exports.getNoteById = async (req, res) => {
    try {
        const { noteId } = req.params;

        const note = await Note.findOne({
            _id: noteId,
            userId: req.user._id
        });

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        res.json(note);
    } catch (error) {
        console.error('Error getting note:', error);
        res.status(500).json({ message: 'Error getting note', error: error.message });
    }
}; 