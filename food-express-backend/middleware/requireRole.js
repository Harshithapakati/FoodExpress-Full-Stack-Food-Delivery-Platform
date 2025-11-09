const User = require('../models/User');

/**
 * requireRole(role)
 * Middleware factory that checks the logged-in user's role.
 * Uses `req.user.id` populated by `auth` middleware.
 */
function requireRole(role) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const user = await User.findById(req.user.id);
      if (!user) return res.status(401).json({ success: false, message: 'User not found' });
      if (user.role !== role) return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
      // expose user document for downstream handlers if needed
      req.currentUser = user;
      next();
    } catch (err) {
      console.error('requireRole error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  };
}

module.exports = requireRole;

