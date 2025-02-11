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
const AllSignup = require('./models/signupModel');
const shiprocketRoutes = require('./routes/shiprocketRoutes');
const slidesController = require('./slidesController');



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



const router = express.Router();
module.exports = router;















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









// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'wenlifashions@gmail.com',
    pass: 'uwoh jtud qabp ynjf',
  }
});

// Utility function for token generation
const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  return jwt.sign(
    {
      userId: user._id,
      firstname: user.firstname,
      email: user.email,
      role: user.role || 'user'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};




// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { firstname, email, password } = req.body;

    // Check for existing user
    const existingUser = await AllSignup.findOne({
      $or: [{ email }, { firstname }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }



    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    
    // Create new user
    const newUser = new AllSignup({
      firstname,
      email,
      password: hashedPassword,
      otp,
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      isVerified: false,
      role: 'user'
    });

    await newUser.save();

    // Send OTP email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Email Verification OTP',
      html: `<h1>Your OTP: ${otp}</h1><p>Valid for 10 minutes</p>`
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      success: true,
      message: 'Signup successful! Please check your email for OTP'
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Signup failed. Please try again.'
    });
  }
});

// OTP verification endpoint
app.post('/api/auth/verify-otp', async (req, res) => {
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

    // Generate token after verification
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: {
        firstname: user.firstname,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.'
    });
  }
});






// 2. Update the login endpoint in app.js
app.post('/api/auth/login', async (req, res) => {
  try {
    const { firstname, password } = req.body;
    
    // Debug log
    console.log('Login attempt for:', firstname);

    // Find user - make sure to use case-insensitive search
    const user = await AllSignup.findOne({ 
      firstname: new RegExp(`^${firstname}$`, 'i')
    });

    if (!user) {
      console.log('User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Debug log
    console.log('User found:', user.firstname, 'Verified:', user.isVerified);

    // Check verification
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email first'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    // Debug log
    console.log('Password valid:', isValidPassword);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Generate token with all necessary user info
    const token = jwt.sign(
      {
        userId: user._id,
        firstname: user.firstname,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send success response with all necessary user info
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        firstname: user.firstname,
        email: user.email,
        role: user.role
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