const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    // Accept token from multiple sources (Authorization header, fallback headers, body, query)
    let token = null;
    const authHeader = req.header('Authorization') || req.header('authorization');
    if (authHeader) token = authHeader.replace('Bearer ', '').trim();
    if (!token && req.headers['x-auth-token']) token = req.headers['x-auth-token'];
    if (!token && req.body && req.body.token) token = req.body.token;
    if (!token && req.query && req.query.token) token = req.query.token;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Get user from DB and exclude password
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Admin users always active
    if (user.role === 'admin') {
      if (user.status !== 'active') {
        user.status = 'active';
        await user.save();
      }
    } else if (user.status === 'blocked') {
      // Blocked users cannot access
      return res.status(403).json({ success: false, message: 'account is blocked' });
    }

    // Attach user to request (without password) and add userId for compatibility
    req.user = user;
    req.user.userId = user._id; // Add userId for backward compatibility
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = authenticate;
