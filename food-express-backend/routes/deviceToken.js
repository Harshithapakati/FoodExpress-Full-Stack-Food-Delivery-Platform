const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const { initFirebase, admin } = require('../firebase/admin');

// Save/update user's FCM device token
router.post('/', authenticate, async (req, res) => {
  try {
    console.log('POST /api/device-token called by user:', req.user && (req.user.id || req.user.userId));
    const { token } = req.body;
    console.log('Device token received:', token ? token.substring(0, 8) + '...' : 'none');
    if (!token) return res.status(400).json({ success: false, message: 'Token is required' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.fcmToken = token;
    await user.save();

    // Best-effort: initialize firebase and send a welcome push to the freshly saved token
    try {
      try { initFirebase(); } catch (e) { console.warn('Firebase init skipped or failed:', e.message); }
      if (admin && admin.messaging) {
        const message = {
          token,
          notification: {
            title: 'Welcome to FoodExpress!',
            body: `Hi ${user.email.split('@')[0] || 'there'}, welcome!`
          },
          data: { event: 'welcome', userId: user.id }
        };
        admin.messaging().send(message).then(mid => console.log('Sent welcome FCM messageId (from device-token save):', mid)).catch(async (err) => {
          console.warn('Welcome FCM error (from device-token save):', err);
          try {
            if (err && err.errorInfo && err.errorInfo.code === 'messaging/registration-token-not-registered') {
              console.log('Removing invalid fcmToken for user (post-save):', user.id || user._id);
              user.fcmToken = null;
              await user.save();
            }
          } catch (cleanupErr) {
            console.warn('Failed to cleanup invalid fcmToken (post-save):', cleanupErr);
          }
        });
      }
    } catch (err) {
      console.warn('Failed to send welcome push after saving token (non-fatal):', err);
    }

    res.status(200).json({ success: true, message: 'FCM token saved' });
  } catch (err) {
    console.error('Error saving device token:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get current user's saved device token (debug endpoint)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user && (req.user.id || req.user.userId);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const user = await User.findById(userId).select('fcmToken email');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, fcmToken: user.fcmToken, email: user.email });
  } catch (err) {
    console.error('GET /api/device-token error:', err.message || err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
