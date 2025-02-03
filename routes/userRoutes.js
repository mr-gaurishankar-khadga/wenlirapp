// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const Signup = require('../models/signupModel');
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Token verification error:', err);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};




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



router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await Signup.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { password, otp, ...userData } = user.toObject();
    res.status(200).json({ message: 'Welcome to your profile!', user: userData });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'An error occurred while fetching profile data.' });
  }
});

module.exports = router;
