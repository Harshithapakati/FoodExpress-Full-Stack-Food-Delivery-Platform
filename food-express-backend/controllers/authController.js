const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { sendOTPEmail } = require('../utils/emailService');
const { initFirebase, admin } = require('../firebase/admin');

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

    // Include role in the token so frontend can detect partner/admin clients without extra requests
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    // Best-effort: send a welcome push notification if the user has a saved fcmToken
    (async () => {
      try {
        try { initFirebase(); } catch (e) { console.warn('Firebase init skipped or failed:', e.message); }
        if (user && user.fcmToken && admin && admin.messaging) {
          const message = {
            token: user.fcmToken,
            notification: {
              title: 'Welcome to FoodExpress!',
              body: `Hi ${user.email.split('@')[0] || 'there'}, welcome back!` 
            },
            data: { event: 'welcome', userId: user.id }
          };
          admin.messaging().send(message).then(mid => console.log('Sent welcome FCM messageId:', mid)).catch(async (err) => {
            console.warn('Welcome FCM error:', err);
            try {
              if (err && err.errorInfo && err.errorInfo.code === 'messaging/registration-token-not-registered') {
                console.log('Removing invalid fcmToken for user on login:', user.id || user._id);
                user.fcmToken = null;
                await user.save();
              }
            } catch (cleanupErr) {
              console.warn('Failed to cleanup invalid fcmToken on login:', cleanupErr);
            }
          });
        }
      } catch (err) {
        console.warn('Failed to send welcome push (non-fatal):', err);
      }
    })();

  // Return token and a small user object for immediate client-side use
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
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
