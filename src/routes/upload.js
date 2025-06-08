const express = require('express');
const router = express.Router();
const { s3, bucket } = require('../config/wasabi');
const upload = require('../middleware/upload');
const { UploadedFile } = require('../models');
const fs = require('fs').promises;

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user._id;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = await fs.readFile(file.path);
    const key = `uploads/${userId}/${file.filename}`;
    const params = {
      Bucket: bucket,
      Key: key,
      Body: fileContent,
      ContentType: file.mimetype
    };

    await s3.upload(params).promise();

    const filePath = `https://${bucket}.s3.us-east-1.wasabisys.com/${key}`;
    const uploadedFile = new UploadedFile({
      user_id: userId,
      file_name: file.originalname,
      file_path: filePath
    });
    await uploadedFile.save();

    await fs.unlink(file.path);

    res.json({ message: 'File uploaded successfully', file: uploadedFile });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

module.exports = router;