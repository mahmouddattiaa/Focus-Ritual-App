const aiService = require('../services/ai.service');
const File = require('../models/file.model'); // Added for documentQA
const Lecture = require('../models/lecture.model'); // Added for generateLearningPath

/**
 * Kicks off PDF analysis and returns a job ID.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.analyzePdf = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { fileId, fileIds, lectureId, subjectId, title } = req.body;

        // Handle both single fileId and array of fileIds
        const filesToProcess = fileIds || (fileId ? [fileId] : []);

        const missingParams = [];
        if (filesToProcess.length === 0) missingParams.push('fileId or fileIds');
        if (!lectureId) missingParams.push('lectureId');
        if (!subjectId) missingParams.push('subjectId');
        if (!title) missingParams.push('title');

        if (missingParams.length > 0) {
            return res.status(400).json({
                error: 'Missing required parameters',
                missingParams
            });
        }

        const { jobId } = await aiService.analyzePdfsFromGCS(filesToProcess, lectureId, subjectId, title, req.user);

        res.status(202).json({
            success: true,
            message: 'PDF analysis has been started.',
            jobId
        });
    } catch (error) {
        console.error('Error in analyzePdf controller:', error);
        res.status(500).json({ error: 'Failed to start PDF analysis', message: error.message });
    }
};

/**
 * Gets the processing status for a job.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getJobStatus = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { jobId } = req.params;
        if (!jobId) {
            return res.status(400).json({ error: 'Missing jobId parameter' });
        }

        const status = aiService.getJobProcessingStatus(jobId);
        res.status(200).json({ success: true, jobId, ...status });
    } catch (error) {
        console.error('Error in getJobStatus controller:', error);
        res.status(500).json({ error: 'Failed to get job status', message: error.message });
    }
};

/**
 * Gets the AI-generated content for a lecture
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getLectureContent = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { lectureId } = req.params;

        if (!lectureId) {
            return res.status(400).json({ error: 'Missing lectureId parameter' });
        }

        const content = await aiService.getLectureContent(lectureId, req.user);

        res.status(200).json(content);
    } catch (error) {
        console.error('Error in getLectureContent controller:', error);
        res.status(500).json({ error: 'Failed to get lecture content', message: error.message });
    }
};

// Add new controller methods for advanced features
exports.documentQA = async (req, res) => {
    try {
        const { fileId, question } = req.body;

        if (!fileId || !question) {
            return res.status(400).json({ message: 'File ID and question are required' });
        }

        // Get the file content
        const file = await File.findById(fileId);
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Generate prompt for the AI
        const prompt = `
      Based on the following document content, please answer the question accurately and concisely.
      If the answer is not in the document, please state that clearly.
      
      Document content: ${file.content}
      
      Question: ${question}
    `;

        // Call AI service
        const response = await aiService.generateCompletion(prompt);

        return res.json({
            answer: response.trim(),
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error in document Q&A:', error);
        return res.status(500).json({ message: 'Error processing document Q&A', error: error.message });
    }
};

exports.generateFlashcards = async (req, res) => {
    try {
        const { content, count = 10 } = req.body;

        if (!content) {
            return res.status(400).json({ message: 'Content is required' });
        }

        // Generate prompt for the AI
        const prompt = `
      Based on the following content, generate ${count} flashcards in JSON format.
      Each flashcard should have a "front" (question) and "back" (answer) property.
      Focus on key concepts, definitions, and important details.
      Make the questions challenging but clear, and keep answers concise.
      
      Content: ${content}
      
      Return ONLY a valid JSON array of flashcards without any additional text.
    `;

        // Call AI service
        const response = await aiService.generateCompletion(prompt);

        // Parse the JSON response
        try {
            const flashcards = JSON.parse(response);
            return res.json(flashcards);
        } catch (jsonError) {
            console.error('Error parsing AI response as JSON:', jsonError);
            return res.status(500).json({ message: 'Error parsing AI response', error: jsonError.message });
        }
    } catch (error) {
        console.error('Error generating flashcards:', error);
        return res.status(500).json({ message: 'Error generating flashcards', error: error.message });
    }
};

exports.generateLearningPath = async (req, res) => {
    try {
        const { lectureId, userPerformance } = req.body;

        if (!lectureId) {
            return res.status(400).json({ message: 'Lecture ID is required' });
        }

        // Get the lecture content
        const lecture = await Lecture.findById(lectureId).populate('contentId');
        if (!lecture || !lecture.contentId) {
            return res.status(404).json({ message: 'Lecture content not found' });
        }

        const content = lecture.contentId;

        // Generate prompt for the AI
        const prompt = `
      Based on the following lecture content and user performance data, generate a personalized learning path.
      The learning path should identify strengths, areas for improvement, and suggest specific topics to focus on.
      
      Lecture content:
      Summary: ${content.summary}
      
      User performance: ${JSON.stringify(userPerformance || {})}
      
      Return a JSON object with the following structure:
      {
        "progress": number (0-100),
        "strengths": [string],
        "areasToImprove": [string],
        "topics": [
          {
            "title": string,
            "status": "not-started" | "in-progress" | "completed",
            "priority": "high" | "medium" | "low",
            "resources": [string]
          }
        ]
      }
    `;

        // Call AI service
        const response = await aiService.generateCompletion(prompt);

        // Parse the JSON response
        try {
            const learningPath = JSON.parse(response);
            return res.json(learningPath);
        } catch (jsonError) {
            console.error('Error parsing AI response as JSON:', jsonError);
            return res.status(500).json({ message: 'Error parsing AI response', error: jsonError.message });
        }
    } catch (error) {
        console.error('Error generating learning path:', error);
        return res.status(500).json({ message: 'Error generating learning path', error: error.message });
    }
};

exports.analyzeNotes = async (req, res) => {
    try {
        const { notes } = req.body;

        if (!notes) {
            return res.status(400).json({ message: 'Notes content is required' });
        }

        // Generate prompt for the AI
        const prompt = `
      Analyze the following notes and provide insights, suggestions for improvement, and key concepts identified.
      
      Notes: ${notes}
      
      Return a JSON object with the following structure:
      {
        "keyConcepts": [string],
        "suggestions": [string],
        "connections": [string],
        "tags": [string]
      }
    `;

        // Call AI service
        const response = await aiService.generateCompletion(prompt);

        // Parse the JSON response
        try {
            const analysis = JSON.parse(response);
            return res.json(analysis);
        } catch (jsonError) {
            console.error('Error parsing AI response as JSON:', jsonError);
            return res.status(500).json({ message: 'Error parsing AI response', error: jsonError.message });
        }
    } catch (error) {
        console.error('Error analyzing notes:', error);
        return res.status(500).json({ message: 'Error analyzing notes', error: error.message });
    }
};

// Handle AI chat messages
exports.handleChatMessage = async (req, res) => {
    try {
        const { lectureId, message, lectureContent } = req.body;

        if (!lectureId || !message) {
            return res.status(400).json({ message: 'Lecture ID and message are required' });
        }

        // Get lecture content if not provided
        let content = lectureContent;
        if (!content) {
            try {
                const Lecture = require('../models/lecture.model');
                const LectureContent = require('../models/lectureContent.model');

                // Find the lecture
                const lecture = await Lecture.findById(lectureId);
                if (!lecture) {
                    return res.status(404).json({ message: 'Lecture not found' });
                }

                // Find the lecture content
                const lectureContent = await LectureContent.findOne({ lectureId });
                if (lectureContent) {
                    content = {
                        summary: lectureContent.summary,
                        flashcards: lectureContent.flashcards,
                        examQuestions: lectureContent.examQuestions,
                        revision: lectureContent.revision,
                        title: lecture.title
                    };
                } else {
                    content = { title: lecture.title };
                }
            } catch (error) {
                console.error('Error fetching lecture content:', error);
                // Continue with limited context if content fetch fails
            }
        }

        // Process the message and generate a response based on the content
        let response;

        // Use AI service if available, otherwise generate a contextual response
        try {
            // Check if we have the AI service configured
            if (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
                const aiService = require('../services/ai.service');

                // Use the enhanced chat response function with user's specific question
                console.log('Sending message to AI service:', message);

                // Enhance the content with instructions to directly answer the question
                if (content) {
                    content.instructions = "Answer the user's question directly based on the lecture content. If the answer isn't in the content, say so clearly. Don't just provide general information unless specifically asked.";
                }

                response = await aiService.generateChatResponse(message, content);
            } else {
                // Fallback to rule-based responses with improved context handling
                response = generateRuleBasedResponse(message, content);
            }
        } catch (aiError) {
            console.error('Error using AI service:', aiError);
            // Fallback to rule-based responses
            response = generateRuleBasedResponse(message, content);
        }

        res.json({ response });
    } catch (error) {
        console.error('Error handling chat message:', error);
        res.status(500).json({ message: 'Error processing chat message', error: error.message });
    }
};

// Generate a rule-based response when AI service is not available
function generateRuleBasedResponse(message, content) {
    const lowerMessage = message.toLowerCase();

    // If we don't have content, return a generic response
    if (!content || Object.keys(content).length === 0) {
        return "I don't have enough information about this lecture to answer your question.";
    }

    // Extract lecture title
    const title = content.title || 'this lecture';

    // Check for specific question types
    if (lowerMessage.includes('summary') || lowerMessage.includes('overview') || lowerMessage.includes('about')) {
        if (content.summary) {
            if (Array.isArray(content.summary)) {
                return `Here's a summary of ${title}: ${content.summary.slice(0, 3).join(' ')}`;
            } else {
                return `Here's a summary of ${title}: ${content.summary.substring(0, 300)}...`;
            }
        } else {
            return `I don't have a summary for ${title}.`;
        }
    }

    if (lowerMessage.includes('flashcard') || lowerMessage.includes('card')) {
        if (content.flashcards && content.flashcards.length > 0) {
            const randomCard = content.flashcards[Math.floor(Math.random() * content.flashcards.length)];
            return `Here's a flashcard from ${title}: \nQuestion: ${randomCard.question}\nAnswer: ${randomCard.answer}`;
        } else {
            return `I don't have any flashcards for ${title}.`;
        }
    }

    if (lowerMessage.includes('exam') || lowerMessage.includes('question') || lowerMessage.includes('test')) {
        if (content.examQuestions && content.examQuestions.length > 0) {
            const randomQuestion = content.examQuestions[Math.floor(Math.random() * content.examQuestions.length)];
            return `Here's a potential exam question from ${title}: \nQuestion: ${randomQuestion.question}\nSuggested answer: ${randomQuestion.answer}`;
        } else {
            return `I don't have any exam questions for ${title}.`;
        }
    }

    if (lowerMessage.includes('revision') || lowerMessage.includes('review')) {
        if (content.revision) {
            return `Here's some revision material for ${title}: ${content.revision.substring(0, 300)}...`;
        } else {
            return `I don't have revision material for ${title}.`;
        }
    }

    // Default response
    return `I'm here to help you with ${title}. You can ask me about the summary, flashcards, exam questions, or revision material.`;
} 