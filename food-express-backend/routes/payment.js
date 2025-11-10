const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Initialize Razorpay instance (used when not in mock mode)
let razorpay = null;
function getRazorpayInstance() {
  if (process.env.RAZORPAY_MOCK === 'true') return null; // mock mode skips real instance
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

// Helper: create a Razorpay order (real or mock)
async function createRazorpayOrder(options) {
  if (process.env.RAZORPAY_MOCK === 'true') {
    // Return a deterministic fake order for tests
    return {
      id: 'order_test_mock',
      amount: options.amount,
      currency: options.currency || 'INR',
    };
  }
  const instance = getRazorpayInstance();
  if (!instance) {
    return {
      id: 'order_test_mock',
      amount: options.amount,
      currency: options.currency || 'INR',
    };
  }
  return instance.orders.create(options);
}

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

    const order = await createRazorpayOrder(options);

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

// Handle payment failure - create pending order
router.post('/failed', auth, async (req, res) => {
  try {
    const { items, totalAmount, restaurantName, deliveryAddress, paymentMethod, razorpay_order_id } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Missing order items' });
    }

    // Create order with Pending Payment status
    const order = new Order({
      userId: req.user && (req.user.id || req.user.userId),
      restaurantName: restaurantName || '',
      items: items,
      deliveryAddress: deliveryAddress || '',
      paymentMethod: paymentMethod || 'card',
      totalAmount: totalAmount,
      status: 'Pending Payment',
      razorpayOrderId: razorpay_order_id || ''
    });

    await order.save();
    console.log('Pending order created after payment failure, id:', order._id);

    res.json({ success: true, order, message: 'Order saved with pending payment status' });
  } catch (error) {
    console.error('Failed order creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to save pending order', message: error.message });
  }
});

// Retry payment for pending order
router.post('/retry/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.userId.toString() !== (req.user.id || req.user.userId).toString()) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (order.status !== 'Pending Payment') {
      return res.status(400).json({ success: false, error: 'Order is not pending payment' });
    }

    // Create new Razorpay order for retry
    const options = {
      amount: order.totalAmount * 100,
      currency: 'INR',
    };

    const razorpayOrder = await createRazorpayOrder(options);

    res.json({
      success: true,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      orderDetails: order
    });
  } catch (error) {
    console.error('Payment retry failed:', error);
    res.status(500).json({ success: false, error: 'Failed to retry payment', message: error.message });
  }
});

// Update order status after successful retry
router.post('/retry-verify/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.userId.toString() !== (req.user.id || req.user.userId).toString()) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.error('Retry payment signature verification failed');
      return res.status(400).json({ success: false, error: 'Payment verification failed' });
    }

    // Update order status to Placed
    order.status = 'Placed';
    order.razorpayOrderId = razorpay_order_id;
    await order.save();

    console.log('Order status updated to Placed after retry, id:', order._id);

    res.json({ success: true, order, message: 'Payment verified and order updated successfully' });
  } catch (error) {
    console.error('Retry verification failed:', error);
    res.status(500).json({ success: false, error: 'Retry verification failed', message: error.message });
  }
});

module.exports = router;

