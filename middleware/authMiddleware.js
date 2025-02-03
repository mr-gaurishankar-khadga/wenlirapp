// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, 'your_jwt_secret'); // Replace with your secret
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (error) {
    console.error('Not authorized:', error);
    res.status(401).json({ message: 'Not authorized' });
  }
};

module.exports = { protect };
