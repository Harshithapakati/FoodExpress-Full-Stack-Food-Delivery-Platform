const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, forgotPassword, verifyOTP, resetPassword } = require('../controllers/authController');

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
