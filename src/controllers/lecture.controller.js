const Lecture = require('../models/lecture.model');
const Subject = require('../models/subject.model');
const LectureContent = require('../models/lectureContent.model');
const { UploadedFile } = require('../models/models');
const { gcs } = require('../config/gcs');

exports.createLecture = async (req, res) => {
    try {
        const { title } = req.body;
        const { subjectId } = req.params;

        const newLecture = new Lecture({
            title,
            subject: subjectId,
            user: req.user._id,
        });

        await newLecture.save();

        const subject = await Subject.findById(subjectId);
        if (subject) {
            subject.lectures.push(newLecture._id);
            await subject.save();
        }

        // Return the newly created lecture object, allowing virtuals to be applied
        res.status(201).json(newLecture.toObject());

    } catch (error) {
        console.error('Error creating lecture:', error);
        res.status(500).json({ error: 'Failed to create lecture', message: error.message });
    }
};

// Delete a lecture and its associated files and content
exports.deleteLecture = async (req, res) => {
    try {
        const lectureId = req.params.id;
        const userId = req.user._id;

        console.log(`Attempting to delete lecture with ID: ${lectureId} for user: ${userId}`);

        // Find the lecture
        const lecture = await Lecture.findOne({
            _id: lectureId,
            user: userId
        });

        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        // Find associated lecture content
        const lectureContent = await LectureContent.findOne({
            lecture_id: lectureId,
            user_id: userId
        });

        // If there's associated content, delete the file from cloud storage
        if (lectureContent && lectureContent.file_id) {
            try {
                // Find the file in the database
                const file = await UploadedFile.findOne({
                    _id: lectureContent.file_id
                });

                if (file) {
                    // Delete from cloud storage
                    try {
                        const gcsFile = gcs.file(file.file_path);
                        await gcsFile.delete();
                        console.log(`Deleted file from GCS: ${file.file_path}`);
                    } catch (gcsError) {
                        console.error('Error deleting file from GCS:', gcsError);
                        // Continue with deletion even if GCS deletion fails
                    }

                    // Delete file record from database
                    await UploadedFile.deleteOne({ _id: file._id });
                    console.log(`Deleted file metadata from database with ID: ${file._id}`);
                }
            } catch (fileError) {
                console.error('Error handling file deletion:', fileError);
                // Continue with lecture deletion even if file deletion fails
            }

            // Delete lecture content
            await LectureContent.deleteOne({ _id: lectureContent._id });
            console.log(`Deleted lecture content with ID: ${lectureContent._id}`);
        }

        // Remove lecture reference from subject
        if (lecture.subject) {
            await Subject.updateOne(
                { _id: lecture.subject },
                { $pull: { lectures: lectureId } }
            );
            console.log(`Removed lecture reference from subject: ${lecture.subject}`);
        }

        // Delete the lecture
        await Lecture.deleteOne({ _id: lectureId });
        console.log(`Deleted lecture with ID: ${lectureId}`);

        res.status(200).json({
            success: true,
            message: 'Lecture and associated resources deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteLecture controller:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete lecture',
            error: error.message
        });
    }
}; 