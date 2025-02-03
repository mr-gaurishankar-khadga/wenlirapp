
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');


const EMAIL_USER = 'udaymaharshi0506@gmail.com';
const EMAIL_PASS = 'xxjs kiqa hdmn xpol'; 

// Create a transporter using SMTP
const transport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});



const messageSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String
});

const Message = mongoose.model('Message', messageSchema);

// API endpoint to handle form submission
router.post('/api/messages', async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const newMessage = new Message({ name, email, message });
    await newMessage.save();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving message:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});



router.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find();
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error.message);
    res.status(500).json({ message: 'Failed to fetch messages.' });
  }
});




// API endpoint to handle reply email
router.post('/api/reply', async (req, res) => {
  const { email, message: replyMessage } = req.body;

  const mailOptions = {
    from: EMAIL_USER,
    to: email,
    subject: 'Reply to Your Message',
    text: replyMessage,
  };

  try {
    await transport.sendMail(mailOptions);
    res.status(200).json({ message: 'Reply sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error.message);
    res.status(500).json({ error: 'Failed to send reply.' });
  }
});



module.exports = router;



