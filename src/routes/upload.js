const express = require('express');
const router = express.Router();
const { s3, bucket } = require('../config/wasabi');
const upload = require('../middleware/upload');
const { UploadedFile } = require('../models/models');
const fs = require('fs').promises;
const passport = require('passport');
const path = require('path');

const getFileDownloadUrl = (key) => {
  if (!key) return null;
  const params = {
    Bucket: bucket,
    Key: key,
    Expires: 60 * 60 * 24 // 1 day in seconds
  };
  return s3.getSignedUrl('getObject', params);
};

router.post('/upload', passport.authenticate('jwt', {session: false}), upload.single('file'), async (req, res) => {
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
    
    try {
      // Verify the file exists
      await fs.access(file.path);
      console.log('File exists and is accessible');
      
      const fileContent = await fs.readFile(file.path);
      console.log('File read successfully, size:', fileContent.length);
      
      const key = `uploads/${userId}/${file.filename}`;
      const params = {
        Bucket: bucket,
        Key: key,
        Body: fileContent,
        ContentType: file.mimetype
      };

      await s3.upload(params).promise();
      console.log('File uploaded to Wasabi');

      // Store only the S3 key in the database
      const uploadedFile = new UploadedFile({
        user_id: userId,
        file_name: file.originalname,
        file_path: key // store the S3 key, not the public URL
      });
      await uploadedFile.save();
      console.log('File metadata saved to database');

      // Try to delete the file, but don't fail if it doesn't work
      try {
        await fs.unlink(file.path);
        console.log('Temporary file deleted');
      } catch (unlinkError) {
        console.error('Warning: Could not delete temporary file:', unlinkError);
      }

      // Return the pre-signed download URL
      const downloadUrl = getFileDownloadUrl(key);
      res.json({ message: 'File uploaded successfully', file: {
        _id: uploadedFile._id,
        user_id: uploadedFile.user_id,
        file_name: uploadedFile.file_name,
        file_path: uploadedFile.file_path,
        downloadUrl
      }});
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

router.get('/file/:id', passport.authenticate('jwt', {session: false}), async (req, res) => {
  try {
    const file = await UploadedFile.findById(req.params.id);
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
      res.setHeader('Content-Disposition', `inline; filename="${file.file_name}"`);
      
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

router.get('/files', passport.authenticate('jwt', {session: false}), async (req, res) => {
  try {
    const userId = req.user._id;
    const files = await UploadedFile.find({ user_id: userId });
    // Attach pre-signed download URLs
    const filesWithUrls = files.map(file => ({
      _id: file._id,
      user_id: file.user_id,
      file_name: file.file_name,
      file_path: file.file_path,
      downloadUrl: getFileDownloadUrl(file.file_path)
    }));
    res.json(filesWithUrls);
  } catch (err) {
    console.error('Error fetching files:', err);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

module.exports = router;