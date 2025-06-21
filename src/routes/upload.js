const express = require('express');
const router = express.Router();
const { gcs, bucket, getSignedUrl } = require('../config/gcs');
const upload = require('../middleware/upload');
const { UploadedFile, LibraryFile } = require('../models/models');
const fs = require('fs').promises;
const passport = require('passport');
const path = require('path');
const mongoose = require('mongoose');

// Helper function to get file download URL (now using async/await)
const getFileDownloadUrl = async(key) => {
    if (!key) return null;
    return await getSignedUrl(key);
};

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

        // Upload to Google Cloud Storage
        const gcsFile = gcs.file(key);
        await gcsFile.save(fileContent, {
            contentType: file.mimetype,
            metadata: {
                contentType: file.mimetype
            }
        });
        console.log('File uploaded to Google Cloud Storage');

        // Store only the GCS key in the database
        const uploadedFile = new UploadedFile({
            user_id: userId,
            file_name: file.originalname,
            file_path: key // store the GCS key, not the public URL
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

        // Return the pre-signed download URL
        const downloadUrl = await getFileDownloadUrl(key);
        const responseData = {
            success: true,
            message: 'File uploaded successfully',
            id: libraryFile ? libraryFile._id : uploadedFile._id,
            name: file.originalname,
            size: file.size,
            contentType: file.mimetype,
            file: {
                _id: uploadedFile._id,
                user_id: uploadedFile.user_id,
                file_name: uploadedFile.file_name,
                file_path: uploadedFile.file_path,
                downloadUrl
            }
        };
        console.log('Sending response:', responseData);
        res.json(responseData);
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Failed to upload file', details: err.message });
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
            const key = file.file_path;
            console.log('Attempting to retrieve file with key:', key);

            // Check if file exists in GCS
            try {
                const [exists] = await gcs.file(key).exists();
                if (!exists) {
                    console.error('File does not exist in Google Cloud Storage');
                    return res.status(404).json({ error: 'File not found in storage' });
                }
                console.log('File exists in Google Cloud Storage');
            } catch (checkErr) {
                console.error('Error checking if file exists in GCS:', checkErr);
                return res.status(404).json({ error: 'File not found in storage' });
            }

            // Stream the file from GCS
            const fileStream = gcs.file(key).createReadStream();
            res.setHeader('Content-Type', file.mimetype || 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);

            fileStream.on('error', (err) => {
                console.error('Error streaming file from Google Cloud Storage:', err);
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

router.post('/collaboration-upload', passport.authenticate('jwt', { session: false }), upload.single('file'), async(req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = req.user._id;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('Collaboration file uploaded to:', file.path);
        console.log('File info:', {
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype
        });

        // Required fields for collaboration
        const { roomCode } = req.body;
        if (!roomCode) {
            return res.status(400).json({ error: 'Room code is required' });
        }

        // Verify the file exists
        await fs.access(file.path);
        console.log('File exists and is accessible');

        const fileContent = await fs.readFile(file.path);
        console.log('File read successfully, size:', fileContent.length);

        // Upload to Google Cloud Storage in a collaboration folder
        const key = `collaboration/${roomCode}/${Date.now()}-${file.originalname}`;

        // Upload to Google Cloud Storage
        const gcsFile = gcs.file(key);
        await gcsFile.save(fileContent, {
            contentType: file.mimetype,
            metadata: {
                contentType: file.mimetype
            }
        });
        console.log('File uploaded to Google Cloud Storage');

        // Store only the GCS key in the database
        const uploadedFile = new UploadedFile({
            user_id: userId,
            file_name: file.originalname,
            file_path: key // store the GCS key, not the public URL
        });
        await uploadedFile.save();
        console.log('File metadata saved to database with ID:', uploadedFile._id);

        // Try to delete the file, but don't fail if it doesn't work
        try {
            await fs.unlink(file.path);
            console.log('Temporary file deleted');
        } catch (unlinkError) {
            console.error('Warning: Could not delete temporary file:', unlinkError);
        }

        // Return the pre-signed download URL
        const downloadUrl = await getFileDownloadUrl(key);

        // Determine file type
        let fileType = 'other';
        if (file.mimetype.includes('pdf')) fileType = 'pdf';
        else if (file.mimetype.includes('image')) fileType = 'image';
        else if (file.mimetype.includes('video')) fileType = 'video';

        const responseData = {
            success: true,
            message: 'File uploaded successfully',
            id: uploadedFile._id.toString(),
            name: file.originalname,
            type: fileType,
            size: formatFileSize(file.size),
            date: new Date().toLocaleDateString(),
            downloadUrl,
            user: {
                id: userId.toString(),
                name: `${req.user.firstName} ${req.user.lastName}`,
                avatar: req.user.profilePicture || `https://i.pravatar.cc/40?u=${userId}`
            }
        };

        console.log('Sending collaboration file response:', responseData);
        res.json(responseData);
    } catch (err) {
        console.error('Collaboration upload error:', err);
        res.status(500).json({ error: 'Failed to upload file', details: err.message });
    }
});

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
}

module.exports = router;