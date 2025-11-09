const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, forgotPassword, verifyOTP, resetPassword } = require('../controllers/authController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const User = require('../models/User');
const mongoose = require('mongoose');

// Registration Route
router.post(
  '/register',
  [
    body('email', 'Valid email required').isEmail(),
    body('password', 'Password min 6 chars').isLength({ min: 6 }),
  ],
  register
);

// Login Route
router.post(
  '/login',
  [
    body('email', 'Valid email required').isEmail(),
    body('password', 'Password required').exists(),
  ],
  login
);

// Forgot Password - Send OTP
router.post(
  '/forgot-password',
  [
    body('email', 'Valid email required').isEmail(),
  ],
  forgotPassword
);

// Verify OTP
router.post(
  '/verify-otp',
  [
    body('email', 'Valid email required').isEmail(),
    body('otp', 'OTP required').isLength({ min: 6, max: 6 }),
  ],
  verifyOTP
);

// Reset Password
router.post(
  '/reset-password',
  [
    body('email', 'Valid email required').isEmail(),
    body('otp', 'OTP required').isLength({ min: 6, max: 6 }),
    body('newPassword', 'Password min 6 chars').isLength({ min: 6 }),
  ],
  resetPassword
);

module.exports = router;

// Admin-only: promote a user to a role (e.g., 'partner') for onboarding/testing
router.post('/promote', auth, requireRole('admin'), async (req, res) => {
  try {
    // DEV DEBUG: log incoming context to help diagnose issues when requests fail
    try { console.log('PROMOTE endpoint called by:', req.user ? { id: req.user.id, role: req.user.role, userId: req.user.userId } : null); } catch(e){}
    try { console.log('PROMOTE body:', req.body); } catch(e){}
    // Accept either userId (ObjectId) or email for convenience
    const { userId, role, email } = req.body || {};
    if ((!userId && !email) || !role) return res.status(400).json({ success: false, message: 'userId or email and role are required' });
    if (!['customer', 'partner', 'admin'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });

    let user = null;
    if (userId) {
      // Validate ObjectId before querying to avoid CastError
      if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ success: false, message: 'Invalid userId format' });
      user = await User.findById(userId);
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.role = role;
    await user.save();
    return res.json({ success: true, message: `User ${user.email} promoted to ${role}`, userId: user._id });
  } catch (err) {
    // Log and return error details for debugging (development only)
    console.error('Promote user error:', err && err.stack ? err.stack : err);
    const errMsg = err && err.message ? err.message : String(err);
    const errStack = err && err.stack ? err.stack : null;
    res.status(500).json({ success: false, message: 'Server error', error: errMsg, stack: errStack });
  }
});
