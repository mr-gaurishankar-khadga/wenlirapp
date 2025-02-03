require('dotenv').config();
const axios = require('axios');

class CashfreePayment {
  constructor() {
    this.clientId = process.env.CASHFREE_CLIENT_ID;
    this.clientSecret = process.env.CASHFREE_CLIENT_SECRET;
    this.apiVersion = '2022-09-01';
    this.baseURL = 'https://sandbox.cashfree.com/pg';
  }

  async createOrder({ amount, customerName, customerEmail, customerPhone }) {
    try {
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
        order_tags: {
          payment_methods: "cc,dc,nb,upi,wallet"
        }
      };

      const response = await axios.post(
        `${this.baseURL}/orders`,
        orderData,
        {
          headers: {
            'x-client-id': this.clientId,
            'x-client-secret': this.clientSecret,
            'x-api-version': this.apiVersion,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw {
        message: 'Payment initialization failed',
        details: error.response?.data || error.message
      };
    }
  }
}

module.exports = new CashfreePayment();