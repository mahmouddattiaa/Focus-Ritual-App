const express = require('express');
const passport = require('passport');
const router = express.Router();
const fs = require('fs').promises;
const { s3, bucket } = require('../config/wasabi');
const upload = require('../middleware/upload'); // For PDF uploads
const profileUpload = require('../middleware/profileUpload'); // For image uploads
const User = require('../models/user.model.js');

router.put('/pfp', passport.authenticate('jwt', {session: false}), (req, res, next) => {
  // Log before multer to see the raw request
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.headers['content-type']);
  next();
}, profileUpload.any(), async (req, res) => {
  
  console.log('Files received:', req.files);
  console.log('Body:', req.body);
  
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userId = req.user._id;
  
  // Check if any files were uploaded
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Use the first file
  const file = req.files[0];
  console.log('Processing file:', file.originalname, file.mimetype, file.size);
  
  try {
    // Verify the file exists
    await fs.access(file.path);
    console.log('File exists and is accessible');
    
    const fileContent = await fs.readFile(file.path);
    console.log('File read successfully, size:', fileContent.length);
    
    const key = `profile-pictures/${userId}/${file.filename}`; // Changed the folder name
    const params = {
      Bucket: bucket,
      Key: key,
      Body: fileContent,
      ContentType: file.mimetype
    };

    await s3.upload(params).promise();
    console.log('File uploaded to Wasabi');

    const imageUrl = `https://${bucket}.s3.us-east-1.wasabisys.com/${key}`;
    const updatedUser = await User.findByIdAndUpdate(
        userId,                  
        { profilePicture: imageUrl },  
        { new: true }             
      );
      
    // Clean up the temporary file
    try {
      await fs.unlink(file.path);
      console.log('Temporary file deleted');
    } catch (unlinkError) {
      console.error('Warning: Could not delete temporary file:', unlinkError);
    }
      
    if(!updatedUser) {
      return res.status(400).json({
          message: 'failed to update user!'
      });
    } else {
      return res.status(200).json({
          message: 'updated successfully',
          profilePicture: imageUrl
      });
    }
  } catch(err) {
    console.log('error updating pfp: ', err);
    return res.status(500).json({
        message: 'server error',
        error: err.message
    });
  }
});

router.put('/bio', passport.authenticate('jwt', {session: false}), async (req,res) =>{
try{
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const userId = req.user._id;
      const bio = req.body.bio;
      const updatedUser = await User.findByIdAndUpdate(
        userId,                  
        { bio: bio },  
        { new: true }             
      );
      if(updatedUser){
        return res.status(200).json({
            message: 'successfully update bio'
        }
        );
      } else
      {
        return res.status(400).json({
            message: 'failed to update bio'
        });
      }
} catch(err)
{
    console.log('failed to update bio', err);
    return res.status(500).json({
        message: 'server error',
        error: err.message
    });
}

});

router.put('/name', passport.authenticate('jwt', {session: false}), async (req,res) =>{
    try{
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
          }
          const userId = req.user._id;
          const {firstName, lastName} = req.body;
        
          const updatedUser = await User.findByIdAndUpdate(
            userId,                  
            { firstName: firstName,
                lastName: lastName
             },  
            { new: true }             
          );
          if(updatedUser){
            return res.status(200).json({
                message: 'successfully update name'
            }
            );
          } else
          {
            return res.status(400).json({
                message: 'failed to update name'
            });
          }
    } catch(err)
    {
        console.log('failed to update name', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }
});

router.post('/debug-upload', profileUpload.any(), (req, res) => {
  console.log('DEBUG - Headers:', req.headers);
  console.log('DEBUG - Body:', req.body);
  console.log('DEBUG - Files:', req.files);
  
  res.json({
    message: 'Debug information logged',
    receivedFiles: req.files ? req.files.map(f => ({
      fieldname: f.fieldname,
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size
    })) : [],
    receivedBody: req.body
  });
});

module.exports = router;