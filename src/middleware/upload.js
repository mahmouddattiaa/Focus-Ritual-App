const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); 
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true); 
    } else {
      cb(new Error('Only PDFs are allowed'), false);
    }
  }
});

module.exports = upload;
router.get('/files', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
  
      const userId = req.user._id;
      const files = await UploadedFile.find({ user_id: userId });
      res.json(files);
    } catch (err) {
      console.error('Error fetching files:', err);
      res.status(500).json({ error: 'Failed to fetch files' });
    }
  });
  
  router.get('/file/:id', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
  
      const file = await UploadedFile.findById(req.params.id);
      if (!file || file.user_id.toString() !== req.user._id.toString()) {
        return res.status(404).json({ error: 'File not found or unauthorized' });
      }
  
      const params = {
        Bucket: bucket,
        Key: file.file_path.split('/').slice(-2).join('/')
      };
      const fileStream = s3.getObject(params).createReadStream();
      res.setHeader('Content-Type', file.mimetype || 'application/pdf');
      fileStream.pipe(res);
    } catch (err) {
      console.error('Error retrieving file:', err);
      res.status(500).json({ error: 'Failed to retrieve file' });
    }
  });