const mongoose = require('mongoose');

const OrderTrackerSchema = new mongoose.Schema({
  cashfreeOrderId: {
    type: String,
    required: true,
    unique: true
  },
  shiprocketOrderId: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  processedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  indexes: [
    { fields: { cashfreeOrderId: 1 }, unique: true }
  ]
});

module.exports = mongoose.model('OrderTracker', OrderTrackerSchema);