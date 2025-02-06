// shiprocketRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

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

module.exports = router;