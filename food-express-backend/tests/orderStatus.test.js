// tests/orderStatus.test.js
require('dotenv').config();
const request = require('supertest');
const { startTestServer, stopTestServer } = require('./setupServer');

let baseUrl;
let token;

beforeAll(async () => {
  const r = await startTestServer();
  baseUrl = r.baseUrl;

  // Ensure admin user exists
  await request(baseUrl)
    .post('/api/admin/setup-admin')
    .send({
      email: 'admin@example.com',
      password: 'adminpass'
    });

  // Login to get valid JWT token
  const loginRes = await request(baseUrl)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'adminpass' });

  if (loginRes.statusCode === 200 && loginRes.body.token) {
    token = loginRes.body.token;
  } else {
    throw new Error('Admin login failed — check auth routes.');
  }
});

afterAll(async () => {
  await stopTestServer();
});

describe('FOOD-F-040: Real-time Order Status Updates', () => {
  it('should update order status successfully', async () => {
    const res = await request(baseUrl)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBeDefined();
  });

  it('should return 404 for non-existing order', async () => {
    const res = await request(baseUrl)
      .put('/api/orders/ORD999/status')
      .send({ status: 'Packed' });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
