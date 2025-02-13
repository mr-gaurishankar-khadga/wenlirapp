const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ImageSlide = require('./models/ImageSlider');

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/slider';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'slide-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Routes
router.post('/upload-image-slides', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one image' });
    }

    const slides = req.files.map((file, index) => ({
      imageUrl: `/uploads/slider/${file.filename}`,
      order: index + 1
    }));

    const newImageSlide = new ImageSlide({ slides });
    await newImageSlide.save();

    res.status(200).json({
      message: 'Images uploaded successfully',
      slides: newImageSlide.slides
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/get-image-slides', async (req, res) => {
  try {
    const slides = await ImageSlide.findOne().sort({ createdAt: -1 });
    if (!slides) {
      return res.status(404).json({ message: 'No slides found' });
    }
    res.status(200).json(slides.slides);
  } catch (error) {
    console.error('Error fetching slides:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;