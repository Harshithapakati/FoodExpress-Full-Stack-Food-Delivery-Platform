const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
let app;
const crypto = require('crypto');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

let mongo; let token; let userEmail;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
  process.env.RAZORPAY_MOCK = 'true';
  process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
  process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_key';

  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  await connectDB();
  app = require('../app');

  userEmail = `user_${Date.now()}@ex.com`;
  await request(app).post('/api/auth/register').send({ email: userEmail, password: 'Pass1234' });
  const login = await request(app).post('/api/auth/login').send({ email: userEmail, password: 'Pass1234' });
  token = login.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('orders: COD placement succeeds and validation failure returns 400', async () => {
  // validation error (missing items)
  const bad = await request(app)
    .post('/api/orders/place')
    .set('Authorization', `Bearer ${token}`)
    .send({ restaurantName: 'R', deliveryAddress: 'addr', paymentMethod: 'cash', totalAmount: 100 });
  expect(bad.status).toBe(400);

  // success with cash on delivery
  const good = await request(app)
    .post('/api/orders/place')
    .set('Authorization', `Bearer ${token}`)
    .send({
      restaurantName: 'R',
      items: [{ name: 'x', price: 50, quantity: 2 }],
      deliveryAddress: 'addr',
      paymentMethod: 'cash',
      totalAmount: 100,
    });
  expect(good.status).toBe(200);
  expect(good.body.success).toBe(true);
});

test('payment: verify wrong signature returns 400', async () => {
  const amount = 120;
  const order = await request(app)
    .post('/api/payment/order')
    .set('Authorization', `Bearer ${token}`)
    .send({ amount });
  const { order_id } = order.body;

  const bad = await request(app)
    .post('/api/payment/verify')
    .set('Authorization', `Bearer ${token}`)
    .send({
      razorpay_order_id: order_id,
      razorpay_payment_id: 'pay_bad',
      razorpay_signature: 'deadbeef',
      items: [{ name: 'A', price: 120, quantity: 1 }],
      totalAmount: amount,
      restaurantName: 'R',
      deliveryAddress: 'addr',
      paymentMethod: 'card',
    });
  expect(bad.status).toBe(400);
});

test('payment: invalid amount returns 400', async () => {
  const bad = await request(app)
    .post('/api/payment/order')
    .set('Authorization', `Bearer ${token}`)
    .send({ amount: 0 });
  expect(bad.status).toBe(400);
});

test('orders: card payment returns 400 (must use gateway)', async () => {
  const res = await request(app)
    .post('/api/orders/place')
    .set('Authorization', `Bearer ${token}`)
    .send({
      restaurantName: 'R',
      items: [{ name: 'x', price: 10, quantity: 1 }],
      deliveryAddress: 'addr',
      paymentMethod: 'card',
      totalAmount: 10,
    });
  expect(res.status).toBe(400);
});

test('payment retry flow (pending -> retry -> placed)', async () => {
  // pending order via failed endpoint
  const pending = await request(app)
    .post('/api/payment/failed')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [{ name: 'P', price: 80, quantity: 1 }],
      totalAmount: 80,
      restaurantName: 'R',
      deliveryAddress: 'addr',
      paymentMethod: 'card',
      razorpay_order_id: 'order_x'
    });
  expect(pending.status).toBe(200);
  const orderId = pending.body.order._id;

  // retry
  const retry = await request(app)
    .post(`/api/payment/retry/${orderId}`)
    .set('Authorization', `Bearer ${token}`)
    .send();
  expect(retry.status).toBe(200);
  const { order_id } = retry.body;

  // verify success
  const text = `${order_id}|pay_ok`;
  const sig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(text).digest('hex');
  const verify = await request(app)
    .post(`/api/payment/retry-verify/${orderId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ razorpay_order_id: order_id, razorpay_payment_id: 'pay_ok', razorpay_signature: sig });
  expect(verify.status).toBe(200);
  expect(verify.body.order.status).toBe('Placed');
});

test('auth middleware invalid token returns 401', async () => {
  const res = await request(app).get('/api/cart').set('Authorization', 'Bearer badtoken');
  expect(res.status).toBe(401);
});

test('menu route returns items for existing restaurant', async () => {
  const r = await Restaurant.create({ name: 'R', isActive: true, cuisine: 'C', rating: 4.5, reviewCount: 10, image: 'img', deliveryTime: 30, deliveryFee: 20, address: 'addr' });
  await MenuItem.create({ name: 'Dish', price: 99, restaurantId: r._id.toString(), category: 'Main', isAvailable: true });
  const res = await request(app).get(`/api/menu/${r._id}`);
  expect(res.status).toBe(200);
  expect(res.body.count).toBeGreaterThan(0);
});

test('menu route 404 for unknown restaurant', async () => {
  const unknownId = new mongoose.Types.ObjectId();
  const res = await request(app).get(`/api/menu/${unknownId}`);
  expect(res.status).toBe(404);
});

test('cart update quantity and remove item paths', async () => {
  const fakeMenuItemId = '507f1f77bcf86cd799439012';
  // add two items
  await request(app)
    .post('/api/cart/add')
    .set('Authorization', `Bearer ${token}`)
    .send({ menuItemId: fakeMenuItemId, name: 'A', price: 50, image: '', restaurantId: 'r', restaurantName: 'R' });

  const cartRes = await request(app)
    .get('/api/cart')
    .set('Authorization', `Bearer ${token}`);
  const itemId = cartRes.body.cart.items[0]._id;

  // update quantity
  const upd = await request(app)
    .put(`/api/cart/update/${itemId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ quantity: 3 });
  expect(upd.status).toBe(200);

  // remove item
  const rem = await request(app)
    .delete(`/api/cart/remove/${itemId}`)
    .set('Authorization', `Bearer ${token}`);
  expect(rem.status).toBe(200);
});
