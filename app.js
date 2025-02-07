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

const cashfreeRoutes = require('./cashfree');

const shiprocketRoutes = require('./routes/shiprocketRoutes');




const app = express();


const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://fancy-dragon-929394.netlify.app', 'https://wenlirapp11.onrender.com']
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));



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


// Updated session configuration
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
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? 'https://fancy-dragon-929394.netlify.app' : undefined
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
// Updated callback route
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    const frontendURL = process.env.NODE_ENV === 'production'
      ? 'https://fancy-dragon-929394.netlify.app'
      : 'http://localhost:5173';
    res.redirect(`${frontendURL}/profile`);
  }
);

// Updated profile route with proper error handling
app.get('/profile', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      success: false,
      message: 'Not authenticated',
      isAuthenticated: false
    });
  }

  if (!req.user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
      isAuthenticated: false
    });
  }

  res.json({
    success: true,
    isAuthenticated: true,
    user: {
      displayName: req.user.displayName,
      email: req.user.email,
      googleId: req.user.googleId
    }
  });
});



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