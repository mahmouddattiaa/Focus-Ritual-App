const aiService = require('../services/ai.service');

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

        const { fileId, lectureId, subjectId, title } = req.body;

        const missingParams = [];
        if (!fileId) missingParams.push('fileId');
        if (!lectureId) missingParams.push('lectureId');
        if (!subjectId) missingParams.push('subjectId');
        if (!title) missingParams.push('title');

        if (missingParams.length > 0) {
            return res.status(400).json({
                error: 'Missing required parameters',
                missingParams
            });
        }

        const { jobId } = await aiService.analyzePdfFromGCS(fileId, lectureId, subjectId, title, req.user);

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