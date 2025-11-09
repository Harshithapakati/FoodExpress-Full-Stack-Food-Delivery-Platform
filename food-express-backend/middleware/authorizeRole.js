const User = require('../models/User');

/**
 * authorizeRole(allowedRoles)
 * Usage: pass an array of allowed roles (e.g. ['partner'])
 */
module.exports = function authorizeRole(allowedRoles = []) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const user = await User.findById(req.user.id);
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
      if (!allowedRoles.includes(user.role) && user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
      }
      // attach full user to request for convenience
      req.currentUser = user;
      next();
    } catch (err) {
      console.error('authorizeRole error', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  };
}
