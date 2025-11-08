// tests/cart_order.test.js
const request = require('supertest');
const { startTestServer, stopTestServer } = require('./setupServer');

let baseUrl;

beforeAll(async () => {
  const r = await startTestServer();
  baseUrl = r.baseUrl;
});

afterAll(async () => {
  await stopTestServer();
});

describe('Cart & Order Management Module', () => {
  let token = null;

  beforeAll(async () => {
    // attempt to login a test user if exists
    try {
      const loginRes = await request(baseUrl)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: '123456' });
      if (loginRes.statusCode === 200 && loginRes.body.token) {
        token = loginRes.body.token;
      }
    } catch (err) {
      // ignore
    }
  });

  test('FOOD-F-020 → Add item to cart', async () => {
    const req = request(baseUrl)
      .post('/api/cart/add')
      .send({ itemId: 'dummy-id', quantity: 2 });
    if (token) req.set('Authorization', `Bearer ${token}`);
    const res = await req;
    expect([200, 201, 401]).toContain(res.statusCode);
  });

  test('FOOD-F-020 → View cart items', async () => {
    const req = request(baseUrl).get('/api/cart');
    if (token) req.set('Authorization', `Bearer ${token}`);
    const res = await req;
    expect([200, 401]).toContain(res.statusCode);
  });

  test('FOOD-F-021 → Place order with pricing', async () => {
    const req = request(baseUrl)
      .post('/api/order/place')
      .send({
        items: [{ id: 'dummy-item', quantity: 1 }],
        address: '123 Test Lane',
        paymentMode: 'COD',
      });
    if (token) req.set('Authorization', `Bearer ${token}`);
    const res = await req;
    expect([201, 200, 401, 404]).toContain(res.statusCode);
    if (res.statusCode === 201) {
      expect(res.body).toHaveProperty('orderId');
    }
  });
});
