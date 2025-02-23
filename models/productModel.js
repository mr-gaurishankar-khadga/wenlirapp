const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: String,
  slug: {
    type: String,
    unique: true,
  },

  categories: String,
  description: String,
  minitext1: String,
  minitext2: String,
  minitext3: String,
  minitext4: String,
  minitext5: String,
  minitext6: String,
  price: Number,
  selling_price: Number,
  discount: Number,
  tax: Number,
  discount_amount: Number,
  tax_amount: Number,
  sub_total: Number,
  sizes: [String],
  colors: [String],
  quantity: Number,
  frontImage: String,
  backImage: String,
  extraImage1: String,
  extraImage2: String,
  extraImage3: String,
  extraImage4: String,
  sku: {
    type: String,
    required: true
  },
  weight1: {
    type: Number,
    required: true
  },
  hsn_code: {
    type: String,
    required: true
  },
  brand_name: {
    type: String,
    required: true
  },
  length: {
    type: Number,
    required: true
  },
  width2: {
    type: Number,
    required: true
  },
  height: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    require: true,
  },
  stock_quantity: {
    type: Number,
    required: true
  },
  low_stock_threshold: {
    type: Number,
    default: 10,
  },
  package_dimensionslength: {
    package_dimensionslength: Number,
  },
  package_dimensionsheight: {
    package_dimensionsheight: Number,
  },
  package_dimensionswidth: {
    package_dimensionswidth: Number,
  },
  shipping_mode: {
    type: String,
  },
  origin_pincode: {
    type: String,
  },
  pickup_location: {
    pickup_location: String
  },
  gst_percentage: {
    type: Number,
  },
  status: {
    type: String,
  }
});

// Modify the slug generation to be more robust
productSchema.pre('save', function(next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
    
    // Add timestamp to ensure uniqueness if needed
    if (!this.isNew) {
      this.slug += `-${Date.now()}`;
    }
  }
  next();
});

// Add compound index for better search performance
productSchema.index({ slug: 1, title: 1 });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;