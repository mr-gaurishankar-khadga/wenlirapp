// Backend: cashfree.routes.js

const express = require('express');
const axios = require('axios');
const router = express.Router();
const crypto = require('crypto');

// Create Cashfree order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, customer, product, quantity } = req.body;
    
    const orderData = {
      order_id: `ORDER-${Date.now()}`,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: customer.phone,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone
      },
      order_meta: {
        return_url: `${process.env.CLIENT_URL}/Cashfree?payment_status=success&order_id={order_id}`,
        notify_url: `${process.env.VITE_BACKEND_URL}/api/cashfree/webhook`
      },
      order_note: `${product.title} x ${quantity}`
    };

    const response = await axios.post(
      'https://sandbox.cashfree.com/pg/orders',
      orderData,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2022-01-01',
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
          'x-request-id': Date.now().toString()
        }
      }
    );

    res.json({
      paymentLink: response.data.payment_link
    });
  } catch (error) {
    console.error('Cashfree Order Creation Error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Order creation failed',
      details: error.response?.data || error.message
    });
  }
});

// Verify payment status
router.post('/verify-payment', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    const response = await axios.get(
      `https://sandbox.cashfree.com/pg/orders/${orderId}`,
      {
        headers: {
          'x-api-version': '2022-01-01',
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET
        }
      }
    );

    if (response.data.order_status === 'PAID') {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Payment not completed' });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
});

// Webhook handler
router.post('/webhook', async (req, res) => {
  try {
    // Verify webhook signature
    const webhookSignature = req.headers['x-webhook-signature'];
    const computedSignature = crypto
      .createHmac('sha256', process.env.CASHFREE_CLIENT_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (webhookSignature !== computedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).send('Invalid signature');
    }

    // Process webhook based on event type
    const event = req.body.event;
    const orderId = req.body.order.order_id;

    switch (event) {
      case 'order.paid':
        // Payment successful - you can store this status in your database
        console.log(`Payment successful for order ${orderId}`);
        break;
      case 'order.failed':
        // Payment failed
        console.log(`Payment failed for order ${orderId}`);
        break;
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    res.status(200).json({ status: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;