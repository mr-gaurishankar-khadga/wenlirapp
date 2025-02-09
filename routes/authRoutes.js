// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Signup = require('../models/signupModel');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const JWT_SECRET = crypto.randomBytes(64).toString('hex');
console.log(`Generated JWT Secret Key: ${JWT_SECRET}`);




module.exports = router;


//this si not usable empty