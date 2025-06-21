const { generateResponse } = require('./gemini.service');
const { gcs } = require('../config/gcs');
const pdf = require('pdf-parse');
const { UploadedFile, LibraryFile } = require('../models/models');
const LectureContent = require('../models/lectureContent.model');
const mongoose = require('mongoose');

// Create a temporary store for tracking processing status
const processingStatus = new Map();

/**
 * Get the processing status for a lecture
 * @param {string} lectureId - The ID of the lecture
 * @returns {Object} - The processing status
 */
const getProcessingStatus = (lectureId) => {
    if (!processingStatus.has(lectureId)) {
        return { status: 'unknown' };
    }
    return processingStatus.get(lectureId);
};

/**
 * Set the processing status for a lecture
 * @param {string} lectureId - The ID of the lecture
 * @param {string} status - The status message
 * @param {number} progress - Progress percentage (0-100)
 */
const setProcessingStatus = (lectureId, status, progress = 0) => {
    processingStatus.set(lectureId, { status, progress, updatedAt: new Date() });

    // Clean up old status entries after 1 hour
    setTimeout(() => {
        if (processingStatus.has(lectureId)) {
            processingStatus.delete(lectureId);
        }
    }, 60 * 60 * 1000);
};

/**
 * Analyzes a PDF file that has already been uploaded to GCS
 * @param {string} fileId - The ID of the uploaded file in the database
 * @param {string} lectureId - The ID of the lecture in the frontend
 * @param {string} subjectId - The ID of the subject in the frontend
 * @param {string} title - The title of the lecture
 * @param {Object} user - The user object
 * @returns {Promise<Object>} - The AI-generated content
 */
const analyzePdfFromGCS = async (fileId, lectureId, subjectId, title, user) => {
    try {
        // Set initial processing status
        setProcessingStatus(lectureId, 'Starting analysis', 5);

        console.log(`Starting PDF analysis with fileId=${fileId}, lectureId=${lectureId}, subjectId=${subjectId}, title=${title}`);

        // 1. Get the file reference from the database
        // First check if this is a library file ID
        let uploadedFileId = fileId;
        let fileDoc = null;

        // Check if this is a library file ID
        if (mongoose.Types.ObjectId.isValid(fileId)) {
            // Try to find it as a library file first
            const libraryFile = await LibraryFile.findOne({ _id: fileId, user_id: user._id });

            if (libraryFile) {
                // If it's a library file, get the actual uploaded file ID
                uploadedFileId = libraryFile.file_id;
                console.log(`Found library file with ID ${fileId}, using uploaded file ID ${uploadedFileId}`);
            } else {
                console.log(`No library file found with ID ${fileId}, trying to use it directly as an uploaded file ID`);
                // If no library file is found, try to use the ID directly as an uploaded file ID
                uploadedFileId = fileId;
            }
        } else {
            console.log(`Invalid ObjectId format for fileId: ${fileId}`);
        }

        // Now get the actual file
        fileDoc = await UploadedFile.findById(uploadedFileId);

        if (!fileDoc) {
            console.error(`File not found in database with ID: ${uploadedFileId}`);
            throw new Error('File not found in database');
        }

        console.log(`Found uploaded file: ${fileDoc.file_name}`);

        setProcessingStatus(lectureId, 'Downloading file from storage', 10);

        // 2. Download the file from GCS
        const gcsFile = gcs.file(fileDoc.file_path);
        const [fileContent] = await gcsFile.download();
        console.log(`Downloaded file from GCS: ${fileDoc.file_path}`);

        setProcessingStatus(lectureId, 'Extracting text from PDF', 20);

        // 3. Extract text from PDF
        let documentText = '';
        try {
            // For large PDFs, we'll use a more efficient approach
            const pdfOptions = {
                max: 30000, // Limit to first 30,000 characters to speed up processing
                pagerender: pageData => {
                    // Extract only first 5 pages for very large PDFs
                    if (fileContent.length > 5000000 && pageData.pageIndex > 5) {
                        return ''; // Skip additional pages
                    }
                    return pageData.getTextContent()
                        .then(textContent => {
                            return textContent.items.map(item => item.str).join(' ');
                        });
                }
            };

            const pdfData = await pdf(fileContent, pdfOptions);
            documentText = pdfData.text;
            console.log(`Extracted ${documentText.length} characters from PDF`);

            if (documentText.length > 30000) {
                console.log('Text is too long, truncating to 30,000 characters');
                documentText = documentText.substring(0, 30000);
            }
        } catch (pdfError) {
            console.error('Error extracting text from PDF:', pdfError);
            documentText = 'Failed to extract text from PDF. Please check if the file is a valid PDF document.';
        }

        setProcessingStatus(lectureId, 'Generating AI content', 40);

        // 4. Generate AI content using Gemini
        const prompt = `
      Based on the following text from a lecture document titled "${title}", please generate a detailed JSON object with the following properties: "summary", "flashcards", "examQuestions", "revision".

      - "summary": A comprehensive summary of the key topics and concepts formatted as an array of bullet points. Each bullet point should be a clear, concise statement about an important concept from the lecture. Include at least 8-10 bullet points.
      
      - "flashcards": An array of 8-10 objects, where each object has a "question" and "answer" property. Questions should cover main ideas, definitions, concepts, and applications. Answers should be comprehensive but concise.
      
      - "examQuestions": An array of 4-5 potential exam questions based on the material, where each item is an object with "question" and "answer" properties. Include a mix of conceptual and application questions. The answers should be detailed enough to serve as a model answer.
      
      - "revision": A structured revision guide with key points, formatted as a string with clear sections, bullet points, and highlighting of critical concepts. This should be comprehensive enough for a quick but thorough review.

      Here is the document text:
      ---
      ${documentText} 
      ---
      Return only the raw JSON object, without any markdown formatting.
    `;

        console.log('Sending prompt to Gemini...');
        setProcessingStatus(lectureId, 'Waiting for AI response', 60);

        const aiResponseString = await generateResponse(prompt);
        setProcessingStatus(lectureId, 'Processing AI response', 80);

        // 5. Parse the AI response
        const cleanedJsonString = aiResponseString.replace(/```json/g, '').replace(/```/g, '').trim();
        let aiContent;

        try {
            aiContent = JSON.parse(cleanedJsonString);
            console.log('Successfully parsed AI response as JSON');
        } catch (jsonError) {
            console.error('Failed to parse AI response as JSON:', jsonError);
            // Fallback to a simpler structure if parsing fails
            aiContent = {
                summary: aiResponseString.substring(0, 500),
                flashcards: [{ question: "What is the main topic?", answer: "See summary" }],
                examQuestions: [{ question: "Explain the main concepts covered in the document.", answer: "Please review the summary for key points." }],
                revision: "Please review the summary for key points."
            };
        }

        setProcessingStatus(lectureId, 'Saving content to database', 90);

        // 6. Store the AI content in the database
        const lectureContent = new LectureContent({
            user_id: user._id,
            file_id: fileId,
            lecture_id: lectureId,
            subject_id: subjectId,
            title: title,
            ...aiContent
        });

        await lectureContent.save();
        console.log(`Saved lecture content to database with ID: ${lectureContent._id}`);

        setProcessingStatus(lectureId, 'Complete', 100);

        // 7. Return the content
        return {
            ...aiContent,
            contentId: lectureContent._id
        };

    } catch (error) {
        console.error('Error in analyzePdfFromGCS:', error);
        setProcessingStatus(lectureId, `Error: ${error.message}`, 0);
        throw error;
    }
};

/**
 * Gets the AI-generated content for a lecture
 * @param {string} lectureId - The ID of the lecture in the frontend
 * @param {Object} user - The user object
 * @returns {Promise<Object>} - The AI-generated content
 */
const getLectureContent = async (lectureId, user) => {
    try {
        const content = await LectureContent.findOne({
            lecture_id: lectureId,
            user_id: user._id
        });

        if (!content) {
            throw new Error('Lecture content not found');
        }

        return content;
    } catch (error) {
        console.error('Error in getLectureContent:', error);
        throw error;
    }
};

/**
 * Gets the processing status for a lecture
 * @param {string} lectureId - The ID of the lecture
 * @returns {Object} - The processing status
 */
const getContentProcessingStatus = (lectureId) => {
    return getProcessingStatus(lectureId);
};

module.exports = {
    analyzePdfFromGCS,
    getLectureContent,
    getContentProcessingStatus
}; 