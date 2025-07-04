const mongoose = require('mongoose');



const uploadedFileSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    file_name: { type: String, required: true },
    file_path: { type: String, required: true },
    upload_date: { type: Date, default: Date.now }
});


const extractedTextSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    file_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UploadedFile', required: true },
    text_content: { type: String, required: true },
    extracted_at: { type: Date, default: Date.now }
});

// Schema for Flashcards collection - for legacy data
const flashcardSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    extracted_text_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ExtractedText', required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

// Schema for Summaries collection
const summarySchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    summary_text: { type: String, required: true },
    generated_at: { type: Date, default: Date.now }
});

// Schema for Library Folders
const libraryFolderSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LibraryFolder', default: null },
    path: { type: String, default: '/' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Schema for Library Files (references to uploaded files with folder associations)
const libraryFileSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    file_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UploadedFile', required: true },
    name: { type: String, required: true },
    folder_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LibraryFolder', default: null },
    path: { type: String, default: '/' },
    size: { type: Number },
    content_type: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Create models, checking if they already exist to prevent duplicate model errors
const UploadedFile = mongoose.models.UploadedFile || mongoose.model('UploadedFile', uploadedFileSchema);
const ExtractedText = mongoose.models.ExtractedText || mongoose.model('ExtractedText', extractedTextSchema);
// Skip creating Flashcard model here since it's defined in flashcard.model.js
const LegacyFlashcard = mongoose.models.LegacyFlashcard || mongoose.model('LegacyFlashcard', flashcardSchema);
const Summary = mongoose.models.Summary || mongoose.model('Summary', summarySchema);
const LibraryFolder = mongoose.models.LibraryFolder || mongoose.model('LibraryFolder', libraryFolderSchema);
const LibraryFile = mongoose.models.LibraryFile || mongoose.model('LibraryFile', libraryFileSchema);

module.exports = {
    UploadedFile,
    ExtractedText,
    LegacyFlashcard, // Export as LegacyFlashcard to avoid conflicts
    Summary,
    LibraryFolder,
    LibraryFile
};