const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { sendOTPEmail } = require('../utils/emailService');

// Registration
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user)
      return res.status(400).json({ msg: 'Email already registered' });

    user = new User({ email, password: await bcrypt.hash(password, 12) });
    await user.save();
    res.status(201).json({ msg: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

// Login
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ msg: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ msg: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.json({ token });
  } catch (err) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

// NEW: Request Password Reset (Send OTP)
exports.forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // do not reveal if email exists or not for security
      return res.json({ msg: 'If email exists, OTP has been sent' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP before storing (security best practice)
    const hashedOTP = await bcrypt.hash(otp, 10);
    
    // Set OTP and expiration (10 minutes)
    user.resetOTP = hashedOTP;
    user.resetOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send OTP via email
    await sendOTPEmail(email, otp);

    res.json({ msg: 'OTP sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// NEW: Verify OTP
exports.verifyOTP = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    
    if (!user || !user.resetOTP || !user.resetOTPExpires) {
      return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }

    // Check if OTP has expired
    if (Date.now() > user.resetOTPExpires) {
      user.resetOTP = null;
      user.resetOTPExpires = null;
      await user.save();
      return res.status(400).json({ msg: 'OTP has expired' });
    }

    // Verify OTP
    const isValidOTP = await bcrypt.compare(otp, user.resetOTP);
    if (!isValidOTP) {
      return res.status(400).json({ msg: 'Invalid OTP' });
    }

    res.json({ msg: 'OTP verified successfully', verified: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// NEW: Reset Password
exports.resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    
    if (!user || !user.resetOTP || !user.resetOTPExpires) {
      return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }

    // Check if OTP has expired
    if (Date.now() > user.resetOTPExpires) {
      user.resetOTP = null;
      user.resetOTPExpires = null;
      await user.save();
      return res.status(400).json({ msg: 'OTP has expired' });
    }

    // Verify OTP one last time
    const isValidOTP = await bcrypt.compare(otp, user.resetOTP);
    if (!isValidOTP) {
      return res.status(400).json({ msg: 'Invalid OTP' });
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, 12);
    user.resetOTP = null;
    user.resetOTPExpires = null;
    await user.save();

    res.json({ msg: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server Error' });
  }
};
