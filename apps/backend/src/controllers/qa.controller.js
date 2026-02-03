const QASession = require('../models/qa-session.model');
const aiService = require('../services/ai.service');
const File = require('../models/file.model');

exports.createSession = async (req, res) => {
    try {
        const { lectureId, fileId } = req.body;

        if (!lectureId) {
            return res.status(400).json({ message: 'Lecture ID is required' });
        }

        const session = new QASession({
            messages: [],
            userId: req.user._id,
            lectureId,
            fileId
        });

        await session.save();

        res.status(201).json(session);
    } catch (error) {
        console.error('Error creating Q&A session:', error);
        res.status(500).json({ message: 'Error creating Q&A session', error: error.message });
    }
};

exports.getSessionsByLecture = async (req, res) => {
    try {
        const { lectureId } = req.params;

        const sessions = await QASession.find({
            userId: req.user._id,
            lectureId
        }).sort({ updatedAt: -1 });

        res.json(sessions);
    } catch (error) {
        console.error('Error getting Q&A sessions:', error);
        res.status(500).json({ message: 'Error getting Q&A sessions', error: error.message });
    }
};

exports.getSessionById = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await QASession.findOne({
            _id: sessionId,
            userId: req.user._id
        });

        if (!session) {
            return res.status(404).json({ message: 'Q&A session not found' });
        }

        res.json(session);
    } catch (error) {
        console.error('Error getting Q&A session:', error);
        res.status(500).json({ message: 'Error getting Q&A session', error: error.message });
    }
};

exports.askQuestion = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({ message: 'Question is required' });
        }

        const session = await QASession.findOne({
            _id: sessionId,
            userId: req.user._id
        });

        if (!session) {
            return res.status(404).json({ message: 'Q&A session not found' });
        }

        // Add user's question to the messages
        const userMessage = {
            role: 'user',
            content: question,
            timestamp: new Date()
        };

        session.messages.push(userMessage);
        session.updatedAt = Date.now();

        // Get file content if available
        let fileContent = '';
        if (session.fileId) {
            const file = await File.findById(session.fileId);
            if (file) {
                fileContent = file.content;
            }
        }

        // Generate AI response
        const prompt = `
      You are an AI assistant helping with questions about a document.
      ${fileContent ? 'Here is the document content:' : 'I don\'t have the document content, but I\'ll try to help based on your question.'}
      
      ${fileContent || ''}
      
      Previous conversation:
      ${session.messages.slice(0, -1).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n')}
      
      User's question: ${question}
      
      Please provide a helpful, accurate, and concise answer based on the document content.
      If the answer is not in the document, please state that clearly.
    `;

        const aiResponse = await aiService.generateCompletion(prompt);

        // Add AI's response to the messages
        const assistantMessage = {
            role: 'assistant',
            content: aiResponse.trim(),
            timestamp: new Date()
        };

        session.messages.push(assistantMessage);

        await session.save();

        res.json(assistantMessage);
    } catch (error) {
        console.error('Error asking question:', error);
        res.status(500).json({ message: 'Error asking question', error: error.message });
    }
};

exports.deleteSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await QASession.findOneAndDelete({
            _id: sessionId,
            userId: req.user._id
        });

        if (!session) {
            return res.status(404).json({ message: 'Q&A session not found' });
        }

        res.json({ message: 'Q&A session deleted successfully' });
    } catch (error) {
        console.error('Error deleting Q&A session:', error);
        res.status(500).json({ message: 'Error deleting Q&A session', error: error.message });
    }
}; 