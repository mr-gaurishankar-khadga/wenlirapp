// models/ProcessedOrder.js
const mongoose = require('mongoose');

const processedOrderSchema = new mongoose.Schema({
  processingKey: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Documents will be automatically deleted after 1 hour
  }
});

module.exports = mongoose.model('ProcessedOrder', processedOrderSchema);