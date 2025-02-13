const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const AllSignup = require('../models/signupModel');
const crypto = require('crypto');

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'wenlifashions@gmail.com',
    pass: 'uwoh jtud qabp ynjf',
  }
});

const generateRandomSecretKey = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { firstname, email, password } = req.body;

    // Check for existing user
    const existingUser = await AllSignup.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Create new user
    const user = new AllSignup({
      firstname,
      email,
      password,
      otp,
      otpExpiry
    });

    await user.save();

    // Send verification email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email Verification OTP',
        html: `
          <h1>Email Verification</h1>
          <p>Your OTP for verification is: <strong> ${otp} </strong></p>
          <p>This OTP will expire in 10 minutes.</p>
        `
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for OTP.'
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});




// Get all users route
router.get('/users', async (req, res) => {
  try {
    const users = await AllSignup.find({})
      .select('-password -otp -otpExpiry'); // Exclude sensitive fields

    res.status(200).json({
      success: true,
      users
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});





// OTP verification route
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await AllSignup.findOne({
      email,
      otp,
      otpExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Update user verification status
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || generateRandomSecretKey(),
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Email verified successfully',
      token
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.'
    });
  }
});

module.exports = router;