const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Gemini API with the hardcoded key
const geminiApiKey = process.env.GEMINI_API_KEY || 'AIzaSyAdKJp_4Q3Ax62Mn5zc03nt5DZwFk0dJg4';
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Get the generative model - updated to use the correct model name
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

/**
 * Generate a response from Gemini AI
 * @param {string} prompt - The user prompt/question
 * @returns {Promise<string>} - The generated response
 */
const generateResponse = async(prompt) => {
    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();
    } catch (error) {
        console.error('Error generating response from Gemini:', error);
        throw error;
    }
};

/**
 * Generate a response with history/chat context
 * @param {Array} history - Array of previous messages
 * @param {string} prompt - The current user prompt/question
 * @returns {Promise<string>} - The generated response
 */
const generateChatResponse = async(history, prompt) => {
    try {
        const chat = model.startChat({
            history: history.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            })),
        });

        const result = await chat.sendMessage(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Error generating chat response from Gemini:', error);
        throw error;
    }
};

module.exports = {
    generateResponse,
    generateChatResponse
};