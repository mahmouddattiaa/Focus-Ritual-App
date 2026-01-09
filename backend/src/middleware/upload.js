const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Make sure the uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory at:', uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); 
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and PDFs
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error(`File type not supported: ${file.mimetype}. Only images, videos, and PDFs are allowed.`));
  }
});

module.exports = upload;

  