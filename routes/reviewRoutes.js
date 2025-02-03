// routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

const reviewSchema = new mongoose.Schema({
  rating: { type: Number, required: true },
  review: { type: String, required: true },
  fileUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const Review = mongoose.model('Review', reviewSchema);

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const newReview = new Review({
      rating: req.body.rating,
      review: req.body.review,
      fileUrl: req.file ? `/uploads/${req.file.filename}` : null
    });

    await newReview.save();
    res.status(201).json({ message: 'Review saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error saving review' });
  }
});

module.exports = router