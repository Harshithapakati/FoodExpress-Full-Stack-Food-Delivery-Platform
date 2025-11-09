const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order
router.post('/order', auth, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    res.status(500).json({ success: false, error: 'Failed to create payment order', message: error.message });
  }
});

// Verify payment and create order
router.post('/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, totalAmount, restaurantName, deliveryAddress, paymentMethod } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment verification data' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Missing order items' });
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.error('Payment signature verification failed');
      return res.status(400).json({ success: false, error: 'Payment verification failed' });
    }

    // Signature is valid - create order in database
    const order = new Order({
      userId: req.user && (req.user.id || req.user.userId),
      restaurantName: restaurantName || '',
      items: items,
      deliveryAddress: deliveryAddress || '',
      paymentMethod: paymentMethod || 'card',
      totalAmount: totalAmount,
      status: 'Placed',
    });

    await order.save();
    console.log('Order saved successfully after payment verification, id:', order._id);

    res.json({ success: true, order, message: 'Payment verified and order created successfully' });
  } catch (error) {
    console.error('Payment verification failed:', error);
    res.status(500).json({ success: false, error: 'Payment verification failed', message: error.message });
  }
});

module.exports = router;

