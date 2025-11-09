const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Async authenticate middleware; attaches req.user with id/userId and role (if available)
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Normalize token payload to provide both `id` and `userId` fields
    req.user = {
      ...decoded,
      id: decoded.id || decoded.userId,
      userId: decoded.userId || decoded.id,
      role: decoded.role || null,
    };

    // If role isn't present in token, fetch latest from DB
    if (!req.user.role) {
      try {
        const dbUser = await User.findById(req.user.id || req.user.userId).select('role');
        if (dbUser) req.user.role = dbUser.role;
      } catch (e) {
        console.warn('Failed to fetch user role in auth middleware:', e.message || e);
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = authenticate;
