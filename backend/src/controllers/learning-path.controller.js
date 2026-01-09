const LearningPath = require('../models/learning-path.model');
const aiService = require('../services/ai.service');
const Lecture = require('../models/lecture.model');

exports.generateLearningPath = async (req, res) => {
    try {
        const { lectureId } = req.params;
        const { userPerformance } = req.body;

        if (!lectureId) {
            return res.status(400).json({ message: 'Lecture ID is required' });
        }

        // Check if a learning path already exists for this lecture
        let learningPath = await LearningPath.findOne({
            userId: req.user._id,
            lectureId
        });

        // Get lecture content for AI analysis
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
            "status": "not-started",
            "priority": "high" | "medium" | "low",
            "resources": [string]
          }
        ]
      }
    `;

        // Call AI service
        const response = await aiService.generateCompletion(prompt);

        // Parse the AI response
        let pathData;
        try {
            pathData = JSON.parse(response);
        } catch (jsonError) {
            console.error('Error parsing AI response as JSON:', jsonError);
            return res.status(500).json({ message: 'Error parsing AI response', error: jsonError.message });
        }

        // Create or update learning path
        if (!learningPath) {
            learningPath = new LearningPath({
                userId: req.user._id,
                lectureId,
                progress: pathData.progress || 0,
                strengths: pathData.strengths || [],
                areasToImprove: pathData.areasToImprove || [],
                topics: pathData.topics || []
            });
        } else {
            learningPath.progress = pathData.progress || learningPath.progress;
            learningPath.strengths = pathData.strengths || learningPath.strengths;
            learningPath.areasToImprove = pathData.areasToImprove || learningPath.areasToImprove;
            learningPath.topics = pathData.topics || learningPath.topics;
            learningPath.updatedAt = Date.now();
        }

        await learningPath.save();

        res.json(learningPath);
    } catch (error) {
        console.error('Error generating learning path:', error);
        res.status(500).json({ message: 'Error generating learning path', error: error.message });
    }
};

exports.getLearningPath = async (req, res) => {
    try {
        const { lectureId } = req.params;

        const learningPath = await LearningPath.findOne({
            userId: req.user._id,
            lectureId
        });

        if (!learningPath) {
            return res.status(404).json({ message: 'Learning path not found' });
        }

        res.json(learningPath);
    } catch (error) {
        console.error('Error getting learning path:', error);
        res.status(500).json({ message: 'Error getting learning path', error: error.message });
    }
};

exports.updateTopicStatus = async (req, res) => {
    try {
        const { lectureId, topicId } = req.params;
        const { status } = req.body;

        if (!status || !['not-started', 'in-progress', 'completed'].includes(status)) {
            return res.status(400).json({ message: 'Valid status is required (not-started, in-progress, or completed)' });
        }

        const learningPath = await LearningPath.findOne({
            userId: req.user._id,
            lectureId
        });

        if (!learningPath) {
            return res.status(404).json({ message: 'Learning path not found' });
        }

        // Find and update the topic
        const topic = learningPath.topics.id(topicId);
        if (!topic) {
            return res.status(404).json({ message: 'Topic not found' });
        }

        topic.status = status;

        // Recalculate progress based on completed topics
        const totalTopics = learningPath.topics.length;
        const completedTopics = learningPath.topics.filter(t => t.status === 'completed').length;
        learningPath.progress = Math.round((completedTopics / totalTopics) * 100);

        learningPath.updatedAt = Date.now();

        await learningPath.save();

        res.json(learningPath);
    } catch (error) {
        console.error('Error updating topic status:', error);
        res.status(500).json({ message: 'Error updating topic status', error: error.message });
    }
}; 