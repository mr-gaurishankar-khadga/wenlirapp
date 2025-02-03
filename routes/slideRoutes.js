// routes/slideRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Slide = require('../models/slideModel');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 7 * 1024 * 1024 }
});

router.post('/upload', upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length > 5) {
      return res.status(400).json({ message: 'You can only upload up to 5 images' });
    }

    const images = req.files.map(file => file.path);

    const newSlide = new Slide({ images });
    await newSlide.save();

    res.status(201).json({ message: 'Images uploaded successfully', images });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ message: 'Failed to upload images' });
  }
});

module.exports = router;