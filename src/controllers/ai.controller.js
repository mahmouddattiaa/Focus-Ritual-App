const aiService = require('../services/ai.service');

/**
 * Analyzes a PDF file that has been uploaded to GCS
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.analyzePdf = async (req, res) => {
    try {
        console.log('Received analyze-pdf request with body:', JSON.stringify(req.body));

        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { fileId, lectureId, subjectId, title } = req.body;

        // Check each parameter individually and provide specific error messages
        const missingParams = [];
        if (!fileId) missingParams.push('fileId');
        if (!lectureId) missingParams.push('lectureId');
        if (!subjectId) missingParams.push('subjectId');
        if (!title) missingParams.push('title');

        if (missingParams.length > 0) {
            console.error(`Missing parameters: ${missingParams.join(', ')}`);
            return res.status(400).json({
                error: 'Missing required parameters',
                missingParams: missingParams
            });
        }

        console.log(`Analyzing PDF: fileId=${fileId}, lectureId=${lectureId}, subjectId=${subjectId}, title=${title}`);

        try {
            const result = await aiService.analyzePdfFromGCS(fileId, lectureId, subjectId, title, req.user);

            res.status(200).json({
                success: true,
                message: 'PDF analyzed successfully',
                ...result
            });
        } catch (serviceError) {
            console.error('Error in AI service:', serviceError);
            res.status(500).json({
                error: 'Failed to analyze PDF',
                message: serviceError.message,
                details: 'Error occurred in the AI service'
            });
        }
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