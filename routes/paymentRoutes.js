
const express = require('express');
const router = express.Router();
const Payment = require('../models/paymentModel');
const nodemailer = require('nodemailer');

const otpStore = new Map();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'udaymaharshi0506@gmail.com',  
    pass: 'xxjs kiqa hdmn xpol'  
  }
});



transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});


router.post('/', async (req, res) => {
  const {shiprocketOrderId,shipmentId, product, quantity, paymentMethod, price, address, email, name, phone, secAddress, pincode, buiding, state, city, size, status } = req.body;

  try {
    const newPayment = new Payment({
      shiprocketOrderId,
      shipmentId,
      product,
      quantity,
      size,
      paymentMethod,
      price,
      address,
      email,
      name,
      phone,
      status,
      state,
      city,
      secAddress,
      pincode,
      buiding,
    });

    await newPayment.save();

    const mailOptions = {
      from: 'udaymaharshi0506@gmail.com',
      to: email,
      subject: 'Payment Confirmation',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #181818; color: #fff; padding: 20px; text-align: center;">
            <img src='' alt="Brand Logo" style="max-height: 50px; margin-bottom: 10px;">
            <h1 style="margin: 0; font-size: 24px;">Wenli.in</h1>
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #333;">Payment Confirmation</h2>
            <p style="font-size: 16px; color: #555;">Thank you for your payment of <strong>Rs.${price}</strong>. Your order details are as follows:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f5f5f5; text-align: left;">
                  <th style="padding: 10px; border-bottom: 1px solid #ddd;">Item</th>
                  <th style="padding: 10px; border-bottom: 1px solid #ddd;">Details</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">Product</td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${product.title}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">Quantity</td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${quantity}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">Payment Method</td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${paymentMethod}</td>
                </tr>
              </tbody>
            </table>
            <p style="font-size: 16px; color: #555;">If you have any questions about your order, please contact us at <a href="mailto:support@wenli.in" style="color: #007bff;">support@wenli.in</a>.</p>
          </div>
          <div style="background-color: #f5f5f5; color: #555; padding: 10px; text-align: center;">
            <p style="font-size: 14px; margin: 0;">Wenli, Jaypur, Rajasthan</p>
            <p style="font-size: 14px; margin: 0;">&copy; ${new Date().getFullYear()} Wenli.in. All rights reserved.</p>
          </div>
        </div>
      `
    };
    

    await transporter.sendMail(mailOptions);

    res.status(201).json({ 
      success: true,
      message: 'Payment processed successfully',
      payment: newPayment 
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing payment',
      error: error.message 
    });
  }
});





// API endpoint to fetch all payments
router.get('/api/payments', async (req, res) => {
  try {
    const payments = await Payment.find();
    res.status(200).json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching payment data', error });
  }
});




router.post('/send-payment-otp', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required' 
    });
  }

  try {
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
  
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000 
    });
    
    const mailOptions = {
      from: 'ggs699000@gmail.com',
      to: email,
      subject: 'Payment Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color:black; color: #fff; padding: 20px; text-align: center;">
            <img src="/images/WENLI.svg" alt="Brand Logo" style="max-height: 50px; margin-bottom: 10px;">
            <h1 style="margin: 0; font-size: 24px; font-family: 'Roboto', sans-serif;">Your Brand Name</h1>
          </div>
          <div style="padding: 30px; text-align: center;">
            <h2 style="color: #333; font-size: 28px; font-family: 'Roboto', sans-serif; margin-bottom: 10px;">Payment Verification OTP</h2>
            <p style="font-size: 16px; color: #555; margin-bottom: 20px;">We received a request to verify your payment. Please use the following OTP to complete your transaction:</p>
            <h1 style="color: #4CAF50; font-size: 40px; letter-spacing: 5px; font-family: 'Arial', sans-serif; font-weight: bold; margin: 0;">${otp}</h1>
            <p style="font-size: 16px; color: #555; margin-top: 20px;">This OTP will expire in 5 minutes.</p>
            <p style="font-size: 16px; color: #555; margin-top: 10px;">If you did not request this, please ignore this email.</p>
          </div>
          <div style="background-color: #f5f5f5; color: #555; padding: 10px; text-align: center;">
            <p style="font-size: 14px; margin: 0;">Your Brand Name, Your Address, Your City, Your Country</p>
            <p style="font-size: 14px; margin: 0;">&copy; ${new Date().getFullYear()} Your Brand Name. All rights reserved.</p>
          </div>
        </div>
      `
    };
    

    await transporter.sendMail(mailOptions);
    
    res.status(200).json({ 
      success: true, 
      message: 'OTP sent successfully'
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP',
      error: error.message 
    });
  }
});


router.post('/verify-payment-otp', (req, res) => {
  const { email, otp } = req.body;
  
  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Email and OTP are required'
    });
  }

  const storedData = otpStore.get(email);
  
  if (!storedData) {
    return res.status(400).json({
      success: false,
      message: 'No OTP found for this email'
    });
  }
  
  if (Date.now() > storedData.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({
      success: false,
      message: 'OTP has expired'
    });
  }
  
  if (storedData.otp !== otp) {
    return res.status(400).json({
      success: false,
      message: 'Invalid OTP'
    });
  }


  otpStore.delete(email);
  
  res.status(200).json({
    success: true,
    message: 'OTP verified successfully'
  });
});


setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
    }
  }
}, 5 * 60 * 1000);

module.exports = router;