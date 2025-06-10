const express = require('express');
const router = express.Router();
const { s3, bucket } = require('../config/wasabi');
const upload = require('../middleware/upload');
const { UploadedFile, LibraryFile } = require('../models/models');
const fs = require('fs').promises;
const passport = require('passport');
const path = require('path');
const mongoose = require('mongoose');

// Debug middleware to log request body
router.use((req, res, next) => {
    console.log(`[UPLOAD ROUTE] ${req.method} ${req.url}`);
    if (req.body && !req.body.file) {
        console.log('Request body:', req.body);
    }
    next();
});

router.post('/upload', passport.authenticate('jwt', { session: false }), upload.single('file'), async(req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = req.user._id;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('File uploaded to:', file.path);
        console.log('File info:', {
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype
        });
        console.log('Request body:', req.body);

        try {
            // Get folder ID and path from request body
            const folderId = req.body.parentId === 'root' || !req.body.parentId ? null : req.body.parentId;
            const folderPath = req.body.path || '/';

            console.log(`Saving file with parentId: ${folderId}, path: ${folderPath}`);

            // Verify the file exists
            await fs.access(file.path);
            console.log('File exists and is accessible');

            const fileContent = await fs.readFile(file.path);
            console.log('File read successfully, size:', fileContent.length);

            const folderName = req.body.folderName || 'default_library'; // Get folder name from request body, default to 'default_library'
            const key = `library/${userId}/${folderName}/${file.filename}`;
            const params = {
                Bucket: bucket,
                Key: key,
                Body: fileContent,
                ContentType: file.mimetype
            };

            await s3.upload(params).promise();
            console.log('File uploaded to Wasabi');

            const filePath = `https://${bucket}.s3.us-east-1.wasabisys.com/${key}`;
            const uploadedFile = new UploadedFile({
                user_id: userId,
                file_name: file.originalname,
                file_path: filePath
            });
            await uploadedFile.save();
            console.log('File metadata saved to database with ID:', uploadedFile._id);

            // Create a library file entry to associate with the uploaded file
            let libraryFile;
            try {
                libraryFile = new LibraryFile({
                    user_id: userId,
                    file_id: uploadedFile._id,
                    name: file.originalname,
                    folder_id: folderId && mongoose.Types.ObjectId.isValid(folderId) ? folderId : null,
                    path: folderPath,
                    size: file.size,
                    content_type: file.mimetype
                });
                await libraryFile.save();
                console.log('Library file entry created with ID:', libraryFile._id);
            } catch (dbError) {
                console.error('Error creating library file entry:', dbError);
                // Continue even if library integration fails
            }

            // Try to delete the file, but don't fail if it doesn't work
            try {
                await fs.unlink(file.path);
                console.log('Temporary file deleted');
            } catch (unlinkError) {
                console.error('Warning: Could not delete temporary file:', unlinkError);
            }

            const responseData = {
                success: true,
                message: 'File uploaded successfully',
                id: libraryFile ? libraryFile._id : uploadedFile._id,
                name: file.originalname,
                size: file.size,
                contentType: file.mimetype
            };

            console.log('Sending response:', responseData);
            res.json(responseData);
        } catch (fileError) {
            console.error('File operation error:', fileError);
            res.status(500).json({
                error: 'Failed to process file',
                details: fileError.message,
                path: file.path
            });
        }
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

router.get('/file/:id', passport.authenticate('jwt', { session: false }), async(req, res) => {
    try {
        // First check if this is a library file ID
        let fileId = req.params.id;
        let uploadedFileId = fileId;

        // Check if this is a library file ID
        if (mongoose.Types.ObjectId.isValid(fileId)) {
            const libraryFile = await LibraryFile.findOne({ _id: fileId, user_id: req.user._id });

            if (libraryFile) {
                // If it's a library file, get the actual uploaded file ID
                uploadedFileId = libraryFile.file_id;
            }
        }

        // Now get the actual file
        const file = await UploadedFile.findById(uploadedFileId);
        if (!file || file.user_id.toString() !== req.user._id.toString()) {
            return res.status(404).json({ error: 'File not found or unauthorized' });
        }

        try {
            // Extract key from the file path
            const fileUrl = new URL(file.file_path);
            const key = fileUrl.pathname.substring(1); // Remove the leading slash

            console.log('Attempting to retrieve file with key:', key);

            const params = {
                Bucket: bucket,
                Key: key
            };

            const headParams = {
                Bucket: bucket,
                Key: key
            };

            // First check if the file exists in S3
            try {
                await s3.headObject(headParams).promise();
                console.log('File exists in Wasabi');
            } catch (headErr) {
                console.error('Error checking if file exists in Wasabi:', headErr);
                return res.status(404).json({ error: 'File not found in storage' });
            }

            // Get the file from S3
            const fileStream = s3.getObject(params).createReadStream();
            res.setHeader('Content-Type', file.mimetype || 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);

            fileStream.on('error', (err) => {
                console.error('Error streaming file from Wasabi:', err);
                // Only send error if headers haven't been sent yet
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to stream file' });
                }
            });

            fileStream.pipe(res);
        } catch (storageError) {
            console.error('Storage operation error:', storageError);
            res.status(500).json({
                error: 'Failed to retrieve file from storage',
                details: storageError.message
            });
        }
    } catch (err) {
        console.error('Error retrieving file metadata:', err);
        res.status(500).json({ error: 'Failed to retrieve file metadata' });
    }
});

router.get('/files', passport.authenticate('jwt', { session: false }), async(req, res) => {
    try {
        const userId = req.user._id;
        const files = await UploadedFile.find({ user_id: userId });
        res.json(files);
    } catch (err) {
        console.error('Error fetching files:', err);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});

module.exports = router;