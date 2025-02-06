// shiprocketRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const Payment = require('../models/paymentModel'); 

// Shiprocket credentials
const SHIPROCKET_EMAIL = 'wenliFashions.in@gmail.com';
const SHIPROCKET_PASSWORD = '#Wenli@123#45';

// Get Shiprocket token
async function getShiprocketToken() {
  try {
    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: SHIPROCKET_EMAIL,
      password: SHIPROCKET_PASSWORD
    });
    return response.data.token;
  } catch (error) {
    console.error('Shiprocket authentication failed:', error);
    throw new Error('Failed to authenticate with Shiprocket');
  }
}

// Create Shiprocket order
router.post('/create-order', async (req, res) => {
  try {
    const { orderData, orderId } = req.body;

    // Get Shiprocket token
    const token = await getShiprocketToken();

    // Prepare order data for Shiprocket
    const shiprocketOrderData = {
      order_id: orderId || `WF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order_date: new Date().toISOString().split('T')[0],
      pickup_location: "Home",
      channel_id: "5794009",
      billing_customer_name: orderData.name,
      billing_last_name: orderData.lastName || "NA",
      billing_address: orderData.address,
      billing_city: orderData.city,
      billing_pincode: orderData.pincode,
      billing_state: orderData.state,
      billing_country: "India",
      billing_email: orderData.email,
      billing_phone: orderData.phone,
      shipping_is_billing: true,
      order_items: [
        {
          name: orderData.product.title,
          sku: `SKU-${orderData.product.id || Date.now()}`,
          units: parseInt(orderData.quantity),
          selling_price: parseFloat(orderData.product.price),
          discount: 0,
          tax: 18,
          hsn: 621710
        }
      ],
      payment_method: orderData.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
      sub_total: parseFloat(orderData.product.price) * parseInt(orderData.quantity),
      length: 10,
      breadth: 5,
      height: 2,
      weight: 0.5
    };

    // Create order in Shiprocket
    const response = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
      shiprocketOrderData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    res.json({
      orderId: response.data.order_id,
      shipmentId: response.data.shipment_id,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Shiprocket order creation failed:', error);
    res.status(500).json({
      message: error.message || 'Failed to create Shiprocket order'
    });
  }
});













// Cancel order
router.post('/cancel-order', async (req, res) => {
    try {
      const { orderId } = req.body;
      
      // First, get the payment record to verify the Shiprocket order ID
      const payment = await Payment.findById(orderId);
      if (!payment) {
        return res.status(404).json({ message: 'Order not found' });
      }
  
      if (!payment.shiprocketOrderId) {
        return res.status(400).json({ message: 'No Shiprocket order ID found for this order' });
      }
  
      const token = await getShiprocketToken();
  
      // Cancel order in Shiprocket
      const cancelResponse = await axios.post(
        'https://apiv2.shiprocket.in/v1/external/orders/cancel',
        {
          ids: [payment.shiprocketOrderId],
          cancellation_reason: 'Cancelled by customer'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
  
      // Update order status in database
      payment.status = 'Cancelled';
      await payment.save();
  
      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: cancelResponse.data
      });
  
    } catch (error) {
      console.error('Order cancellation failed:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        success: false,
        message: error.response?.data?.message || 'Failed to cancel order',
        error: error.response?.data || error.message
      });
    }
  });
  
  // Create return request
  router.post('/create-return', async (req, res) => {
    try {
      const { orderId } = req.body;
      
      // First, get the payment record
      const payment = await Payment.findById(orderId);
      if (!payment) {
        return res.status(404).json({ message: 'Order not found' });
      }
  
      if (!payment.shiprocketOrderId) {
        return res.status(400).json({ message: 'No Shiprocket order ID found for this order' });
      }
  
      const token = await getShiprocketToken();
  
      // Create return request in Shiprocket
      const returnResponse = await axios.post(
        'https://apiv2.shiprocket.in/v1/external/orders/create/return',
        {
          order_id: payment.shiprocketOrderId,
          order_date: new Date(payment.timestamp).toISOString().split('T')[0],
          channel_id: "5794009",
          return_reason: 'Customer initiated return',
          shipping_method_id: "1"
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
  
      // Update order status in database
      payment.status = 'Return Requested';
      await payment.save();
  
      res.json({
        success: true,
        message: 'Return request created successfully',
        data: returnResponse.data
      });
  
    } catch (error) {
      console.error('Return request failed:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        success: false,
        message: error.response?.data?.message || 'Failed to create return request',
        error: error.response?.data || error.message
      });
    }
  });
  



















module.exports = router;