// tests/integration/payment.test.js
// Integration tests for Razorpay payment routes with SDK mocked
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_key';
const request = require('supertest');
const crypto = require('crypto');
const { startTestServer, stopTestServer } = require('../setupServer');

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockImplementation(async (opts) => ({
        id: 'order_test_123',
        amount: opts.amount,
        currency: opts.currency || 'INR',
      })),
    },
  }));
});

let baseUrl;
const tokenStore = { token: null };

beforeAll(async () => {
  // Enable mock mode for Razorpay order creation to bypass external API authentication
  process.env.RAZORPAY_MOCK = 'true';
  const r = await startTestServer();
  baseUrl = r.baseUrl;

  // try to register and login a user to get a token if endpoints exist
  const email = `paytest_${Date.now()}@example.com`;
  await request(baseUrl).post('/api/auth/register').send({ name: 'Pay Test', email, password: 'Pass1234' });
  const login = await request(baseUrl).post('/api/auth/login').send({ email, password: 'Pass1234' });
  tokenStore.token = login.body && login.body.token ? login.body.token : null;
});

afterAll(async () => {
  await stopTestServer();
});

function auth(req) {
  return tokenStore.token ? req.set('Authorization', `Bearer ${tokenStore.token}`) : req;
}

describe('Payment API (Razorpay) \n', () => {
  const sampleItems = [
    { name: 'Paneer Tikka', price: 200, quantity: 1, image: '' },
    { name: 'Biryani', price: 150, quantity: 1, image: '' },
  ];

  test('Create Razorpay order', async () => {
    const res = await auth(request(baseUrl).post('/api/payment/order').send({ amount: 350 }));
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('order_id');
    expect(res.body).toHaveProperty('key_id');
  });

  test('Verify payment success -> creates order (status Placed)', async () => {
    // 1) Create RZP order (mocked)
    const orderRes = await auth(request(baseUrl).post('/api/payment/order').send({ amount: 350 }));
    const { order_id } = orderRes.body;

    // 2) Generate signature with secret (use env secret or default testing secret)
    const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
    const paymentId = 'pay_test_123';
    const text = `${order_id}|${paymentId}`;
    const razorpay_signature = crypto.createHmac('sha256', secret).update(text).digest('hex');

    // 3) Call verify
    const verifyRes = await auth(request(baseUrl).post('/api/payment/verify').send({
      razorpay_order_id: order_id,
      razorpay_payment_id: paymentId,
      razorpay_signature,
      items: sampleItems,
      totalAmount: 350,
      restaurantName: 'Test Resto',
      deliveryAddress: '123 Test St',
      paymentMethod: 'card',
    }));

    expect([200, 201]).toContain(verifyRes.statusCode);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.order).toBeTruthy();
    expect(verifyRes.body.order.status).toBe('Placed');
    expect(verifyRes.body.order.totalAmount).toBe(350);
  });

  test('Verify payment fails with wrong signature', async () => {
    const orderRes = await auth(request(baseUrl).post('/api/payment/order').send({ amount: 200 }));
    const { order_id } = orderRes.body;

    const badSig = 'deadbeef';
    const res = await auth(request(baseUrl).post('/api/payment/verify').send({
      razorpay_order_id: order_id,
      razorpay_payment_id: 'pay_wrong',
      razorpay_signature: badSig,
      items: sampleItems,
      totalAmount: 200,
      restaurantName: 'R',
      deliveryAddress: 'D',
      paymentMethod: 'card'
    }));
    expect([400, 401]).toContain(res.statusCode);
  });

  test('Payment failed endpoint creates Pending Payment order', async () => {
    const res = await auth(request(baseUrl).post('/api/payment/failed').send({
      items: sampleItems,
      totalAmount: 350,
      restaurantName: 'Test Resto',
      deliveryAddress: '123 Test St',
      paymentMethod: 'card',
      razorpay_order_id: 'order_test_123'
    }));

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.order.status).toBe('Pending Payment');
  });

  test('Retry payment flow -> creates RZP order and verify success updates order', async () => {
    // First create a pending order via failed endpoint
    const pending = await auth(request(baseUrl).post('/api/payment/failed').send({
      items: sampleItems,
      totalAmount: 100,
      restaurantName: 'Retry Resto',
      deliveryAddress: 'Retry Lane',
      paymentMethod: 'card',
    }));
    const orderId = pending.body.order._id;

    // Retry kickoff
    const retry = await auth(request(baseUrl).post(`/api/payment/retry/${orderId}`));
    expect(retry.statusCode).toBe(200);
    const { order_id } = retry.body;

    // Verify
    const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
    const paymentId = 'pay_retry_1';
    const text = `${order_id}|${paymentId}`;
    const sig = crypto.createHmac('sha256', secret).update(text).digest('hex');

    const verify = await auth(request(baseUrl).post(`/api/payment/retry-verify/${orderId}`).send({
      razorpay_order_id: order_id,
      razorpay_payment_id: paymentId,
      razorpay_signature: sig,
    }));

    expect([200, 201]).toContain(verify.statusCode);
    expect(verify.body.order.status).toBe('Placed');
  });
});
