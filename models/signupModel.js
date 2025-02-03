// models/signupModel.js
const mongoose = require('mongoose');

const signupSchema = new mongoose.Schema({
  email: String,
  password: String,
  firstName: String,
  lastName: String,
  phoneNumber: String,
  addressLine: String,
  city: String,
  state: String,
  otp: String,
});

module.exports = mongoose.model('Signup', signupSchema);