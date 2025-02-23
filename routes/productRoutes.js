const express = require('express');
const router = express.Router();
const multer = require('multer');
const Product = require('../models/productModel');



const upload = multer({ dest: 'uploads/' });



router.post('/', upload.fields([
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 },
  { name: 'f3', maxCount: 1 },
  { name: 'f4', maxCount: 1 },
  { name: 'f5', maxCount: 1 },
  { name: 'f6', maxCount: 1 },
]), async (req, res) => {
  try {
    const { 
      title, 
      categories, 
      description, 
      minitext1, 
      minitext2, 
      minitext3, 
      minitext4, 
      minitext5, 
      minitext6, 
      price, 
      sizes, 
      colors, 
      quantity, 
      discount, 
      brand_name, 
      hsn_code, 
      sku, 
      weight1,
      
      height,
      width2,
      length,
      unit,

      //third
      stock_quantity,
      low_stock_threshold,

      //four
      package_dimensionslength,
      package_dimensionsheight,
      package_dimensionswidth,
      shipping_mode,
      origin_pincode,
      pickup_location,
      gst_percentage,
      status,

    } = req.body;

    const frontImage = req.files['front'] ? req.files['front'][0].path : null;
    const backImage = req.files['back'] ? req.files['back'][0].path : null;
    const extraImage1 = req.files['f3'] ? req.files['f3'][0].path : null;
    const extraImage2 = req.files['f4'] ? req.files['f4'][0].path : null;
    const extraImage3 = req.files['f5'] ? req.files['f5'][0].path : null;
    const extraImage4 = req.files['f6'] ? req.files['f6'][0].path : null;

    const newProduct = new Product({
      title,
      categories,
      description,
      minitext1,
      minitext2,
      minitext3,
      minitext4,
      minitext5,
      minitext6,
      price,
      sizes: Array.isArray(sizes) ? sizes : sizes.split(','),
      colors: Array.isArray(colors) ? colors : colors.split(','),
      quantity,
      discount,
      frontImage,
      backImage,
      extraImage1,
      extraImage2,
      extraImage3,
      extraImage4,

      sku,
      weight1,
      hsn_code,
      brand_name,

      length,
      width2,
      height,
      unit,

      //third
      stock_quantity,
      low_stock_threshold,

      //fourth
      package_dimensionslength,
      package_dimensionsheight,
      package_dimensionswidth,
      shipping_mode,
      origin_pincode,
      pickup_location,
      gst_percentage,
      status

    });

    await newProduct.save();

    res.status(200).json({ message: 'Product uploaded successfully', product: newProduct });
  } catch (error) {
    console.error('Error saving product:', error);
    res.status(500).json({ message: 'Error saving product', error });
  }
});

// Update your existing GET route in products.js to handle pagination and search
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 100; 
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { brand_name: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const products = await Product.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.status(200).json({ 
      products,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + products.length < total
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products', error });
  }
});



// productRoutes.js - Update the title search route
router.get('/title/:title', async (req, res) => {
  try {
    const decodedTitle = decodeURIComponent(req.params.title);
    console.log('Searching for product:', decodedTitle);

    // Create the slug format for search
    const searchSlug = decodedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');

    // More comprehensive search
    const product = await Product.findOne({
      $or: [
        { slug: searchSlug },
        { title: decodedTitle },
        { title: new RegExp('^' + decodedTitle.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }
      ]
    });

    if (!product) {
      console.log('Product not found for:', decodedTitle);
      return res.status(404).json({ 
        message: 'Product not found',
        searchedTitle: decodedTitle 
      });
    }

    // If found, update slug if it's missing
    if (!product.slug) {
      product.slug = searchSlug;
      await product.save();
    }

    res.json(product);
  } catch (error) {
    console.error('Error in product search:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});






router.put('/:id', upload.fields([
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 },
  { name: 'f3', maxCount: 1 },
  { name: 'f4', maxCount: 1 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      categories, 
      description, 
      minitext1, 
      minitext2, 
      minitext3, 
      minitext4, 
      minitext5, 
      minitext6, 
      price, 
      sizes, 
      colors, 
      quantity, 
      discount, 
      brand_name, 
      hsn_code, 
      sku, 

      weight1,
      length,
      width2,
      height,
      unit,

      //third
      stock_quantity,
      low_stock_threshold,


      //fourth

      package_dimensionslength,
      package_dimensionsheight,
      package_dimensionswidth,
      shipping_mode,
      origin_pincode,
      pickup_location,
      gst_percentage,
      status


    } = req.body;

    const frontImage = req.files && req.files['front'] ? req.files['front'][0].path : req.body.existingFrontImage;
    const backImage = req.files && req.files['back'] ? req.files['back'][0].path : req.body.existingBackImage;
    const extraImage1 = req.files && req.files['f3'] ? req.files['f3'][0].path : req.body.existingExtraImage1;
    const extraImage2 = req.files && req.files['f4'] ? req.files['f4'][0].path : req.body.existingExtraImage2;

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        title,
        categories,
        description,
        minitext1,
        minitext2,
        minitext3,
        minitext4,
        minitext5,
        minitext6,
        price,
        sizes: Array.isArray(sizes) ? sizes : sizes.split(','),
        colors: Array.isArray(colors) ? colors : colors.split(','),
        quantity,
        discount,
        frontImage,
        backImage,
        extraImage1,
        extraImage2,


        sku,
        weight1,
        hsn_code,
        brand_name,

        length,
        width2,
        height,
        unit,

        //third 
        stock_quantity,
        low_stock_threshold,


        //fourth
        package_dimensionslength,
        package_dimensionsheight,
        package_dimensionswidth,
        shipping_mode,
        origin_pincode,
        pickup_location,
        gst_percentage,
        status
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product', error });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.get('/search', async (req, res) => {
  const query = req.query.query;
  try {
    const products = await Product.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    });
    res.json(products);
  } catch (error) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;

//done