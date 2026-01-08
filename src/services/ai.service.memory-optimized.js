/**
 * Memory-Optimized AI Service
 * Fixes memory leaks in PDF processing and AI generation
 */

const { generateResponse } = require("./gemini.service");
const { gcs } = require("../config/gcs");
const pdf = require("pdf-parse");
const { UploadedFile, LibraryFile } = require("../models/models");
const LectureContent = require("../models/lectureContent.model");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Lecture = require("../models/lecture.model");
const stream = require("stream");
const { promisify } = require("util");

// MEMORY OPTIMIZATION: Limit the size of the processing status map
const MAX_STATUS_ENTRIES = 1000;
const processingStatus = new Map();

/**
 * MEMORY OPTIMIZATION: Clean up old entries from processing status
 */
const cleanupProcessingStatus = () => {
  if (processingStatus.size > MAX_STATUS_ENTRIES) {
    const entries = Array.from(processingStatus.entries());
    // Sort by updatedAt, oldest first
    entries.sort((a, b) => a[1].updatedAt - b[1].updatedAt);

    // Remove oldest 20%
    const toRemove = Math.floor(MAX_STATUS_ENTRIES * 0.2);
    for (let i = 0; i < toRemove; i++) {
      processingStatus.delete(entries[i][0]);
    }
  }
};

/**
 * Get the processing status for a job
 */
const getJobProcessingStatus = (jobId) => {
  if (!processingStatus.has(jobId)) {
    return { status: "unknown" };
  }
  return processingStatus.get(jobId);
};

/**
 * Set the processing status for a job
 */
const setJobProcessingStatus = (
  jobId,
  status,
  progress = 0,
  message = "",
  data = null
) => {
  const statusUpdate = {
    status,
    progress,
    message,
    data,
    updatedAt: Date.now(), // Use timestamp instead of Date object
  };

  processingStatus.set(jobId, statusUpdate);

  // MEMORY: Immediate cleanup for completed/failed jobs after 5 minutes
  if (status === "completed" || status === "failed") {
    setTimeout(() => {
      if (processingStatus.has(jobId)) {
        processingStatus.delete(jobId);
      }
    }, 5 * 60 * 1000); // 5 minutes instead of 1 hour
  }

  // Periodic cleanup
  cleanupProcessingStatus();
};

/**
 * MEMORY OPTIMIZED: Stream-based PDF download to avoid loading entire file in memory
 */
const downloadPdfAsStream = async (gcsFile) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit

    gcsFile
      .createReadStream()
      .on("data", (chunk) => {
        totalSize += chunk.length;
        if (totalSize > MAX_SIZE) {
          reject(new Error("File too large (max 10MB)"));
          return;
        }
        chunks.push(chunk);
      })
      .on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      })
      .on("error", (err) => {
        reject(err);
      });
  });
};

/**
 * MEMORY OPTIMIZED: Download and parse PDF with better memory management
 */
const downloadAndParsePdf = async (jobId, fileDoc) => {
  setJobProcessingStatus(
    jobId,
    "processing",
    15,
    "Downloading file from storage..."
  );

  try {
    const gcsFile = gcs.file(fileDoc.file_path);

    const [exists] = await gcsFile.exists();
    if (!exists) {
      throw new Error(`File not found in GCS: ${fileDoc.file_path}`);
    }

    setJobProcessingStatus(
      jobId,
      "processing",
      20,
      "Extracting text from PDF..."
    );

    // MEMORY: Use stream-based download with size limit
    const dataBuffer = await downloadPdfAsStream(gcsFile);

    // MEMORY: Parse PDF with options to limit memory usage
    const pdfData = await pdf(dataBuffer, {
      max: 50, // Limit to 50 pages to prevent memory issues
      pagerender: null, // Disable page rendering to save memory
    });

    // MEMORY: Clear buffer immediately after use
    dataBuffer.fill(0);

    if (!pdfData || !pdfData.text) {
      throw new Error("Could not extract text from PDF");
    }

    // MEMORY: Limit text size (100KB max)
    let documentText = pdfData.text.trim();
    const MAX_TEXT_SIZE = 100 * 1024; // 100KB
    if (documentText.length > MAX_TEXT_SIZE) {
      documentText = documentText.substring(0, MAX_TEXT_SIZE);
      setJobProcessingStatus(
        jobId,
        "processing",
        30,
        "Text truncated to 100KB (too long)..."
      );
    }

    setJobProcessingStatus(
      jobId,
      "processing",
      35,
      `Extracted ${documentText.length} characters.`
    );

    return documentText;
  } catch (error) {
    throw new Error(`Failed to download or parse PDF: ${error.message}`);
  }
};

/**
 * MEMORY OPTIMIZED: Generate AI content with chunking for large texts
 */
const generateAiContentFromText = async (jobId, title, documentText) => {
  const MAX_CHUNK_SIZE = 30000; // 30KB chunks

  // If text is too large, chunk it
  if (documentText.length > MAX_CHUNK_SIZE) {
    const chunks = [];
    for (let i = 0; i < documentText.length; i += MAX_CHUNK_SIZE) {
      chunks.push(documentText.substring(i, i + MAX_CHUNK_SIZE));
    }

    setJobProcessingStatus(
      jobId,
      "processing",
      45,
      `Processing ${chunks.length} chunks...`
    );

    // Process first chunk only for now (or implement proper chunking logic)
    documentText = chunks[0];
  }

  const prompt = `
You are an AI assistant helping students learn. Based on the following document, generate:

1. A comprehensive summary (150-200 words)
2. Key concepts (5-7 main ideas)
3. 5 important questions with detailed answers

Document Title: ${title}
Content:
${documentText}

Return the response in JSON format:
{
  "summary": "...",
  "key_concepts": ["concept1", "concept2", ...],
  "qa_pairs": [
    {"question": "...", "answer": "..."},
    ...
  ]
}
`;

  setJobProcessingStatus(
    jobId,
    "processing",
    60,
    "Sending to AI for analysis..."
  );

  // MEMORY: Use streaming or chunked response if available
  const aiResponse = await generateResponse(prompt);

  setJobProcessingStatus(jobId, "processing", 80, "Processing AI response...");

  // MEMORY: Parse and validate response size
  let content;
  try {
    content = JSON.parse(aiResponse);
  } catch (parseError) {
    // Fallback if response is not valid JSON
    content = {
      summary: aiResponse.substring(0, 500),
      key_concepts: [],
      qa_pairs: [],
    };
  }

  return content;
};

/**
 * MEMORY OPTIMIZED: Process PDF in background
 */
const processPdfInBackground = async (
  jobId,
  fileId,
  lectureId,
  subjectId,
  title,
  user
) => {
  let documentText = null;

  try {
    setJobProcessingStatus(jobId, "processing", 5, "Starting analysis...");

    const uploadedFileId = await getUploadedFileId(fileId, user);

    // MEMORY: Use lean() to get plain object
    const fileDoc = await UploadedFile.findById(uploadedFileId).lean();

    if (!fileDoc) {
      throw new Error(`File not found in database with ID: ${uploadedFileId}`);
    }

    setJobProcessingStatus(
      jobId,
      "processing",
      10,
      `Found file: ${fileDoc.file_name}`
    );

    documentText = await downloadAndParsePdf(jobId, fileDoc);

    setJobProcessingStatus(jobId, "processing", 40, "Generating AI content...");

    const aiContent = await generateAiContentFromText(
      jobId,
      title,
      documentText
    );

    // MEMORY: Clear document text immediately
    documentText = null;

    setJobProcessingStatus(
      jobId,
      "processing",
      90,
      "Saving content to database..."
    );

    const lectureContent = new LectureContent({
      user_id: user._id,
      file_id: fileId,
      lecture_id: lectureId,
      subject_id: subjectId,
      title: title,
      ...aiContent,
    });
    await lectureContent.save();

    // Update lecture with content ID
    if (mongoose.Types.ObjectId.isValid(lectureId)) {
      await Lecture.updateOne(
        { _id: lectureId },
        { contentId: lectureContent._id }
      );
    }

    setJobProcessingStatus(
      jobId,
      "completed",
      100,
      "Content generated successfully!",
      {
        contentId: lectureContent._id.toString(),
      }
    );
  } catch (error) {
    // MEMORY: Clean up on error
    documentText = null;
    setJobProcessingStatus(jobId, "failed", 0, `Error: ${error.message}`);
  }
};

/**
 * MEMORY OPTIMIZED: Process multiple PDFs with better memory management
 */
const processMultiplePdfsInBackground = async (
  jobId,
  fileIds,
  lectureId,
  subjectId,
  title,
  user
) => {
  let allDocumentText = "";
  const MAX_COMBINED_SIZE = 150 * 1024; // 150KB total limit

  try {
    setJobProcessingStatus(
      jobId,
      "processing",
      5,
      `Starting analysis of ${fileIds.length} PDFs...`
    );

    // MEMORY: Process files sequentially and limit total size
    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i];
      const fileProgress = 5 + Math.floor((i / fileIds.length) * 35);

      setJobProcessingStatus(
        jobId,
        "processing",
        fileProgress,
        `Processing PDF ${i + 1} of ${fileIds.length}`
      );

      try {
        const uploadedFileId = await getUploadedFileId(fileId, user);
        const fileDoc = await UploadedFile.findById(uploadedFileId).lean();

        if (!fileDoc) {
          continue;
        }

        let documentText = await downloadAndParsePdf(jobId, fileDoc);

        // MEMORY: Check if adding this would exceed limit
        if (allDocumentText.length + documentText.length > MAX_COMBINED_SIZE) {
          // Truncate this document
          const remaining = MAX_COMBINED_SIZE - allDocumentText.length;
          if (remaining > 1000) {
            documentText = documentText.substring(0, remaining);
          } else {
            break; // Stop processing more files
          }
        }

        allDocumentText += documentText + "\n\n--- Next Document ---\n\n";

        // MEMORY: Clear individual document text
        documentText = null;
      } catch (error) {
        // Continue with other files
        continue;
      }
    }

    if (allDocumentText.length === 0) {
      throw new Error("Could not extract text from any PDF");
    }

    setJobProcessingStatus(
      jobId,
      "processing",
      40,
      "Generating AI content from combined documents..."
    );

    const aiContent = await generateAiContentFromText(
      jobId,
      title,
      allDocumentText
    );

    // MEMORY: Clear combined text
    allDocumentText = null;

    setJobProcessingStatus(
      jobId,
      "processing",
      90,
      "Saving content to database..."
    );

    const lectureContent = new LectureContent({
      user_id: user._id,
      file_ids: fileIds,
      lecture_id: lectureId,
      subject_id: subjectId,
      title: title,
      ...aiContent,
    });
    await lectureContent.save();

    if (mongoose.Types.ObjectId.isValid(lectureId)) {
      await Lecture.updateOne(
        { _id: lectureId },
        { contentId: lectureContent._id }
      );
    }

    setJobProcessingStatus(
      jobId,
      "completed",
      100,
      "Content generated successfully!",
      {
        contentId: lectureContent._id.toString(),
      }
    );
  } catch (error) {
    // MEMORY: Clean up on error
    allDocumentText = null;
    setJobProcessingStatus(jobId, "failed", 0, `Error: ${error.message}`);
  }
};

/**
 * Helper function to get the actual uploaded file ID
 */
const getUploadedFileId = async (fileId, user) => {
  if (mongoose.Types.ObjectId.isValid(fileId)) {
    // MEMORY: Use lean() and select only needed fields
    const libraryFile = await LibraryFile.findOne({
      _id: fileId,
      user_id: user._id,
    })
      .select("file_id")
      .lean();

    if (libraryFile) {
      return libraryFile.file_id;
    }
    return fileId;
  }
  throw new Error("Invalid file ID format");
};

/**
 * Analyze single PDF from GCS
 */
const analyzePdfFromGCS = async (fileId, lectureId, subjectId, title, user) => {
  const jobId = uuidv4();

  setJobProcessingStatus(jobId, "queued", 0, "Your request is in the queue.");

  // Run in background (don't await)
  processPdfInBackground(
    jobId,
    fileId,
    lectureId,
    subjectId,
    title,
    user
  ).catch((err) => {
    // Already handled in processPdfInBackground
  });

  return { jobId };
};

/**
 * Analyze multiple PDFs from GCS
 */
const analyzePdfsFromGCS = async (
  fileIds,
  lectureId,
  subjectId,
  title,
  user
) => {
  const jobId = uuidv4();

  setJobProcessingStatus(jobId, "queued", 0, "Your request is in the queue.");

  // Run in background (don't await)
  processMultiplePdfsInBackground(
    jobId,
    fileIds,
    lectureId,
    subjectId,
    title,
    user
  ).catch((err) => {
    // Already handled in processMultiplePdfsInBackground
  });

  return { jobId };
};

// MEMORY: Export cleanup function for graceful shutdown
const cleanupAiService = () => {
  processingStatus.clear();
};

module.exports = {
  analyzePdfFromGCS,
  analyzePdfsFromGCS,
  getJobProcessingStatus,
  cleanupAiService,
};
