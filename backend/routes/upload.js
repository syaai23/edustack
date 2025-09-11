const express = require('express');
const multer = require('multer');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  }
});

// @route   POST /api/upload/image
// @desc    Upload image file
// @access  Private
router.post('/image', auth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // In a production environment, you would upload to a cloud service like AWS S3, Cloudinary, etc.
    // For now, we'll simulate a successful upload
    const fileUrl = `https://your-cdn.com/images/${Date.now()}-${req.file.originalname}`;

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/upload/video
// @desc    Upload video file
// @access  Private
router.post('/video', auth, upload.single('video'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // In a production environment, you would upload to a cloud service
    const fileUrl = `https://your-cdn.com/videos/${Date.now()}-${req.file.originalname}`;

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/upload/multiple
// @desc    Upload multiple files
// @access  Private
router.post('/multiple', auth, upload.array('files', 5), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      url: `https://your-cdn.com/files/${Date.now()}-${file.originalname}`,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      data: {
        files: uploadedFiles
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
