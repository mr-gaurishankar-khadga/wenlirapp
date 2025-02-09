// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const path = require('path');
const crypto = require('crypto');
const { initializeGoogleStrategy, googleAuthRoutes } = require('./auth/googleAuth');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const slideRoutes = require('./routes/slideRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cashfreeRoutes = require('./cashfree');
const AllSignup = require('./models/signupModel');
const shiprocketRoutes = require('./routes/shiprocketRoutes');




const app = express();


// In your app.js, update just the CORS configuration:

const corsOptions = {
  origin: ['http://localhost:5173', 'https://fancy-dragon-929394.netlify.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};


app.use(cors(corsOptions));


app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


const generateRandomSecretKey = () => {
  return crypto.randomBytes(64).toString('hex');
};


const connectDB = async () => {
  try {
    const mongoOptions = {
      autoIndex: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000, 
      socketTimeoutMS: 45000, 
      family: 4 
    };
    
    await mongoose.connect(process.env.MONGO_DB_CONNECTION_MY_DATABASE, mongoOptions);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    
    setTimeout(connectDB, 5000);
  }
};

connectDB();


app.use(session({
  secret: process.env.SESSION_SECRET || generateRandomSecretKey(),
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_DB_CONNECTION_MY_DATABASE,
    ttl: 24 * 60 * 60
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));




// Initialize Passport and session support
app.use(passport.initialize());
app.use(passport.session());
initializeGoogleStrategy();





// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// Routes
app.use('/', authRoutes);
app.use('/api/products', productRoutes);
app.use('/', paymentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/slides', slideRoutes);
app.use('/api/users', userRoutes);
app.use('/', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/', cashfreeRoutes);
app.use('/api/cashfree', cashfreeRoutes);
app.use('/api/shiprocket', shiprocketRoutes);



const router = express.Router();
module.exports = router;





// Routes
app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);


// In app.js, update your profile route:

app.get('/profile', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    // If no token found, check for session
    if (!token && !req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to access your profile gshankar'
      });
    }

    let user;

    // If token exists, verify JWT
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || generateRandomSecretKey());
        user = await AllSignup.findById(decoded.userId);
        
        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'User not found'
          });
        }

        return res.json({
          success: true,
          user: {
            firstname: user.firstname,
            email: user.email,
            role: user.role || 'user'
          }
        });
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
    }

    // If authenticated via session (Google OAuth)
    if (req.isAuthenticated()) {
      return res.json({
        success: true,
        user: {
          displayName: req.user.displayName,
          email: req.user.email,
          googleId: req.user.googleId
        }
      });
    }

  } catch (error) {
    console.error('Profile access error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accessing profile'
    });
  }
});





// Update callback route
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    const frontendURL = process.env.NODE_ENV === 'production'
      ? 'https://fancy-dragon-929394.netlify.app'  
      : 'http://localhost:5173';
      
    res.redirect(`${frontendURL}/profile`);
  }
);







// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});







// MongoDB Schema for Text Slides
const slideSchema = new mongoose.Schema({
  slides: [
    {
      text: { type: String, required: true },
      order: { type: Number, required: true },
    },
  ],
});

const Slide = mongoose.model('TextSlide', slideSchema);

// Route to upload slides
app.post('/api/upload-slides', async (req, res) => {
  try {
    const { slides } = req.body;

    // Check if slides array is not empty
    if (!slides || slides.length === 0) {
      return res.status(400).json({ message: 'Please provide slides to upload' });
    }

    // Validate each slide
    const invalidSlides = slides.filter(
      (slide) => !slide.text || slide.order === undefined
    );
    if (invalidSlides.length > 0) {
      return res.status(400).json({ message: 'All slides must have text and order' });
    }

    // Sort slides by order to ensure correct sequence
    const sortedSlides = slides.sort((a, b) => a.order - b.order);

    // Store slides as a single document
    const newSlide = new Slide({
      slides: sortedSlides,
    });

    await newSlide.save();

    res.status(200).json({ message: 'Slides uploaded successfully', newSlide });
  } catch (error) {
    console.error('Error uploading slides:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to fetch slides
app.get('/api/get-slides', async (req, res) => {
  try {
    const slides = await Slide.find();
    if (slides.length === 0) {
      return res.status(404).json({ message: 'No slides found' });
    }
    
    // Return the most recent slide document
    const latestSlides = slides[slides.length - 1].slides;
    res.status(200).json(latestSlides);
  } catch (error) {
    console.error('Error fetching slides:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


















// Move your login route here (from the bottom of app.js)
app.post('/login', async (req, res) => {
  try {
    const { firstname, password } = req.body;
    const user = await AllSignup.findOne({ firstname });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Generate token
    const token = jwt.sign(
      { 
        userId: user._id,
        firstname: user.firstname,
        email: user.email
      },
      process.env.JWT_SECRET || generateRandomSecretKey(),
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        firstname: user.firstname,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});
















const authenticateToken = (req, res, next) => {
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
};








// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'wenlifashions@gmail.com',
    pass: 'uwoh jtud qabp ynjf',
  }
});

// Routes
app.post('/signup', async (req, res) => {
  try {
    const { firstname, email, password } = req.body;

    // Check if user exists
    const existingUser = await AllSignup.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = new AllSignup({
      firstname,
      email,
      password,
      otp,
      otpExpiry
    });

    await user.save();

    // Send OTP email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email Verification OTP',
        html: `
          <h1>Email Verification</h1>
          <p>Your OTP for verification is: <strong>${otp}</strong></p>
          <p>This OTP will expire in 10 minutes.</p>
        `
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Even if email fails, we'll return success since user is created
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

app.post('/verify-otp', async (req, res) => {
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

    // Generate JWT
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























const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});



// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Performing graceful shutdown...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});