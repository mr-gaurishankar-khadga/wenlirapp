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
    expires: 3600
  }
});

module.exports = mongoose.model('ProcessedOrder', processedOrderSchema);