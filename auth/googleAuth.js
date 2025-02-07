// auth/googleAuth.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User'); 

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
      let existingUser = await User.findOne({ googleId: profile.id });
      
      if (existingUser) {
        return done(null, existingUser);
      }
      
      const newUser = await User.create({
        googleId: profile.id,
        displayName: profile.displayName,
        email: profile.emails[0].value,
      });

      done(null, newUser);
    } catch (error) {
      done(error, null);
    }
  }));
};

// Update serialization to include all user data
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

// Authentication routes
const googleAuthRoutes = (app) => {
  app.get('/auth/google',
    passport.authenticate('google', {
      scope: ['profile', 'email'],
    })
  );



  app.get('/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.redirect('/');
      }
      res.redirect('/');
    });
  });
};

module.exports = {
  initializeGoogleStrategy,
  googleAuthRoutes
};