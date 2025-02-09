const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const allSignupSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: String,
  otpExpiry: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
allSignupSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const AllSignup = mongoose.model('AllSignup', allSignupSchema);

module.exports = AllSignup;