const mongoose = require('mongoose');

const imageSlideSchema = new mongoose.Schema({
  slides: [{
    imageUrl: String,
    order: Number
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ImageSlide', imageSlideSchema);