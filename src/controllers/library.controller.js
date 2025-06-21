const { gcs } = require('../config/gcs');
const fs = require('fs').promises;
const { UploadedFile, LibraryFile } = require('../models/models');
const mongoose = require('mongoose');
const { generateResponse } = require('../services/gemini.service');
const pdf = require('pdf-parse');
const LectureContent = require('../models/lectureContent.model');

// Create a new model for storing lecture content
// const LectureContent = mongoose.model('LectureContent', new mongoose.Schema({
//     user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
//     lecture_id: { type: String, required: true },
//     subject_id: { type: String, required: true },
//     file_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UploadedFile' },
//     title: { type: String, required: true },
//     summary: { type: String },
//     flashcards: [{ question: String, answer: String }],
//     examQuestions: [String],
//     revision: { type: String },
//     created_at: { type: Date, default: Date.now },
//     updated_at: { type: Date, default: Date.now }
// }));

// New function to get all subjects and lectures with content
exports.getAllSubjectsAndLectures = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get all lecture content for this user
        const lectureContents = await LectureContent.find({ user_id: req.user._id });

        // Group lecture contents by subject
        const subjectMap = {};

        for (const content of lectureContents) {
            const { subject_id, lecture_id, title, summary, flashcards, examQuestions, revision, file_id, _id } = content;

            // Create subject if it doesn't exist
            if (!subjectMap[subject_id]) {
                subjectMap[subject_id] = {
                    id: subject_id,
                    name: `Subject ${subject_id}`, // Default name, will be overridden if provided in frontend
                    color: 'bg-slate-500', // Default color
                    lectures: []
                };
            }

            // Add lecture to subject
            subjectMap[subject_id].lectures.push({
                id: lecture_id,
                title: title,
                summary: summary,
                flashcards: flashcards,
                examQuestions: examQuestions,
                revision: revision,
                fileId: file_id,
                contentId: _id
            });
        }

        // Convert map to array
        const subjects = Object.values(subjectMap);

        res.status(200).json({
            success: true,
            subjects: subjects
        });
    } catch (error) {
        console.error('Error in getAllSubjectsAndLectures controller:', error);
        res.status(500).json({ error: 'Failed to get subjects and lectures', message: error.message });
    }
};

exports.generateContent = async (req, res) => {
    console.log('Received request to generate lecture content with GCS storage and AI analysis');
    try {
        // 1. Validate request
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!req.file) {
            return res.status(400).send({ message: 'No file uploaded.' });
        }

        const userId = req.user._id;
        const file = req.file;
        const subjectId = req.body.subjectId;
        const lectureId = req.body.lectureId;
        const subjectName = req.body.subjectName || 'unfiled';
        const lectureTitle = req.body.title || 'Uploaded Lecture';

        console.log(`Processing lecture: ${lectureTitle} (ID: ${lectureId}) in subject: ${subjectName} (ID: ${subjectId})`);

        // 2. Upload file to Google Cloud Storage
        const fileContent = await fs.readFile(file.path);
        const key = `library/${userId}/${subjectName}/${Date.now()}_${file.originalname}`;
        const gcsFile = gcs.file(key);

        await gcsFile.save(fileContent, {
            contentType: file.mimetype,
        });
        console.log(`File uploaded to Google Cloud Storage at: ${key}`);

        // 3. Save file metadata to database
        const uploadedFile = new UploadedFile({
            user_id: userId,
            file_name: file.originalname,
            file_path: key // store the GCS key
        });
        await uploadedFile.save();
        console.log(`File metadata saved to database with ID: ${uploadedFile._id}`);

        // 4. Extract text from PDF for analysis
        let documentText = '';
        try {
            const pdfData = await pdf(fileContent);
            documentText = pdfData.text;
            console.log(`Extracted ${documentText.length} characters from PDF`);
        } catch (pdfError) {
            console.error('Error extracting text from PDF:', pdfError);
            documentText = 'Failed to extract text from PDF. Please check if the file is a valid PDF document.';
        }

        // 5. Generate AI content using Gemini
        let aiContent = {};
        try {
            const prompt = `
        Based on the following text from a lecture document titled "${lectureTitle}", please generate a JSON object with the following properties: "summary", "flashcards", "examQuestions", "revision".
        - "summary": A concise summary of the key topics and concepts (2-4 sentences).
        - "flashcards": An array of 3-5 objects, where each object has a "question" and "answer" property. Questions should cover main ideas.
        - "examQuestions": An array of 2-3 potential exam questions based on the material.
        - "revision": A short paragraph for quick revision, highlighting the most critical points.

        Here is the document text:
        ---
        ${documentText.substring(0, 30000)} 
        ---
        Return only the raw JSON object, without any markdown formatting.
      `;

            console.log('Sending prompt to Gemini...');
            const aiResponseString = await generateResponse(prompt);

            // Clean the response to ensure it's valid JSON
            const cleanedJsonString = aiResponseString.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                aiContent = JSON.parse(cleanedJsonString);
                console.log('Successfully parsed AI response as JSON');
            } catch (jsonError) {
                console.error('Failed to parse AI response as JSON:', jsonError);
                // Fallback to a simpler structure if parsing fails
                aiContent = {
                    summary: aiResponseString.substring(0, 500),
                    flashcards: [{ question: "What is the main topic?", answer: "See summary" }],
                    examQuestions: ["Explain the main concepts covered in the document."],
                    revision: "Please review the summary for key points."
                };
            }
        } catch (aiError) {
            console.error('Error generating AI content:', aiError);
            aiContent = {
                summary: "Failed to generate AI content. Please try again later.",
                flashcards: [],
                examQuestions: [],
                revision: ""
            };
        }

        // 6. Store the AI-generated content in the database
        const lectureContent = new LectureContent({
            user_id: userId,
            lecture_id: lectureId,
            subject_id: subjectId,
            file_id: uploadedFile._id,
            title: lectureTitle,
            ...aiContent
        });

        await lectureContent.save();
        console.log(`Lecture content saved to database with ID: ${lectureContent._id}`);

        // 7. Clean up temporary file
        await fs.unlink(file.path);
        console.log(`Temporary file deleted: ${file.path}`);

        // 8. Return success response with the generated content
        res.status(200).json({
            success: true,
            message: 'File uploaded and content generated successfully',
            fileId: uploadedFile._id,
            contentId: lectureContent._id,
            ...aiContent
        });

    } catch (error) {
        console.error('Error in generateContent controller:', error);
        // Clean up temporary file if it exists
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (cleanupError) {
                console.error('Failed to clean up temporary file:', cleanupError);
            }
        }
        res.status(500).send({ message: 'Failed to process file and generate content.' });
    }
};

// Get lecture content by ID
exports.getLectureContent = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const lectureId = req.params.lectureId;
        const userId = req.user._id;

        const content = await LectureContent.findOne({
            lecture_id: lectureId,
            user_id: userId
        });

        if (!content) {
            return res.status(404).json({ message: 'Lecture content not found' });
        }

        res.status(200).json(content);
    } catch (error) {
        console.error('Error retrieving lecture content:', error);
        res.status(500).json({ message: 'Failed to retrieve lecture content' });
    }
};

// New method to analyze PDFs without storing them
exports.analyzePdf = async (req, res) => {
    console.log('Received request to analyze PDF without storage');
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!req.file) {
            console.log('Request failed: No file uploaded.');
            return res.status(400).send({ message: 'No file uploaded.' });
        }

        const file = req.file;
        const lectureTitle = req.body.title || 'Uploaded Lecture';
        console.log(`Processing PDF: ${file.originalname} for lecture: ${lectureTitle}`);

        try {
            // Read the file from the temporary path
            const fileContent = await fs.readFile(file.path);
            console.log(`Read ${fileContent.length} bytes from temporary file`);

            // Parse the PDF to extract text
            const pdfData = await pdf(fileContent);
            const documentText = pdfData.text;
            console.log(`Extracted ${documentText.length} characters from PDF`);

            // Generate AI content using Gemini
            const prompt = `
        Based on the following text from a lecture document titled "${lectureTitle}", please generate a JSON object with the following properties: "summary", "flashcards", "examQuestions", "revision".
        - "summary": A concise summary of the key topics and concepts (2-4 sentences).
        - "flashcards": An array of 3-5 objects, where each object has a "question" and "answer" property. Questions should cover main ideas.
        - "examQuestions": An array of 2-3 potential exam questions based on the material.
        - "revision": A short paragraph for quick revision, highlighting the most critical points.

        Here is the document text:
        ---
        ${documentText.substring(0, 30000)} 
        ---
        Return only the raw JSON object, without any markdown formatting.
      `;

            console.log('Sending prompt to Gemini...');
            const aiResponseString = await generateResponse(prompt);

            // Clean the response to ensure it's valid JSON
            const cleanedJsonString = aiResponseString.replace(/```json/g, '').replace(/```/g, '').trim();
            let aiContent;

            try {
                aiContent = JSON.parse(cleanedJsonString);
                console.log('Successfully parsed AI response as JSON');
            } catch (jsonError) {
                console.error('Failed to parse AI response as JSON:', jsonError);
                console.log('Raw response:', aiResponseString);
                // Fallback to a simpler structure if parsing fails
                aiContent = {
                    summary: aiResponseString.substring(0, 500),
                    flashcards: [{ question: "What is the main topic?", answer: "See summary" }],
                    examQuestions: ["Explain the main concepts covered in the document."],
                    revision: "Please review the summary for key points."
                };
            }

            // Clean up the temporary file
            await fs.unlink(file.path);
            console.log(`Temporary file deleted: ${file.path}`);

            // Send the AI-generated content back to the client
            res.status(200).json(aiContent);

        } catch (error) {
            console.error('Error processing PDF:', error);
            res.status(500).send({ message: 'Failed to analyze PDF and generate content.' });
        } finally {
            // Ensure the temporary file is deleted even if there's an error
            try {
                if (req.file && req.file.path) {
                    await fs.unlink(req.file.path);
                    console.log(`Cleaned up temporary file: ${req.file.path}`);
                }
            } catch (cleanupError) {
                console.error('Failed to clean up temporary file:', cleanupError);
            }
        }
    } catch (error) {
        console.error('Unexpected error in analyzePdf controller:', error);
        res.status(500).send({ message: 'An unexpected error occurred.' });
    }
};

// Delete file from cloud storage and database
exports.deleteFile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const fileId = req.params.fileId;
        const userId = req.user._id;

        console.log(`Attempting to delete file with ID: ${fileId} for user: ${userId}`);

        // First, find the file in the database
        const file = await UploadedFile.findOne({
            _id: fileId,
            user_id: userId
        });

        if (!file) {
            console.log(`File not found with ID: ${fileId}`);
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Delete the file from Google Cloud Storage
        try {
            const gcsFile = gcs.file(file.file_path);
            await gcsFile.delete();
            console.log(`Deleted file from GCS: ${file.file_path}`);
        } catch (gcsError) {
            console.error('Error deleting file from GCS:', gcsError);
            // Continue with database deletion even if GCS deletion fails
        }

        // Delete file from database
        await UploadedFile.deleteOne({ _id: fileId });
        console.log(`Deleted file metadata from database with ID: ${fileId}`);

        // Delete any associated lecture content
        const deletedContent = await LectureContent.deleteMany({ file_id: fileId });
        console.log(`Deleted ${deletedContent.deletedCount} lecture content entries associated with file`);

        res.status(200).json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteFile controller:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete file',
            error: error.message
        });
    }
};

// Check if a file exists in cloud storage
exports.checkFileExists = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const fileId = req.params.fileId;
        const userId = req.user._id;

        console.log(`Checking if file exists with ID: ${fileId} for user: ${userId}`);

        // Find the file in the database
        const file = await UploadedFile.findOne({
            _id: fileId,
            user_id: userId
        });

        if (!file) {
            console.log(`File not found in database with ID: ${fileId}`);
            return res.status(404).json({
                success: false,
                exists: false,
                message: 'File not found in database'
            });
        }

        // Check if the file exists in Google Cloud Storage
        try {
            const gcsFile = gcs.file(file.file_path);
            const [exists] = await gcsFile.exists();

            console.log(`File ${file.file_path} exists in GCS: ${exists}`);

            res.status(200).json({
                success: true,
                exists: exists,
                file: {
                    id: file._id,
                    name: file.file_name,
                    path: file.file_path
                }
            });
        } catch (gcsError) {
            console.error('Error checking if file exists in GCS:', gcsError);
            res.status(500).json({
                success: false,
                exists: false,
                message: 'Error checking if file exists in cloud storage',
                error: gcsError.message
            });
        }
    } catch (error) {
        console.error('Error in checkFileExists controller:', error);
        res.status(500).json({
            success: false,
            exists: false,
            message: 'Failed to check if file exists',
            error: error.message
        });
    }
}; 