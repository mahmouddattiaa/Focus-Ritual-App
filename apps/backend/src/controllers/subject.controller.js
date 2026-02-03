const Subject = require('../models/subject.model');
const Lecture = require('../models/lecture.model');

// @desc    Get all subjects for a user
// @route   GET /api/subjects
// @access  Private
exports.getSubjects = async (req, res) => {
    try {
        console.log('Getting subjects for user:', req.user._id);
        const subjects = await Subject.find({ user: req.user._id }).populate('lectures');
        console.log('Found subjects:', subjects);
        res.json(subjects);
    } catch (error) {
        console.error('Error getting subjects:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new subject
// @route   POST /api/subjects
// @access  Private
exports.createSubject = async (req, res) => {
    try {
        const { name } = req.body;
        console.log('Creating subject with name:', name, 'for user:', req.user._id);

        const subject = new Subject({
            name,
            user: req.user._id,
            color: req.body.color || '#8884d8'
        });

        const createdSubject = await subject.save();
        console.log('Created subject:', createdSubject);
        res.status(201).json(createdSubject);
    } catch (error) {
        console.error('Error creating subject:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a subject
// @route   PUT /api/subjects/:id
// @access  Private
exports.updateSubject = async (req, res) => {
    try {
        const { name } = req.body;
        const subject = await Subject.findById(req.params.id);

        if (subject) {
            subject.name = name;
            const updatedSubject = await subject.save();
            res.json(updatedSubject);
        } else {
            res.status(404).json({ message: 'Subject not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a subject
// @route   DELETE /api/subjects/:id
// @access  Private
exports.deleteSubject = async (req, res) => {
    try {
        console.log('Deleting subject with ID:', req.params.id);
        const subject = await Subject.findById(req.params.id);

        if (subject) {
            // Use deleteOne instead of remove (which is deprecated)
            await Subject.deleteOne({ _id: req.params.id });

            // Also delete all lectures for this subject
            await Lecture.deleteMany({ subject: req.params.id });

            console.log('Subject and related lectures deleted successfully');
            res.json({ message: 'Subject removed' });
        } else {
            console.log('Subject not found with ID:', req.params.id);
            res.status(404).json({ message: 'Subject not found' });
        }
    } catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new lecture for a subject
// @route   POST /api/subjects/:id/lectures
// @access  Private
exports.createLecture = async (req, res) => {
    try {
        const { title } = req.body;
        const lecture = new Lecture({
            title,
            subject: req.params.id,
            user: req.user._id,
        });
        const createdLecture = await lecture.save();
        res.status(201).json(createdLecture);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a lecture
// @route   PUT /api/lectures/:id
// @access  Private
exports.updateLecture = async (req, res) => {
    try {
        const { title } = req.body;
        const lecture = await Lecture.findById(req.params.id);

        if (lecture) {
            lecture.title = title;
            const updatedLecture = await lecture.save();
            res.json(updatedLecture);
        } else {
            res.status(404).json({ message: 'Lecture not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a lecture
// @route   DELETE /api/lectures/:id
// @access  Private
exports.deleteLecture = async (req, res) => {
    try {
        console.log('Deleting lecture with ID:', req.params.id);
        const lecture = await Lecture.findById(req.params.id);

        if (lecture) {
            // Use deleteOne instead of remove (which is deprecated)
            await Lecture.deleteOne({ _id: req.params.id });

            // Also update the subject to remove this lecture reference
            if (lecture.subject) {
                await Subject.updateOne(
                    { _id: lecture.subject },
                    { $pull: { lectures: req.params.id } }
                );
            }

            console.log('Lecture deleted successfully');
            res.json({ message: 'Lecture removed' });
        } else {
            console.log('Lecture not found with ID:', req.params.id);
            res.status(404).json({ message: 'Lecture not found' });
        }
    } catch (error) {
        console.error('Error deleting lecture:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}; 