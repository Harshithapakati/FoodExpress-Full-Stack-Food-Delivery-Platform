// tests/restaurant.test.js
const request = require('supertest');
const { startTestServer, stopTestServer } = require('./setupServer');

let baseUrl;
let _token;

beforeAll(async () => {
  const r = await startTestServer();
  baseUrl = r.baseUrl;
});

afterAll(async () => {
  await stopTestServer();
});

describe('Restaurant Discovery & Menu Management Module', () => {
 

  beforeAll(async () => {
    // try to login as admin if test admin exists; otherwise token stays null
    try {
      const loginRes = await request(baseUrl)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'adminpass' });
      if (loginRes.statusCode === 200 && loginRes.body.token) {
        _token = loginRes.body.token;
      }
    } catch (_err) {
      // ignore
    }
  });

  test('FOOD-F-010 → Browse all restaurants', async () => {
    const res = await request(baseUrl).get('/api/restaurants');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.restaurants)).toBe(true);
  });
});
