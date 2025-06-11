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

// Schema for Flashcards collection
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

const taskSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    status: {
        type: { type: String, enum: ['todo', 'inProgress', 'completed'], default: 'todo' },
        label: { type: String, default: 'To Do' },
        color: { type: String, default: '#6B7280' }
    },
    priority: {
        level: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
        color: { type: String, default: '#F59E0B' }
    },
    urgency: {
        level: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
        color: { type: String, default: '#F59E0B' }
    },
    category: { type: String, default: 'General' },
    tags: [String],
    dueDate: { type: Date },
    estimatedTime: { type: Number }, // in minutes
    subtasks: [{
        id: { type: String, required: true },
        title: { type: String, required: true },
        completed: { type: Boolean, default: false }
    }],
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    completedAt: { type: Date },
}, { timestamps: true });

const habitSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    frequency: { type: String, enum: ['Daily', 'Weekly', 'Monthly'], default: 'Daily' },
    category: { type: String, default: 'General' },
    targetCount: { type: Number, default: 1 },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastCompleted: { type: Date },
    completions: [{
        date: { type: Date, required: true },
        count: { type: Number, default: 1 }
    }],
}, { timestamps: true });


const UploadedFile = mongoose.model('UploadedFile', uploadedFileSchema);
const ExtractedText = mongoose.model('ExtractedText', extractedTextSchema);
const Flashcard = mongoose.model('Flashcard', flashcardSchema);
const Summary = mongoose.model('Summary', summarySchema);
const LibraryFolder = mongoose.model('LibraryFolder', libraryFolderSchema);
const LibraryFile = mongoose.model('LibraryFile', libraryFileSchema);
const Task = mongoose.model('Task', taskSchema);
const Habit = mongoose.model('Habit', habitSchema);


module.exports = { UploadedFile, ExtractedText, Flashcard, Summary, LibraryFolder, LibraryFile, Task, Habit };