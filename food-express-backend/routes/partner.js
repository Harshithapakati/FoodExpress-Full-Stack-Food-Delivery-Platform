const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { initFirebase, admin } = require('../firebase/admin');

// Helper: send FCM to order owner (best-effort)
async function notifyUserForOrder(order, title, body, extraData = {}) {
  try {
    const user = await User.findById(order.userId);
    if (!user || !user.fcmToken) return;
    try { initFirebase(); } catch (e) { console.warn('Firebase init skipped or failed:', e.message); }
    const message = {
      token: user.fcmToken,
      notification: { title, body },
      data: Object.assign({ orderId: order._id.toString(), status: order.status, url: `/order-history?orderId=${order._id}` }, extraData)
    };
    const resp = await admin.messaging().send(message);
    console.log('Partner notify: FCM sent messageId:', resp);
  } catch (err) {
    console.error('Partner notify: FCM error:', err && err.message ? err.message : err);
    try {
      if (err && err.errorInfo && err.errorInfo.code === 'messaging/registration-token-not-registered') {
        const user = await User.findById(order.userId);
        if (user) {
          user.fcmToken = null;
          await user.save();
        }
      }
    } catch (cleanupErr) {
      console.warn('Failed to cleanup invalid fcmToken after partner notify:', cleanupErr);
    }
  }
}

// GET /api/partner/available - list orders awaiting assignment
router.get('/available', auth, requireRole('partner'), async (req, res) => {
  try {
    const orders = await Order.find({ deliveryPartner: null, status: { $regex: /^placed$/i } }).sort({ createdAt: 1 });
    res.json({ success: true, orders });
  } catch (err) {
    console.error('partner/available error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/partner/assigned - list orders assigned to this partner
router.get('/assigned', auth, requireRole('partner'), async (req, res) => {
  try {
    const orders = await Order.find({ deliveryPartner: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    console.error('partner/assigned error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/partner/:orderId/accept - accept and assign the order to logged-in partner
router.post('/:orderId/accept', auth, requireRole('partner'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.deliveryPartner) return res.status(400).json({ success: false, message: 'Order already assigned' });

    order.deliveryPartner = req.user.id;
    order.status = 'accepted';
    order.tracking = order.tracking || {};
    order.tracking.accepted = new Date();
    await order.save();

  // notify customer
  await notifyUserForOrder(order, 'Order Accepted', `Your order ${order._id} has been accepted by a delivery partner.`);

    res.json({ success: true, order });
  } catch (err) {
    console.error('partner accept error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/partner/:orderId/status - update a milestone status
router.put('/:orderId/status', auth, requireRole('partner'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const allowed = ['accepted','reached_restaurant','picked_up','out_for_delivery','reached_destination','delivered'];
    if (!status || !allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!order.deliveryPartner || order.deliveryPartner.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Order not assigned to you' });

    order.status = status;
    order.tracking = order.tracking || {};
    // set the appropriate timestamp
    order.tracking[status] = new Date();

    await order.save();

    // notify customer
    // Compose readable status and include restaurant name for reached_restaurant
    let human = status.replace(/_/g, ' ');
    let body = `Your order ${order._id} status: ${human}`;
    let title = `Order ${human}`;
    if (status === 'reached_restaurant') {
      // required exact format: "reached restaurant <restaurant_name>"
      const restaurantName = order.restaurantName || '';
      const reachedText = `reached restaurant ${restaurantName}`;
      human = reachedText;
      title = `Order update`;
      body = `Your order ${order._id} ${reachedText}`;
      await notifyUserForOrder(order, title, body, { reached_restaurant: restaurantName });
    } else {
      await notifyUserForOrder(order, title, body);
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error('partner status update error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
