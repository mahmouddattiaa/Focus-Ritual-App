const { generateResponse } = require('./gemini.service');
const { gcs } = require('../config/gcs');
const pdf = require('pdf-parse');
const { UploadedFile, LibraryFile } = require('../models/models');
const LectureContent = require('../models/lectureContent.model');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Lecture = require('../models/lecture.model');

// Create a temporary store for tracking processing status
const processingStatus = new Map();

/**
 * Get the processing status for a job
 * @param {string} jobId - The ID of the job
 * @returns {Object} - The processing status
 */
const getJobProcessingStatus = (jobId) => {
    if (!processingStatus.has(jobId)) {
        return { status: 'unknown' };
    }
    return processingStatus.get(jobId);
};

/**
 * Set the processing status for a job
 * @param {string} jobId - The ID of the job
 * @param {string} status - The status message
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} [message] - An optional descriptive message
 * @param {any} [data] - Optional data to associate with the status
 */
const setJobProcessingStatus = (jobId, status, progress = 0, message = '', data = null) => {
    const statusUpdate = { status, progress, message, data, updatedAt: new Date() };
    console.log(`Updating job ${jobId} status:`, statusUpdate);
    processingStatus.set(jobId, statusUpdate);

    // Clean up completed/failed status entries after 1 hour
    if (status === 'completed' || status === 'failed') {
        setTimeout(() => {
            if (processingStatus.has(jobId)) {
                processingStatus.delete(jobId);
            }
        }, 60 * 60 * 1000);
    }
};

/**
 * Processes the PDF in the background.
 */
const processPdfInBackground = async (jobId, fileId, lectureId, subjectId, title, user) => {
    try {
        setJobProcessingStatus(jobId, 'processing', 5, 'Starting analysis...');

        const uploadedFileId = await getUploadedFileId(fileId, user);
        const fileDoc = await UploadedFile.findById(uploadedFileId);

        if (!fileDoc) {
            throw new Error(`File not found in database with ID: ${uploadedFileId}`);
        }
        setJobProcessingStatus(jobId, 'processing', 10, `Found file: ${fileDoc.file_name}`);

        const documentText = await downloadAndParsePdf(jobId, fileDoc);

        setJobProcessingStatus(jobId, 'processing', 40, 'Generating AI content... This may take a moment.');

        const aiContent = await generateAiContentFromText(jobId, title, documentText);

        setJobProcessingStatus(jobId, 'processing', 90, 'Saving content to database...');

        const lectureContent = new LectureContent({
            user_id: user._id,
            file_id: fileId,
            lecture_id: lectureId,
            subject_id: subjectId,
            title: title,
            ...aiContent
        });
        await lectureContent.save();

        // Update the lecture with the content ID
        try {
            if (mongoose.Types.ObjectId.isValid(lectureId)) {
                const lecture = await Lecture.findById(lectureId);
                if (lecture) {
                    lecture.contentId = lectureContent._id;
                    await lecture.save();
                    console.log(`Job ${jobId}: Updated lecture ${lectureId} with content ID ${lectureContent._id}`);
                }
            }
        } catch (lectureError) {
            console.error(`Job ${jobId}: Error updating lecture with content ID:`, lectureError);
            // Continue even if lecture update fails
        }

        setJobProcessingStatus(jobId, 'completed', 100, 'Content generated successfully!', { contentId: lectureContent._id });

    } catch (error) {
        console.error(`Error processing job ${jobId}:`, error);
        setJobProcessingStatus(jobId, 'failed', 0, `Error: ${error.message}`);
    }
};

/**
 * Kicks off the analysis of a PDF from GCS by creating a background job.
 * @param {string} fileId - The ID of the uploaded file in the database
 * @param {string} lectureId - The ID of the lecture in the frontend
 * @param {string} subjectId - The ID of the subject in the frontend
 * @param {string} title - The title of the lecture
 * @param {Object} user - The user object
 * @returns {Promise<{jobId: string}>} - The ID of the created job
 */
const analyzePdfFromGCS = async (fileId, lectureId, subjectId, title, user) => {
    const jobId = uuidv4();
    console.log(`Created job ${jobId} for lecture ${lectureId}`);

    setJobProcessingStatus(jobId, 'queued', 0, 'Your request is in the queue.');

    // Run the actual processing in the background, not awaiting it.
    processPdfInBackground(jobId, fileId, lectureId, subjectId, title, user);

    return { jobId };
};

/**
 * Processes multiple PDFs in the background and combines their content.
 */
const processMultiplePdfsInBackground = async (jobId, fileIds, lectureId, subjectId, title, user) => {
    try {
        setJobProcessingStatus(jobId, 'processing', 5, 'Starting analysis of multiple PDFs...');
        console.log(`Job ${jobId}: Processing multiple PDFs: ${fileIds.join(', ')}`);

        let allDocumentText = '';

        // Process each file and combine their text
        for (let i = 0; i < fileIds.length; i++) {
            const fileId = fileIds[i];
            const fileProgress = 5 + Math.floor((i / fileIds.length) * 35); // Progress from 5% to 40%

            setJobProcessingStatus(jobId, 'processing', fileProgress,
                `Processing PDF ${i + 1} of ${fileIds.length}: ${fileId}`);

            const uploadedFileId = await getUploadedFileId(fileId, user);
            const fileDoc = await UploadedFile.findById(uploadedFileId);

            if (!fileDoc) {
                console.warn(`File not found in database with ID: ${uploadedFileId}, skipping`);
                continue;
            }

            try {
                const documentText = await downloadAndParsePdf(jobId, fileDoc);
                allDocumentText += documentText + '\n\n--- Next Document ---\n\n';
                console.log(`Job ${jobId}: Added ${documentText.length} characters from file ${fileId}`);
            } catch (error) {
                console.error(`Job ${jobId}: Error processing file ${fileId}:`, error);
                // Continue with other files even if one fails
            }
        }

        if (allDocumentText.length === 0) {
            throw new Error('Could not extract text from any of the provided PDFs');
        }

        setJobProcessingStatus(jobId, 'processing', 40, 'Generating AI content from combined documents... This may take a moment.');

        const aiContent = await generateAiContentFromText(jobId, title, allDocumentText);

        setJobProcessingStatus(jobId, 'processing', 90, 'Saving content to database...');

        const lectureContent = new LectureContent({
            user_id: user._id,
            file_ids: fileIds,
            lecture_id: lectureId,
            subject_id: subjectId,
            title: title,
            ...aiContent
        });
        await lectureContent.save();

        // Update the lecture with the content ID
        try {
            if (mongoose.Types.ObjectId.isValid(lectureId)) {
                const lecture = await Lecture.findById(lectureId);
                if (lecture) {
                    lecture.contentId = lectureContent._id;
                    await lecture.save();
                    console.log(`Job ${jobId}: Updated lecture ${lectureId} with content ID ${lectureContent._id}`);
                }
            }
        } catch (lectureError) {
            console.error(`Job ${jobId}: Error updating lecture with content ID:`, lectureError);
            // Continue even if lecture update fails
        }

        setJobProcessingStatus(jobId, 'completed', 100, 'Content generated successfully!', { contentId: lectureContent._id });

    } catch (error) {
        console.error(`Error processing job ${jobId}:`, error);
        setJobProcessingStatus(jobId, 'failed', 0, `Error: ${error.message}`);
    }
};

/**
 * Kicks off the analysis of multiple PDFs from GCS by creating a background job.
 * @param {string[]} fileIds - The IDs of the uploaded files in the database
 * @param {string} lectureId - The ID of the lecture in the frontend
 * @param {string} subjectId - The ID of the subject in the frontend
 * @param {string} title - The title of the lecture
 * @param {Object} user - The user object
 * @returns {Promise<{jobId: string}>} - The ID of the created job
 */
const analyzePdfsFromGCS = async (fileIds, lectureId, subjectId, title, user) => {
    const jobId = uuidv4();
    console.log(`Created job ${jobId} for lecture ${lectureId} with ${fileIds.length} files`);

    setJobProcessingStatus(jobId, 'queued', 0, 'Your request is in the queue.');

    // Run the actual processing in the background, not awaiting it.
    processMultiplePdfsInBackground(jobId, fileIds, lectureId, subjectId, title, user);

    return { jobId };
};

// Helper function to get the actual uploaded file ID
const getUploadedFileId = async (fileId, user) => {
    if (mongoose.Types.ObjectId.isValid(fileId)) {
        const libraryFile = await LibraryFile.findOne({ _id: fileId, user_id: user._id });
        if (libraryFile) {
            console.log(`Found library file with ID ${fileId}, using uploaded file ID ${libraryFile.file_id}`);
            return libraryFile.file_id;
        } else {
            console.log(`No library file found with ID ${fileId}, using it directly as an uploaded file ID`);
            return fileId;
        }
    }
    throw new Error('Invalid file ID format');
};

// Helper function to download a file from GCS and parse text
const downloadAndParsePdf = async (jobId, fileDoc) => {
    setJobProcessingStatus(jobId, 'processing', 15, 'Downloading file from storage...');
    console.log(`Job ${jobId}: Attempting to download file from GCS: ${fileDoc.file_path}`);

    try {
        const gcsFile = gcs.file(fileDoc.file_path);

        // Check if the file exists in GCS
        const [exists] = await gcsFile.exists();
        if (!exists) {
            console.error(`Job ${jobId}: File does not exist in GCS: ${fileDoc.file_path}`);
            throw new Error(`File not found in cloud storage: ${fileDoc.file_path}`);
        }

        console.log(`Job ${jobId}: File exists in GCS, downloading...`);
        const [fileContent] = await gcsFile.download();
        console.log(`Job ${jobId}: Downloaded file from GCS: ${fileDoc.file_path}, size: ${fileContent.length} bytes`);

        setJobProcessingStatus(jobId, 'processing', 25, 'Extracting text from PDF...');
        let documentText = '';
        try {
            console.log(`Job ${jobId}: Starting PDF parsing...`);
            const pdfData = await pdf(fileContent, { max: -1 }); // No character limit
            documentText = pdfData.text;
            console.log(`Job ${jobId}: Extracted ${documentText.length} characters from PDF`);

            if (documentText.length === 0) {
                console.error(`Job ${jobId}: No text extracted from PDF. This might be a scanned document or image-based PDF.`);
                throw new Error('No text could be extracted from the PDF. This might be a scanned document or image-based PDF.');
            }

            // Log a sample of the extracted text for debugging
            console.log(`Job ${jobId}: Sample of extracted text (first 200 chars): ${documentText.substring(0, 200)}`);
        } catch (pdfError) {
            console.error(`Job ${jobId}: Error extracting text from PDF:`, pdfError);
            throw new Error(`Failed to extract text from PDF: ${pdfError.message}. Please check if the file is a valid PDF document.`);
        }
        return documentText;
    } catch (error) {
        console.error(`Job ${jobId}: Error in downloadAndParsePdf:`, error);
        throw error;
    }
};

// Helper function to generate AI content
const generateAiContentFromText = async (jobId, title, documentText) => {
    const MAX_TEXT_LENGTH = 30000;
    if (documentText.length > MAX_TEXT_LENGTH) {
        console.log(`Job ${jobId}: Text is too long (${documentText.length}), truncating to ${MAX_TEXT_LENGTH} characters`);
        documentText = documentText.substring(0, MAX_TEXT_LENGTH);
    }

    const prompt = `
      Based on the following text from a lecture document titled "${title}", please generate a detailed JSON object with the following properties: "summary", "flashcards", "examQuestions", "revision".

      - "summary": A comprehensive summary of the key topics and concepts formatted as an array of bullet points. Each bullet point should be a clear, concise statement about an important concept from the lecture. Include at least 8-10 bullet points.
      - "flashcards": An array of 8-10 objects, where each object has a "question" and "answer" property. Questions should cover main ideas, definitions, and concepts.
      - "examQuestions": An array of 4-5 potential exam questions based on the material, where each item is an object with "question" and "answer" properties.
      - "revision": A structured revision guide with key points, formatted as a string with clear sections and bullet points.

      Here is the document text:
      ---
      ${documentText} 
      ---
      Return only the raw JSON object, without any markdown formatting.
    `;

    setJobProcessingStatus(jobId, 'processing', 60, 'Communicating with AI...');
    const aiResponseString = await generateResponse(prompt);
    setJobProcessingStatus(jobId, 'processing', 80, 'Processing AI response...');

    const cleanedJsonString = aiResponseString.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
        const aiContent = JSON.parse(cleanedJsonString);
        console.log(`Job ${jobId}: Successfully parsed AI response as JSON`);
        return aiContent;
    } catch (jsonError) {
        console.error(`Job ${jobId}: Failed to parse AI response as JSON:`, jsonError);
        throw new Error('The AI returned an invalid response. Please try again.');
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
    return getJobProcessingStatus(lectureId);
};

module.exports = {
    analyzePdfFromGCS,
    analyzePdfsFromGCS,
    getJobProcessingStatus,
    getLectureContent
}; 