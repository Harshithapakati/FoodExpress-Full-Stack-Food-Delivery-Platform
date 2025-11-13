// tests/middleware/verifyAdmin.test.js
const verifyAdmin = require('../middleware/verifyAdmin');

describe('verifyAdmin Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should call next() for admin users', () => {
    req.user = { id: '123', role: 'admin' };
    
    verifyAdmin(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject non-admin users with 403', () => {
    req.user = { id: '123', role: 'user' };
    
    verifyAdmin(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Admins only' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject users with no role', () => {
    req.user = { id: '123' };
    
    verifyAdmin(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject when no user object exists', () => {
    req.user = null;
    
    verifyAdmin(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});