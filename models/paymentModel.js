

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // orderId: { type: String, required: true, unique: true },
  product: { type: Object },

  quantity: { type: Number},

  paymentMethod: { type: String },

  price: { type: Number},

  size:String,
  status:String,


  
  address: { type: String },
  secAddress: { type: String },
  pincode: { type: String },
  buiding:{ type:String },
  state:{type:String},
  city:{type:String},
  
  shiprocketOrderId: String,
  shipmentId: String,




  email: { type: String},

  name:{ type: String},

  phone:{ type: Number},

  shiprocketOrderId: {
    type: String,
    trim: true
  },
  shipmentId: {
    type: String,
    trim: true
  },

  

  timestamp: { type: Date, default: Date.now }

});

module.exports = mongoose.model('Payment', paymentSchema);