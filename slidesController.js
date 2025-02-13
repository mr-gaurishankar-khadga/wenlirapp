const express = require('express');
const mongoose = require('mongoose');

// Slide Schema and Model
const slideSchema = new mongoose.Schema({
  slides: [
    {
      text: { type: String, required: true },
      order: { type: Number, required: true },
    },
  ],
});

const Slide = mongoose.model('TextSlide', slideSchema);

// Define the router
const router = express.Router();


router.post('/upload-slides', async (req, res) => {
  try {
    const { slides } = req.body;


    if (!slides || slides.length === 0) {
      return res.status(400).json({ message: 'Please provide slides to upload' });
    }

    const invalidSlides = slides.filter(
      (slide) => !slide.text || slide.order === undefined
    );
    if (invalidSlides.length > 0) {
      return res.status(400).json({ message: 'All slides must have text and order' });
    }

    const sortedSlides = slides.sort((a, b) => a.order - b.order);

    const newSlide = new Slide({
      slides: sortedSlides,
    });

    await newSlide.save();

    res.status(200).json({ message: 'Slides uploaded successfully', newSlide });
  } catch (error) {
    console.error('Error uploading slides:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/get-slides', async (req, res) => {
  try {
    const slides = await Slide.find();
    if (slides.length === 0) {
      return res.status(404).json({ message: 'No slides found' });
    }

    const latestSlides = slides[slides.length - 1].slides;
    res.status(200).json(latestSlides);
  } catch (error) {
    console.error('Error fetching slides:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
