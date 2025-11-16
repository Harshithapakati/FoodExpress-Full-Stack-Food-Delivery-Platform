// tests/coverage.branches.test.js
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
let app;

let mongo, token, userEmail, blockedUserEmail, blockedToken;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
  process.env.RAZORPAY_MOCK = 'true';
  process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
  process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_key';

  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  await connectDB();
  app = require('../app');

  // Create regular user
  userEmail = `branch_test_${Date.now()}@test.com`;
  await request(app).post('/api/auth/register').send({ email: userEmail, password: 'Pass1234' });
  const login = await request(app).post('/api/auth/login').send({ email: userEmail, password: 'Pass1234' });
  token = login.body.token;

  // Create blocked user
  blockedUserEmail = `blocked_${Date.now()}@test.com`;
  await request(app).post('/api/auth/register').send({ email: blockedUserEmail, password: 'Pass1234' });
  const blockedLogin = await request(app).post('/api/auth/login').send({ email: blockedUserEmail, password: 'Pass1234' });
  blockedToken = blockedLogin.body.token;
  
  // Block the user
  const blockedUser = await User.findOne({ email: blockedUserEmail });
  blockedUser.status = 'blocked';
  await blockedUser.save();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('AuthController - Missing Branch Coverage', () => {
  test('Register with validation errors (empty email)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: '', password: 'Pass1234' });
    expect(res.status).toBe(400);
  });

  test('Register with duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: userEmail, password: 'Pass1234' });
    expect(res.status).toBe(400);
    expect(res.body.msg).toContain('already registered');
  });

  test('Login with validation errors (empty email)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '', password: 'Pass1234' });
    expect(res.status).toBe(400);
  });

  test('Login with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'Pass1234' });
    expect(res.status).toBe(400);
    expect(res.body.msg).toContain('Invalid email or password');
  });

  test('Login with blocked user should fail', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: blockedUserEmail, password: 'Pass1234' });
    expect(res.status).toBe(403);
    expect(res.body.msg).toContain('blocked');
  });

  test('ForgotPassword - validation error (empty email)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: '' });
    expect(res.status).toBe(400);
  });

  test('ForgotPassword - non-existent email (security: returns success)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.msg).toContain('OTP');
  });

  test('ForgotPassword - valid email sends OTP', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: userEmail });
    expect(res.status).toBe(200);
    expect(res.body.msg).toContain('OTP sent');
  });

  test('VerifyOTP - validation error (missing fields)', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: userEmail });
    expect(res.status).toBe(400);
  });

  test('VerifyOTP - invalid OTP for user without resetOTP', async () => {
    const newUser = `nootp_${Date.now()}@test.com`;
    await request(app).post('/api/auth/register').send({ email: newUser, password: 'Pass1234' });
    
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: newUser, otp: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.msg).toContain('Invalid or expired OTP');
  });

  test('VerifyOTP - expired OTP', async () => {
    const user = await User.findOne({ email: userEmail });
    const otp = '123456';
    user.resetOTP = await bcrypt.hash(otp, 10);
    user.resetOTPExpires = Date.now() - 1000; // Expired
    await user.save();

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: userEmail, otp });
    expect(res.status).toBe(400);
    expect(res.body.msg).toContain('expired');
  });

  test('VerifyOTP - wrong OTP code', async () => {
    const user = await User.findOne({ email: userEmail });
    const correctOTP = '654321';
    user.resetOTP = await bcrypt.hash(correctOTP, 10);
    user.resetOTPExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: userEmail, otp: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.msg).toContain('Invalid OTP');
  });

  test('VerifyOTP - valid OTP succeeds', async () => {
    const user = await User.findOne({ email: userEmail });
    const correctOTP = '111222';
    user.resetOTP = await bcrypt.hash(correctOTP, 10);
    user.resetOTPExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: userEmail, otp: correctOTP });
    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
  });

  test('ResetPassword - validation error (missing fields)', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: userEmail, otp: '123456' });
    expect(res.status).toBe(400);
  });

  test('ResetPassword - invalid OTP or user without resetOTP', async () => {
    const newUser = `noreset_${Date.now()}@test.com`;
    await request(app).post('/api/auth/register').send({ email: newUser, password: 'Pass1234' });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: newUser, otp: '123456', newPassword: 'NewPass123' });
    expect(res.status).toBe(400);
    expect(res.body.msg).toContain('Invalid or expired OTP');
  });

  test('ResetPassword - expired OTP', async () => {
    const user = await User.findOne({ email: userEmail });
    const otp = '789012';
    user.resetOTP = await bcrypt.hash(otp, 10);
    user.resetOTPExpires = Date.now() - 1000; // Expired
    await user.save();

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: userEmail, otp, newPassword: 'NewPass123' });
    expect(res.status).toBe(400);
    expect(res.body.msg).toContain('expired');
  });

  test('ResetPassword - wrong OTP code', async () => {
    const user = await User.findOne({ email: userEmail });
    const correctOTP = '333444';
    user.resetOTP = await bcrypt.hash(correctOTP, 10);
    user.resetOTPExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: userEmail, otp: '999999', newPassword: 'NewPass123' });
    expect(res.status).toBe(400);
    expect(res.body.msg).toContain('Invalid OTP');
  });

  test('ResetPassword - valid OTP resets password', async () => {
    const user = await User.findOne({ email: userEmail });
    const correctOTP = '555666';
    user.resetOTP = await bcrypt.hash(correctOTP, 10);
    user.resetOTPExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: userEmail, otp: correctOTP, newPassword: 'NewPass123' });
    expect(res.status).toBe(200);
    expect(res.body.msg).toContain('successful');
  });
});

describe('Cart Routes - Missing Branch Coverage', () => {
  test('Update cart item - cart not found', async () => {
    // Create a new user without cart
    const newUserEmail = `nocart_${Date.now()}@test.com`;
    await request(app).post('/api/auth/register').send({ email: newUserEmail, password: 'Pass1234' });
    const login = await request(app).post('/api/auth/login').send({ email: newUserEmail, password: 'Pass1234' });
    const newToken = login.body.token;

    const fakeItemId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/cart/update/${fakeItemId}`)
      .set('Authorization', `Bearer ${newToken}`)
      .send({ quantity: 2 });
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Cart not found');
  });

  test('Update cart item - item not found in cart', async () => {
    // Ensure user has a cart
    await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    const fakeItemId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/cart/update/${fakeItemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 2 });
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Item not found');
  });

  test('Update cart item - quantity <= 0 removes item', async () => {
    // Add an item first
    const fakeMenuItemId = new mongoose.Types.ObjectId();
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ 
        menuItemId: fakeMenuItemId.toString(), 
        name: 'Test Item', 
        price: 100, 
        image: 'img.jpg',
        restaurantId: 'rest123',
        restaurantName: 'Test Restaurant'
      });

    // Get the cart to find item ID
    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);
    const itemId = cartRes.body.cart.items[0]._id;

    // Update with quantity 0
    const res = await request(app)
      .put(`/api/cart/update/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 0 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Remove item from cart - cart not found', async () => {
    const newUserEmail = `nocart2_${Date.now()}@test.com`;
    await request(app).post('/api/auth/register').send({ email: newUserEmail, password: 'Pass1234' });
    const login = await request(app).post('/api/auth/login').send({ email: newUserEmail, password: 'Pass1234' });
    const newToken = login.body.token;

    const fakeItemId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/api/cart/remove/${fakeItemId}`)
      .set('Authorization', `Bearer ${newToken}`)
      .send();
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Cart not found');
  });

  test('Clear cart - cart not found', async () => {
    const newUserEmail = `nocart3_${Date.now()}@test.com`;
    await request(app).post('/api/auth/register').send({ email: newUserEmail, password: 'Pass1234' });
    const login = await request(app).post('/api/auth/login').send({ email: newUserEmail, password: 'Pass1234' });
    const newToken = login.body.token;

    const res = await request(app)
      .delete('/api/cart/clear')
      .set('Authorization', `Bearer ${newToken}`)
      .send();
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Cart not found');
  });
});

describe('Payment Routes - Missing Branch Coverage', () => {
  test('Payment verify - missing payment verification data', async () => {
    const res = await request(app)
      .post('/api/payment/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ name: 'Test', price: 100, quantity: 1 }],
        totalAmount: 100
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing payment verification data');
  });

  test('Payment verify - missing order items', async () => {
    const res = await request(app)
      .post('/api/payment/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'sig_123',
        totalAmount: 100
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing order items');
  });

  test('Payment verify - empty items array', async () => {
    const res = await request(app)
      .post('/api/payment/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'sig_123',
        items: [],
        totalAmount: 100
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing order items');
  });

  test('Payment failed - missing items', async () => {
    const res = await request(app)
      .post('/api/payment/failed')
      .set('Authorization', `Bearer ${token}`)
      .send({
        totalAmount: 100,
        restaurantName: 'Test Restaurant'
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing order items');
  });

  test('Payment failed - empty items array', async () => {
    const res = await request(app)
      .post('/api/payment/failed')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [],
        totalAmount: 100,
        restaurantName: 'Test Restaurant'
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing order items');
  });

  test('Payment retry - order not found', async () => {
    const fakeOrderId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/payment/retry/${fakeOrderId}`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Order not found');
  });

  test('Payment retry - unauthorized (different user)', async () => {
    // Create order for first user
    const pending = await request(app)
      .post('/api/payment/failed')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ name: 'Test', price: 100, quantity: 1 }],
        totalAmount: 100,
        restaurantName: 'Test Restaurant',
        deliveryAddress: 'Test Address',
        paymentMethod: 'card'
      });
    const orderId = pending.body.order._id;

    // Try to retry with different user
    const newUserEmail = `other_${Date.now()}@test.com`;
    await request(app).post('/api/auth/register').send({ email: newUserEmail, password: 'Pass1234' });
    const login = await request(app).post('/api/auth/login').send({ email: newUserEmail, password: 'Pass1234' });
    const otherToken = login.body.token;

    const res = await request(app)
      .post(`/api/payment/retry/${orderId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send();
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Unauthorized');
  });

  test('Payment retry - order not in pending payment status', async () => {
    // Create a placed order
    const placed = await request(app)
      .post('/api/orders/place')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ name: 'Test', price: 100, quantity: 1 }],
        totalAmount: 100,
        restaurantName: 'Test Restaurant',
        deliveryAddress: 'Test Address',
        paymentMethod: 'cash'
      });
    const orderId = placed.body.order._id;

    const res = await request(app)
      .post(`/api/payment/retry/${orderId}`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('not pending payment');
  });

  test('Payment retry-verify - order not found', async () => {
    const fakeOrderId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/payment/retry-verify/${fakeOrderId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'sig_123'
      });
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Order not found');
  });

  test('Payment retry-verify - unauthorized (different user)', async () => {
    // Create pending order
    const pending = await request(app)
      .post('/api/payment/failed')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ name: 'Test', price: 100, quantity: 1 }],
        totalAmount: 100,
        restaurantName: 'Test Restaurant',
        deliveryAddress: 'Test Address',
        paymentMethod: 'card'
      });
    const orderId = pending.body.order._id;

    // Try to verify with different user
    const newUserEmail = `other2_${Date.now()}@test.com`;
    await request(app).post('/api/auth/register').send({ email: newUserEmail, password: 'Pass1234' });
    const login = await request(app).post('/api/auth/login').send({ email: newUserEmail, password: 'Pass1234' });
    const otherToken = login.body.token;

    const res = await request(app)
      .post(`/api/payment/retry-verify/${orderId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'sig_123'
      });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Unauthorized');
  });

  test('Payment retry-verify - invalid signature', async () => {
    // Create pending order
    const pending = await request(app)
      .post('/api/payment/failed')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ name: 'Test', price: 100, quantity: 1 }],
        totalAmount: 100,
        restaurantName: 'Test Restaurant',
        deliveryAddress: 'Test Address',
        paymentMethod: 'card'
      });
    const orderId = pending.body.order._id;

    const res = await request(app)
      .post(`/api/payment/retry-verify/${orderId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'invalid_signature'
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Payment verification failed');
  });
});

describe('Additional Edge Cases for Branch Coverage', () => {
  test('Cart add - item already exists (increase quantity)', async () => {
    const menuItemId = new mongoose.Types.ObjectId();
    
    // Add item first time
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${token}`)
      .send({
        menuItemId: menuItemId.toString(),
        name: 'Duplicate Test',
        price: 50,
        image: 'img.jpg',
        restaurantId: 'rest456',
        restaurantName: 'Test Restaurant'
      });

    // Add same item again
    const res = await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${token}`)
      .send({
        menuItemId: menuItemId.toString(),
        name: 'Duplicate Test',
        price: 50,
        image: 'img.jpg',
        restaurantId: 'rest456',
        restaurantName: 'Test Restaurant'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cart.items.length).toBeGreaterThan(0);
  });

  test('Payment order - negative amount', async () => {
    const res = await request(app)
      .post('/api/payment/order')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: -100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid amount');
  });

  test('Payment order - amount is null', async () => {
    const res = await request(app)
      .post('/api/payment/order')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: null });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid amount');
  });
});
