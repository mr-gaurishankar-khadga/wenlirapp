// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;

app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, customerName, customerEmail, customerPhone } = req.body;
    
    const orderData = {
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: `CUST_${Date.now()}`,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone
      },
      order_meta: {
        return_url: "http://localhost:3000/payment-status/{order_id}",
        notify_url: "http://localhost:5000/api/webhook"
      },
      // Specify payment methods
      order_tags: {
        payment_methods: "cc,dc,nb,upi,wallet"
      }
    };

    const response = await axios.post(
      'https://sandbox.cashfree.com/pg/orders',
      orderData,
      {
        headers: {
          'x-client-id': CASHFREE_CLIENT_ID,
          'x-client-secret': CASHFREE_CLIENT_SECRET,
          'x-api-version': '2022-09-01',
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Payment Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Payment initialization failed',
      details: error.response?.data || error.message 
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});