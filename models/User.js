// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  profileImage: {
    type: String,
    default: '',
  },
  likedProducts: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product' 
  }],
});

module.exports = mongoose.model('User', UserSchema);
