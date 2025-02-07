const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Enhanced Email Configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'udaymaharshi0506@gmail.com',
    pass: 'xxjs kiqa hdmn xpol',
  },
  debug: true 
});

// Test email connection
transporter.verify(function(error, success) {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready');
  }
});

async function sendWelcomeEmail(user, isNewUser = false) {
  try {
    const mailOptions = {
      from: 'udaymaharshi0506@gmail.com',
      to: user.email,
      subject: isNewUser ? 'Welcome to Wenli.in' : 'Welcome Back to Wenli.in',
      html: `
        <h2>${isNewUser ? 'Welcome' : 'Welcome back'}, ${user.displayName}!</h2>
        <p>You've successfully logged in to wenli.in.</p>
        <p>${isNewUser ? "We're excited to have you as a new member!" : "We're glad to see you again!"}</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// User Schema and Model remain the same
const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true },
  displayName: { type: String, required: true },
  email: { type: String, required: true },
  likedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  
});

const User = mongoose.model('User', UserSchema);

// Updated Passport Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production' 
      ? 'http://localhost:8000/auth/google/callback' 
      : 'http://localhost:8000/auth/google/callback',
      proxy: true,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const existingUser = await User.findOne({ googleId: profile.id });
      
      if (existingUser) {
        await sendWelcomeEmail(existingUser, false);
        return done(null, existingUser);
      }

      const newUser = await User.create({
        googleId: profile.id,
        displayName: profile.displayName,
        email: profile.emails[0].value,
      });

      await sendWelcomeEmail(newUser, true);
      done(null, newUser);
    } catch (error) {
      console.error('Authentication error:', error);
      done(error, null);
    }
  }
));

// Rest of the code remains the same
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    console.error('Deserialization error:', error);
    done(error, null);
  }
});

// Auth Routes
const router = express.Router();

router.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('http://localhost:5173/profile');
  }
);

router.get('/profile', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const user = req.user;
  if (!user) {
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

module.exports = router;