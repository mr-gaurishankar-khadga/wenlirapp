// Add this to your authRoutes.js file
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const AllSignup = require('../models/signupModel');


const otpStore = new Map();


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'wenlifashions@gmail.com',
    pass: 'uwoh jtud qabp ynjf',
  }
});


router.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await AllSignup.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }


    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    

    otpStore.set(email, {
      otp,
      expires: Date.now() + 15 * 60 * 1000
    });

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}\nThis OTP will expire in 15 minutes.`
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'OTP sent successfully' });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});


router.post('/api/verify-otp1', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    const storedOTPData = otpStore.get(email);
    
    if (!storedOTPData || storedOTPData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (Date.now() > storedOTPData.expires) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP has expired' });
    }

   
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await AllSignup.findOneAndUpdate(
        { email },
        { password: hashedPassword }
      );
    }

   
    otpStore.delete(email);
    
    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
});






// In your authRoutes.js
router.get('/login-history', async (req, res) => {
  try {
    const logins = await LoginHistory.find()
      .sort({ loginTime: -1 })
      .limit(100);  // Get last 100 logins
    
    res.json({
      success: true,
      logins
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching login history' 
    });
  }
});
module.exports = router;