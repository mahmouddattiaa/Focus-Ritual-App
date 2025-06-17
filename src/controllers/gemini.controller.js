const { generateResponse, generateChatResponse } = require('../services/gemini.service');

/**
 * Generate a response from Gemini AI
 * @param {Object} req - Express request object with prompt in body
 * @param {Object} res - Express response object
 */
const getGeminiResponse = async(req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                message: 'Prompt is required'
            });
        }

        const response = await generateResponse(prompt);

        return res.status(200).json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('Error in getGeminiResponse controller:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error generating response'
        });
    }
};

/**
 * Generate a chat response from Gemini AI with history
 * @param {Object} req - Express request object with history and prompt in body
 * @param {Object} res - Express response object
 */
const getGeminiChatResponse = async(req, res) => {
    try {
        const { history, prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                message: 'Prompt is required'
            });
        }

        if (!history || !Array.isArray(history)) {
            return res.status(400).json({
                success: false,
                message: 'History must be an array'
            });
        }

        const response = await generateChatResponse(history, prompt);

        return res.status(200).json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('Error in getGeminiChatResponse controller:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error generating chat response'
        });
    }
};

module.exports = {
    getGeminiResponse,
    getGeminiChatResponse
};