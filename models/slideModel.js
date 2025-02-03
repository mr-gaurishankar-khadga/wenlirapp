// models/slideModel.js
const mongoose = require('mongoose');

const slideSchema = new mongoose.Schema({
  images: [String],
}, { collection: 'Slide' });

module.exports = mongoose.model('Slide', slideSchema);
