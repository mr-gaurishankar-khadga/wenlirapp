const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');

// In-memory storage to track processed orders
const processedOrders = new Set();

// Helper function to validate Cashfree credentials
const validateCashfreeCredentials = async () => {
  try {
    // Testing credentials by creating a small test order instead of GET request
    const testOrderData = {
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
    };

    await axios.post(
      'https://api.cashfree.com/pg/orders',
      testOrderData,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2022-01-01',
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET
        }
      }
    );
    return true;
  } catch (error) {
    console.error('Cashfree Credential Validation Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return false;
  }
};

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
        return_url: `${process.env.CLIENT_URL}/Cashfree?payment_status=success&order_id={order_id}`,
        notify_url: `${process.env.VITE_BACKEND_URL}/api/cashfree/webhook`
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
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET
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

// Verify payment and create Shiprocket order
router.post('/verify-payment', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    const response = await axios.get(
      `https://api.cashfree.com/pg/orders/${orderId}`,
      {
        headers: {
          'x-api-version': '2022-01-01',
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET
        }
      }
    );

    res.json({
      status: response.data.order_status,
      details: response.data
    });
  } catch (error) {
    console.error('Payment verification error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Payment verification failed',
      details: error.response?.data || error.message
    });
  }
});
// Create Shiprocket order
router.post('/create-shipping', async (req, res) => {
  try {
    const { orderDetails } = req.body;

    // Create Shiprocket order with improved error handling
    try {
      const loginResponse = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
        email: 'wenliFashions.in@gmail.com',
        password: '#Wenli@123#45'
      });

      if (!loginResponse.data || !loginResponse.data.token) {
        console.error('Shiprocket login failed:', loginResponse.data);
        return res.status(500).json({
          success: false,
          error: 'Shiprocket authentication failed'
        });
      }

      const token = loginResponse.data.token;
      
      // Create a more reliable order ID
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const shiprocketOrderId = `WF-${dateStr}-${Math.random().toString(36).substring(2, 10)}`;

      // Ensure numeric values are properly converted
      const quantity = parseInt(orderDetails.quantity, 10) || 1;
      const unitPrice = parseFloat(orderDetails.product.price) || 0;

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
            units: quantity,
            selling_price: unitPrice,
            discount: 0,
            tax: 18,
            hsn: 621710
          }
        ],
        payment_method: "Prepaid",
        sub_total: unitPrice * quantity,
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

      if (!createOrderResponse.data || createOrderResponse.data.status !== 1) {
        console.error('Shiprocket order creation failed:', createOrderResponse.data);
        return res.status(500).json({
          success: false,
          error: 'Shiprocket order creation failed',
          details: createOrderResponse.data
        });
      }

      res.json({
        success: true,
        orderData: {
          id: createOrderResponse.data.order_id,
          shipmentId: createOrderResponse.data.shipment_id,
          shiprocketOrderId: shiprocketOrderId,
          orderDate: new Date().toISOString(),
          status: 'Confirmed'
        }
      });
    } catch (shiprocketError) {
      console.error('Shiprocket API error:', {
        message: shiprocketError.message,
        response: shiprocketError.response?.data,
        status: shiprocketError.response?.status
      });
      
      return res.status(500).json({
        success: false,
        error: 'Shiprocket API error',
        details: shiprocketError.response?.data || shiprocketError.message
      });
    }
  } catch (error) {
    console.error('Shipping order creation failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Shipping order creation failed',
      details: error.message
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

    console.log('Webhook received:', {
      event,
      orderId,
      data: req.body
    });

    res.status(200).json({ status: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;