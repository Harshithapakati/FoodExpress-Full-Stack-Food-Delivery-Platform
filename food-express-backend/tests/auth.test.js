// tests/auth.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const { startTestServer, stopTestServer } = require('./setupServer');

let baseUrl;

beforeAll(async () => {
  const result = await startTestServer();
  baseUrl = result.baseUrl;
});

afterAll(async () => {
  await stopTestServer();
  // ensure mongoose connections (if any in this process) are closed
  try { await mongoose.disconnect(); } catch (_) { /*ignore */ }
});

describe('Authentication & Authorization Module', () => {
  const userData = {
    name: 'Test User',
    email: `testuser_${Date.now()}@example.com`,
    password: 'TestPass123',
  };

  test('FOOD-F-001 → Register new user', async () => {
    const res = await request(baseUrl)
      .post('/api/auth/register')
      .send(userData);

    expect([200, 201]).toContain(res.statusCode);
    if (res.body) {
      // token optional depending on your implementation
      // expect(res.body).toHaveProperty('token');
    }
  });

  test('FOOD-F-001 → Login with valid credentials', async () => {
    const res = await request(baseUrl)
      .post('/api/auth/login')
      .send({ email: userData.email, password: userData.password });

    expect([200, 201]).toContain(res.statusCode);
    if (res.statusCode === 200 || res.statusCode === 201) {
      expect(res.body).toHaveProperty('token');
    }
  });

  test('FOOD-F-001 → Login fails with wrong password', async () => {
    const res = await request(baseUrl)
      .post('/api/auth/login')
      .send({ email: userData.email, password: 'wrong' });

    expect([400, 401]).toContain(res.statusCode);
  });
});
