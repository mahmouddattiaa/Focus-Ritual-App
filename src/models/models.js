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


const UploadedFile = mongoose.model('UploadedFile', uploadedFileSchema);
const ExtractedText = mongoose.model('ExtractedText', extractedTextSchema);
const Flashcard = mongoose.model('Flashcard', flashcardSchema);
const Summary = mongoose.model('Summary', summarySchema);


module.exports = { User, UploadedFile, ExtractedText, Flashcard, Summary };