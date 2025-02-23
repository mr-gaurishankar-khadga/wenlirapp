const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      firstname: user.firstname || user.displayName,
      role: user.role || 'user',
      profileImage: user.profileImage
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

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
      ? 'https://api.wenli.in/auth/google/callback'
      : 'http://localhost:8000/auth/google/callback',
    proxy: true
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });      
      
      // Get profile image URL
      const profileImage = profile.photos && profile.photos[0] ? profile.photos[0].value : '';

      if (!user) {
        user = await User.create({
          googleId: profile.id,
          displayName: profile.displayName,
          email: profile.emails[0].value,
          profileImage: profileImage,
          role: 'user'
        });
      } else {
        // Update profile image if it changed
        if (profileImage !== user.profileImage) {
          user.profileImage = profileImage;
          await user.save();
        }
      }

      const token = generateToken(user);
      user.token = token;

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

const setupGoogleAuthRoutes = (app) => {
  app.get('/auth/google',
    (req, res, next) => {
      req.session.referrerHost = req.get('origin') || 'https://www.wenli.in';
      next();
    },
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      accessType: 'offline',
      prompt: 'consent'
    })
  );

  app.get('/auth/google/callback',
    passport.authenticate('google', { session: false }),
    (req, res) => {
      try {
        const token = req.user.token;
        
        let referrerHost = req.session.referrerHost || req.get('origin');
        
        const allowedDomains = [
          'https://www.wenli.in',
          'https://wenli.in',
          'http://localhost:5173'
        ];

        let frontendURL = process.env.NODE_ENV === 'production' 
          ? 'https://wenli.in'
          : 'http://localhost:5173';

        if (referrerHost && allowedDomains.includes(referrerHost)) {
          frontendURL = referrerHost;
        }

        if (req.session) {
          delete req.session.referrerHost;
        }

        const userData = {
          id: req.user._id,
          email: req.user.email,
          displayName: req.user.displayName,
          profileImage: req.user.profileImage
        };

        const encodedUserData = encodeURIComponent(JSON.stringify(userData));
        res.redirect(`${frontendURL}/auth/callback?token=${token}&userData=${encodedUserData}`);
      } catch (error) {
        console.error('Error during redirection:', error);
        res.status(500).send('Internal Server Error');
      }
    }
  );

  app.get('/auth/callback', (req, res) => {
    const { token, userData } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });  
    }
    res.json({
      success: true,
      message: 'Authentication successful',
      token,
      user: JSON.parse(decodeURIComponent(userData))
    });
  });

  const authenticateJWT = (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'No authorization header'
        });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      jwt.verify(token, process.env.JWT_SECRET, (err, user) => {    
        if (err) {
          return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
          });
        }
        req.user = user;
        next();
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  };

  app.get('/profile', authenticateJWT, (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      res.json({
        success: true,
        user: {
          id: req.user.userId,
          firstname: req.user.firstname || req.user.displayName,    
          email: req.user.email,
          role: req.user.role || 'user',
          profileImage: req.user.profileImage
        }
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  });

  app.get('/auth/logout', (req, res) => {
    try {
      req.logout(() => {
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destruction error:', err);
          }
          res.clearCookie('connect.sid');
          res.json({
            success: true,
            message: 'Logged out successfully'
          });
        });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Error during logout'
      });
    }
  });
};

module.exports = {
  initializeGoogleStrategy,
  initializeJwtStrategy,
  setupGoogleAuthRoutes
};