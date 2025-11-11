const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  try {
    // Accept token from multiple sources to be tolerant during development and
    // cross-origin situations where Authorization header might be unavailable.
    let token = null;
    const authHeader = req.header('Authorization') || req.header('authorization');
    if (authHeader) token = authHeader.replace('Bearer ', '').trim();
    // fallback headers
    if (!token && req.headers['x-auth-token']) token = req.headers['x-auth-token'];
    // fallback to body or query
    if (!token && req.body && req.body.token) token = req.body.token;
    if (!token && req.query && req.query.token) token = req.query.token;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Normalize token payload to provide both `id` and `userId` fields
    req.user = {
      ...decoded,
      id: decoded.id || decoded.userId,
      userId: decoded.userId || decoded.id,
    };
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = authenticate ;
