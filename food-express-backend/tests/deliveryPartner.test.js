const request = require('supertest');
const { startTestServer, stopTestServer } = require('./setupServer');

let baseUrl;

beforeAll(async () => {
  const res = await startTestServer();
  baseUrl = res.baseUrl;
});

afterAll(async () => {
  await stopTestServer();
});

describe('FOOD-F-060: Delivery Partner Status Updates', () => {
  it('should update delivery partner status', async () => {
    const res = await request(baseUrl)
      .post('/api/delivery/update')
      .send({ partnerId: 'DP001', location: 'BTM Layout', status: 'On the way' });

    expect(res.statusCode).toBe(200);
  });

  it('should handle missing partnerId gracefully', async () => {
    const res = await request(baseUrl)
      .post('/api/delivery/update')
      .send({ status: 'Busy' });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
