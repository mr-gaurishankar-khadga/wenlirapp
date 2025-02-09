// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authenticateUser = async (req, res, next) => {
  try {
    // First check if user is authenticated via Passport session (Google OAuth)
    if (req.isAuthenticated()) {
      return next();
    }

    // If not authenticated via session, check for JWT token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || generateRandomSecretKey());
      req.user = decoded;
      next();
    } catch (error) {
      res.status(403).json({
        success: false,
        message: 'Invalid token.'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

module.exports = authenticateUser;