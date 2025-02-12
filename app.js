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
const { initializeGoogleStrategy,initializeJwtStrategy, setupGoogleAuthRoutes } = require('./auth/googleAuth');
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
const shiprocketRoutes = require('./routes/shiprocketRoutes');
const slidesController = require('./slidesController');
const signupRoutes = require('./routes/signRoute');
const AllSignup = require('./models/signupModel');


const app = express();


const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://fancy-dragon-929394.netlify.app']
    : 'http://localhost:5173',
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
initializeJwtStrategy();
setupGoogleAuthRoutes(app);



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
app.use('/api', slidesController);
app.use('/api/auth', signupRoutes);



const router = express.Router();
module.exports = router;







// Routes
app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);


app.get('/profile', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      success: false,
      message: 'Not authenticated'
    });
  }

  res.json({
    success: true,
    displayName: req.user.displayName,
    email: req.user.email,
    googleId: req.user.googleId
  });
});


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




app.post('/api/auth/login', async (req, res) => {
  try {
    const { firstname, password } = req.body;

   
    const user = await AllSignup.findOne({ firstname });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email first'
      });
    }

  
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

   
    const token = jwt.sign(
      { 
        userId: user._id,
        firstname: user.firstname,
        email: user.email,
        role: user.role || 'user'
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
        email: user.email,
        role: user.role || 'user'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
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