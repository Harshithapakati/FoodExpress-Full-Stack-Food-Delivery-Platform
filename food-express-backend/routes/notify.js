const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const { admin } = require('../firebase/admin');

// Send a test notification to the authenticated user
router.post('/test', authenticate, async (req, res) => {
  try {
    const userId = req.user && (req.user.id || req.user.userId);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.fcmToken) return res.status(400).json({ success: false, message: 'No device token registered for user' });

    const payload = {
      notification: {
        title: 'Test Notification',
        body: 'This is a test push notification from FoodExpress.'
      },
      data: {
        test: 'true'
      }
    };

    try {
      // Debug: log admin app options and service account project id (if available)
      try {
        const app = admin.app ? admin.app() : null;
        console.log('Firebase Admin app options:', app ? app.options : null);
      } catch (dbg) {
        console.warn('Could not read admin.app options:', dbg && dbg.message ? dbg.message : dbg);
      }

      try {
        const path = require('path');
        const saPath = process.env.SERVICE_ACCOUNT_PATH;
        if (saPath) {
          const resolved = path.isAbsolute(saPath) ? saPath : path.resolve(__dirname, '..', saPath);
          const sa = require(resolved);
          console.log('Service account project_id:', sa.project_id || '(none)');
        }
      } catch (dbg) {
        console.warn('Could not read service account JSON for debug:', dbg && dbg.message ? dbg.message : dbg);
      }

      // Prefer the v1 API via admin.messaging().send with a message object
      const message = {
        token: user.fcmToken,
        notification: payload.notification,
        data: payload.data
      };

      const resp = await admin.messaging().send(message);
      console.log('Test FCM send result (messageId):', resp);
      return res.json({ success: true, messageId: resp });
    } catch (err) {
      // Log full error for debugging
      console.error('Test FCM send error (full):', err);
      try {
        console.error('Error details (JSON):', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      } catch (e) {
        // ignore stringify errors
      }
      return res.status(500).json({ success: false, message: 'FCM send error', error: err });
    }
  } catch (error) {
    console.error('Notify/test failed:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
