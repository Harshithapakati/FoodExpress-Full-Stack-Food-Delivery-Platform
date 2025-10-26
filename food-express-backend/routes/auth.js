const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login } = require('../controllers/authController');

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

module.exports = router;
