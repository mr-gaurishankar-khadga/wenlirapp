// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const Signup = require('../models/signupModel');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const JWT_SECRET = crypto.randomBytes(64).toString('hex');
console.log(`Generated JWT Secret Key: ${JWT_SECRET}`);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'udaymaharshi0506@gmail.com',
    pass: 'xxjs kiqa hdmn xpol',
  },
});



router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('http://localhost:3000/profile');
  }
);

router.get('/profile', async (req, res) => {
  console.log('Profile route accessed');

  if (!req.isAuthenticated()) {
    console.log('User not authenticated');
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const user = req.user;

  if (!user) {
    console.log('User not found in session');
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({
    displayName: user.displayName,
    email: user.email,
    googleId: user.googleId,
  });
});

router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/');
    }
    res.redirect('/');
  });
});

router.post('/signup', async (req, res) => {
  const { email, password, firstName, lastName, phoneNumber, addressLine, city, state } = req.body;

  try {
    const userExists = await Signup.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = new Signup({ email, password, firstName, lastName, phoneNumber, addressLine, city, state, otp });
    await newUser.save();

    await transporter.sendMail({
      to: email,
      subject: 'OTP Verification',
      text: `Your OTP is ${otp}`,
    });
    res.status(200).json({ message: 'User created. Check your email for OTP.' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'An error occurred during signup. Please try again.' });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await Signup.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    user.otp = null;
    await user.save();

    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({ message: 'OTP verified successfully', token });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'An error occurred during OTP verification. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  const { firstname, password } = req.body;

  try {
    const user = await Signup.findOne({ firstname });

    if (user && await user.matchPassword(password)) {
      const token = generateToken(user._id, user.role);
      res.json({
        token,
        role: user.role
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/signups', async (req, res) => {
  try {
    const signups = await Signup.find();
    res.status(200).json(signups);
  } catch (error) {
    console.error('Error fetching signups:', error);
    res.status(500).json({ message: 'Failed to fetch signups.' });
  }
});

router.delete('/signups/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const result = await Signup.deleteOne({ _id: userId });

    if (result.deletedCount === 1) {
      res.status(200).json({ message: 'User deleted successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user.' });
  }
});

module.exports = router;