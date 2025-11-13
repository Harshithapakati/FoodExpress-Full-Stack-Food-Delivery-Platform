// In-process integration test to exercise routes under Jest instrumentation
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
let app;
const crypto = require('crypto');

let mongo;
let token;

beforeAll(async () => {
  process.env.RAZORPAY_MOCK = 'true';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
  process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
  process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_key';

  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  await connectDB();

  // require app after env is set
  app = require('../app');

  // register + login to get token
  const email = `jest_${Date.now()}@ex.com`;
  await request(app).post('/api/auth/register').send({ name: 'Jest', email, password: 'Pass1234' });
  const login = await request(app).post('/api/auth/login').send({ email, password: 'Pass1234' });
  token = login.body.token;
});

afterAll(async () => {
  if (mongoose.connection.readyState) {
    await mongoose.disconnect();
  }
  if (mongo) await mongo.stop();
});

test('restaurants list endpoint responds', async () => {
  const res = await request(app).get('/api/restaurants');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('success', true);
});

test('cart add/get/clear flow', async () => {
  // Provide a valid 24-char hex string for menuItemId
  const fakeMenuItemId = '507f1f77bcf86cd799439011';
  const add = await request(app)
    .post('/api/cart/add')
    .set('Authorization', `Bearer ${token}`)
    .send({ menuItemId: fakeMenuItemId, name: 'Item', price: 100, image: '', restaurantId: 'r1', restaurantName: 'R' });
  expect([200,201]).toContain(add.status);

  const get = await request(app)
    .get('/api/cart')
    .set('Authorization', `Bearer ${token}`);
  expect(get.status).toBe(200);
  expect(get.body.cart.items.length).toBeGreaterThan(0);

  const clear = await request(app)
    .delete('/api/cart/clear')
    .set('Authorization', `Bearer ${token}`);
  expect(clear.status).toBe(200);
  expect(clear.body.cart.items.length).toBe(0);
});

test('payment order + verify success creates order', async () => {
  const amount = 250;
  const ord = await request(app)
    .post('/api/payment/order')
    .set('Authorization', `Bearer ${token}`)
    .send({ amount });
  expect(ord.status).toBe(200);

  const { order_id } = ord.body;
  const paymentId = 'pay_ok_1';
  const text = `${order_id}|${paymentId}`;
  const sig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(text).digest('hex');

  const verify = await request(app)
    .post('/api/payment/verify')
    .set('Authorization', `Bearer ${token}`)
    .send({
      razorpay_order_id: order_id,
      razorpay_payment_id: paymentId,
      razorpay_signature: sig,
      items: [{ name: 'Item', price: 100, quantity: 1 }],
      totalAmount: amount,
      restaurantName: 'R',
      deliveryAddress: 'addr',
      paymentMethod: 'card',
    });
  expect([200,201]).toContain(verify.status);
  expect(verify.body.success).toBe(true);
});
