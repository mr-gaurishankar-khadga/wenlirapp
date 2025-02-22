const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');

// In-memory storage to track processed orders
const processedOrders = new Set();

// Create Cashfree order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, customer, product, quantity, processingKey } = req.body;
    
    // Validate required fields
    if (!amount || !customer || !product || !quantity) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['amount', 'customer', 'product', 'quantity']
      });
    }

    // Check if this processing key has already been used
    if (processedOrders.has(processingKey)) {
      return res.status(400).json({ error: 'Duplicate order request' });
    }

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
        return_url: 'https://www.wenli.in/Cashfree?payment_status=success&order_id={order_id}',
        notify_url: 'https://api.wenli.in/api/cashfree/webhook'
      },
      
      order_note: `${product.title} x ${quantity}`
    };

    const response = await axios.post(
      'https://api.cashfree.com/pg/orders',
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

    // Add processing key to prevent duplicate orders
    processedOrders.add(processingKey);

    res.json({
      paymentLink: response.data.payment_link,
      orderId: orderData.order_id
    });
  } catch (error) {
    console.error('Cashfree Order Creation Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    res.status(500).json({
      error: 'Order creation failed',
      details: error.response?.data || error.message
    });
  }
});

// Combined verify payment and create Shiprocket order endpoint
router.post('/verify-and-create-order', async (req, res) => {
  try {
    const { orderId, orderDetails, processingKey } = req.body;
    
    // Validate required fields
    if (!orderId || !orderDetails || !processingKey) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['orderId', 'orderDetails', 'processingKey']
      });
    }

    // Check if this processing key has already been used
    if (!processedOrders.has(processingKey)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired processing key' 
      });
    }

    // Remove the processing key to prevent reuse
    processedOrders.delete(processingKey);
    
    // First verify Cashfree payment
    const paymentResponse = await axios.get(
      `https://api.cashfree.com/pg/orders/${orderId}`,
      {
        headers: {
          'x-api-version': '2022-01-01',
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET
        }
      }
    );

    if (paymentResponse.data.order_status !== 'PAID') {
      return res.json({ 
        success: false, 
        message: 'Payment not completed',
        status: paymentResponse.data.order_status 
      });
    }

    // Create Shiprocket order after payment verification
    const loginResponse = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: process.env.SHIPROCKET_EMAIL || 'wenliFashions.in@gmail.com',
      password: process.env.SHIPROCKET_PASSWORD || '#Wenli@123#45'
    });

    if (!loginResponse.data.token) {
      throw new Error('Shiprocket authentication failed');
    }

    const token = loginResponse.data.token;
    const shiprocketOrderId = `WF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const shiprocketOrderData = {
      order_id: shiprocketOrderId,
      order_date: new Date().toISOString().split('T')[0],
      pickup_location: "Home",
      channel_id: "5794009",
      billing_customer_name: orderDetails.name,
      billing_last_name: "NA",
      billing_address: orderDetails.address,
      billing_city: orderDetails.city,
      billing_pincode: orderDetails.pincode,
      billing_state: orderDetails.state,
      billing_country: "India",
      billing_email: orderDetails.email,
      billing_phone: orderDetails.phone,
      shipping_is_billing: true,
      order_items: [
        {
          name: orderDetails.product.title,
          sku: `SKU-${orderDetails.product.id || Date.now()}`,
          units: parseInt(orderDetails.quantity),
          selling_price: parseFloat(orderDetails.product.price),
          discount: 0,
          tax: 18,
          hsn: 621710
        }
      ],
      payment_method: "Prepaid",
      sub_total: parseFloat(orderDetails.product.price) * parseInt(orderDetails.quantity),
      length: 10,
      breadth: 5,
      height: 2,
      weight: 0.5
    };

    const createOrderResponse = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
      shiprocketOrderData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const finalOrderData = {
      ...orderDetails,
      id: createOrderResponse.data.order_id,
      shipmentId: createOrderResponse.data.shipment_id,
      orderDate: new Date().toISOString(),
      status: 'Confirmed'
    };

    res.json({
      success: true,
      orderData: finalOrderData
    });

  } catch (error) {
    console.error('Order processing failed:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    res.status(500).json({
      success: false,
      error: 'Order processing failed',
      details: error.response?.data || error.message
    });
  }
});

// Webhook handler
router.post('/webhook', async (req, res) => {
  try {
    const webhookSignature = req.headers['x-webhook-signature'];
    const computedSignature = crypto
      .createHmac('sha256', process.env.CASHFREE_CLIENT_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (webhookSignature !== computedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).send('Invalid signature');
    }

    const event = req.body.event;
    const orderId = req.body.order.order_id;

    switch (event) {
      case 'order.paid':
        console.log(`Payment successful for order ${orderId}`);
        break;
      case 'order.failed':
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