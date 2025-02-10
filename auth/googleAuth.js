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





// Updated routes for the backend
const setupGoogleAuthRoutes = (app) => {
  app.get('/auth/google',
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })
  );

  app.get('/auth/google/callback',
    passport.authenticate('google', { session: false }),
    (req, res) => {
      const token = req.user.token;
      const frontendURL = process.env.NODE_ENV === 'production'
        ? 'https://wenlirapp11.onrender.com'
        : 'http://localhost:5173';

      // Redirect with token
      res.redirect(`${frontendURL}/auth/callback?token=${token}`);
    }
  );

  // Profile endpoint
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

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
      try {
        const frontendURL = process.env.NODE_ENV === 'production'
          ? 'https://fancy-dragon-929394.netlify.app'
          : 'http://localhost:5173';
  
        // Attach token to the redirect URL (if applicable)
        const token = req.user && req.user.token ? `?token=${req.user.token}` : '';
        res.redirect(`${frontendURL}/profile${token}`);
      } catch (error) {
        console.error('Error during redirection:', error);
        res.status(500).send('Internal Server Error');
      }
    }
  );
  
};

module.exports = {
  initializeGoogleStrategy,
  initializeJwtStrategy,
  setupGoogleAuthRoutes
};