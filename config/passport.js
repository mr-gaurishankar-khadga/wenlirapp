const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const User = require('../models/User')
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





module.exports = router;