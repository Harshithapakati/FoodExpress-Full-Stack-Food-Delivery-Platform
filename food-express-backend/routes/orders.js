const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { initFirebase, admin } = require('../firebase/admin');
const { sendOrderConfirmation } = require('../utils/emailService');

// Place a new order with validation and proper notification handling
router.post('/place', auth, async (req, res) => {
  try {
    console.log('Order payload received:', JSON.stringify(req.body));
    console.log('Authenticated user:', req.user);

    const { restaurantName, items, deliveryAddress, paymentMethod, totalAmount } = req.body;
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

    if (paymentMethod === 'card') {
      return res.status(400).json({
        success: false,
        error: 'Card payments must go through payment gateway. Please use Razorpay checkout.'
      });
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

      try {
        const user = await User.findById(order.userId);
        if (user && user.email) {
          await sendOrderConfirmation(user.email, order);
          console.log('Order confirmation email sent to', user.email);
        }
        try { initFirebase(); } catch (e) {
          console.warn('Firebase init skipped or failed:', e.message);
        }
        if (user && user.fcmToken) {
          const message = {
            token: user.fcmToken,
            notification: {
              title: 'Order Placed',
              body: `Your order ${order._id} has been placed successfully.`
            },
            data: {
              userId: (order.userId && order.userId.toString) ? order.userId.toString() : String(order.userId || user._id || user.id),
              orderId: order._id.toString(),
              status: order.status || 'received',
              url: `/order-history?orderId=${order._id}`
            }
          };
          try {
            const resp = await admin.messaging().send(message);
            console.log('Sent FCM order-placement messageId:', resp);
          } catch (fcmErr) {
            console.error('FCM send error:', fcmErr);
            if (
              fcmErr?.errorInfo?.code === 'messaging/registration-token-not-registered' &&
              user
            ) {
              user.fcmToken = null;
              await user.save();
            }
          }
        }
      } catch (emailErr) {
        console.error('Failed to send order confirmation email:', emailErr);
      }

      return res.json({ success: true, order });
    } catch (saveErr) {
      console.error('Order save failed:', saveErr);
      const details = saveErr.errors
        ? Object.keys(saveErr.errors).reduce((acc, k) => {
            acc[k] = saveErr.errors[k].message;
            return acc;
          }, {})
        : null;

      return res.status(400).json({
        success: false,
        error: 'Order save failed',
        message: saveErr.message,
        details
      });
    }
  } catch (error) {
    console.error('Order placement failed:', error);
    res.status(500).json({
      success: false,
      error: 'Order placement failed.',
      message: error.message
    });
  }
});

// Fetch order history for the logged-in user
router.get('/history', auth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Cannot fetch orders.' });
  }
});

// Update order status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.status = status;
    await order.save();

    try { initFirebase(); } catch (e) {
      console.warn('Firebase init skipped or failed:', e.message);
    }

    const user = await User.findById(order.userId);

    if (user && user.fcmToken) {
      console.log(
        'Found user token for notifications:',
        user.fcmToken ? user.fcmToken.substring(0, 8) + '...' : 'none'
      );

      const data = {
        userId: (order.userId && order.userId.toString) ? order.userId.toString() : String(order.userId || ''),
        orderId: order._id.toString(),
        status,
        url: `/order-history?orderId=${order._id}`
      };

      let notificationPayload = {};

      if (status === 'reached_restaurant') {
        const restaurantName = order.restaurantName || '';
        notificationPayload = {
          title: `Reached ${restaurantName}`,
          body: `Your order ${order._id} has reached ${restaurantName}.`
        };
        data.reached_restaurant = restaurantName;
      } else {
        notificationPayload = {
          title: `Order ${status}`,
          body: `Your order ${order._id} status changed to ${status}`
        };
      }

      try {
        const message = {
          token: user.fcmToken,
          notification: notificationPayload,
          data
        };
        const resp = await admin.messaging().send(message);
        console.log('Sent FCM messageId:', resp);
      } catch (err) {
        console.error('FCM send error:', err);
        if (
          err?.errorInfo?.code === 'messaging/registration-token-not-registered' &&
          user
        ) {
          user.fcmToken = null;
          await user.save();
        }
      }
    }

    // Send email when order confirmed
    try {
      if (order.status?.toLowerCase() === 'confirmed') {
        if (user && user.email) {
          await sendOrderConfirmation(user.email, order);
          console.log('Order confirmation email sent');
        }
      }
    } catch (emailErr) {
      console.error('Email error:', emailErr);
    }

    return res.json({ success: true, order });
  } catch (error) {
    console.error('Update status failed:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
