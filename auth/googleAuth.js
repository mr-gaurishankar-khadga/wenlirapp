const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role || 'user'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Add this JWT strategy configuration
const initializeJwtStrategy = () => {
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
  };

  passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await User.findById(jwt_payload.userId);
      if (user) {
        return done(null, user);
      }
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  }));
};



const initializeGoogleStrategy = () => {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production'
      ? 'https://wenlirapp11.onrender.com/auth/google/callback'
      : 'http://localhost:8000/auth/google/callback',
    proxy: true
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      
      if (!user) {
        user = await User.create({
          googleId: profile.id,
          displayName: profile.displayName,
          email: profile.emails[0].value,
          role: 'user'
        });
      }

      // Generate token
      const token = generateToken(user);
      user.token = token; // Attach token to user object
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};








// In your googleAuth.js file, update the setupGoogleAuthRoutes function:

const setupGoogleAuthRoutes = (app) => {
  app.get('/auth/google',
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })
  );

  // Remove the duplicate callback route and keep only one
  app.get('/auth/google/callback',
    passport.authenticate('google', { session: false }),
    (req, res) => {
      try {
        const token = req.user.token;
        const frontendURL = process.env.NODE_ENV === 'production'
          ? 'https://fancy-dragon-929394.netlify.app'
          : 'http://localhost:5173';

        // Add the specific callback route handler
        res.redirect(`${frontendURL}/auth/callback?token=${token}`);
      } catch (error) {
        console.error('Error during redirection:', error);
        res.status(500).send('Internal Server Error');
      }
    }
  );

  // Add the explicit callback route handler
  app.get('/auth/callback', (req, res) => {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // You can add token verification here if needed
    res.json({ 
      success: true,
      message: 'Authentication successful',
      token 
    });
  });

  // Keep your profile endpoint
  app.get('/profile', 
    passport.authenticate('jwt', { session: false }),
    (req, res) => {
      res.json({
        success: true,
        user: {
          id: req.user._id,
          displayName: req.user.displayName,
          email: req.user.email,
          role: req.user.role
        }
      });
    }
  );
};

module.exports = {
  initializeGoogleStrategy,
  initializeJwtStrategy,
  setupGoogleAuthRoutes
};