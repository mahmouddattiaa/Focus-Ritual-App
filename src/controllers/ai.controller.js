const aiService = require('../services/ai.service');

/**
 * Analyzes a PDF file that has been uploaded to GCS
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.analyzePdf = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { fileId, lectureId, subjectId, title } = req.body;

        if (!fileId || !lectureId || !subjectId || !title) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        console.log(`Analyzing PDF: fileId=${fileId}, lectureId=${lectureId}, subjectId=${subjectId}, title=${title}`);

        const result = await aiService.analyzePdfFromGCS(fileId, lectureId, subjectId, title, req.user);

        res.status(200).json({
            success: true,
            message: 'PDF analyzed successfully',
            ...result
        });
    } catch (error) {
        console.error('Error in analyzePdf controller:', error);
        res.status(500).json({ error: 'Failed to analyze PDF', message: error.message });
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

/**
 * Gets the processing status for a lecture
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getProcessingStatus = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { lectureId } = req.params;

        if (!lectureId) {
            return res.status(400).json({ error: 'Missing lectureId parameter' });
        }

        const status = aiService.getContentProcessingStatus(lectureId);

        res.status(200).json({
            success: true,
            lectureId,
            ...status
        });
    } catch (error) {
        console.error('Error in getProcessingStatus controller:', error);
        res.status(500).json({ error: 'Failed to get processing status', message: error.message });
    }
}; 