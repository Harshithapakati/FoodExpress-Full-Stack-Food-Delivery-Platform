const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Place a new order
router.post('/place', auth, async (req, res) => {
  try {
    console.log("Order payload received:", JSON.stringify(req.body));
    console.log("Authenticated user:", req.user);

    const { restaurantName, items, deliveryAddress, paymentMethod, totalAmount } = req.body;

    // More explicit validation with helpful messages
    const missing = [];
    if (!restaurantName) missing.push('restaurantName');
    if (!items || !Array.isArray(items) || items.length === 0) missing.push('items');
    if (!deliveryAddress) missing.push('deliveryAddress');
    if (!paymentMethod) missing.push('paymentMethod');
    if (totalAmount === undefined || totalAmount === null) missing.push('totalAmount');

    if (missing.length > 0) {
      console.warn('Order validation failed, missing fields:', missing);
      return res.status(400).json({ success: false, error: 'Missing required order fields', missing });
    }

    const order = new Order({
      userId: req.user && (req.user.id || req.user.userId),
      restaurantName,
      items,
      deliveryAddress,
      paymentMethod,
      totalAmount
    });

    try {
      await order.save();
      console.log('Order saved successfully, id:', order._id);
      return res.json({ success: true, order });
    } catch (saveErr) {
      // Mongoose validation or DB error — return details to help debugging (safe for dev)
      console.error('Order save failed:', saveErr);
      const details = saveErr.errors ? Object.keys(saveErr.errors).reduce((acc, k) => { acc[k] = saveErr.errors[k].message; return acc; }, {}) : null;
      return res.status(400).json({ success: false, error: 'Order save failed', message: saveErr.message, details });
    }
  } catch (error) {
    console.error("Order placement failed (unexpected):", error);
    res.status(500).json({ success: false, error: "Order placement failed.", message: error.message });
  }
});


// Fetch order history for logged-in user
router.get('/history', auth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(400).json({ success: false, error: "Cannot fetch orders." });
  }
});

module.exports = router;
