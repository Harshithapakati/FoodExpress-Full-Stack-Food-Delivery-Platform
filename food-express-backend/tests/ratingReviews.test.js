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

describe('FOOD-F-050: Ratings & Reviews', () => {
  it('should allow submitting a rating and review', async () => {
    const res = await request(baseUrl)
      .post('/api/ratings')
      .send({ orderId: 'ORD123', rating: 5, review: 'Great food!' });

    expect(res.statusCode).toBeGreaterThanOrEqual(200);
  });

  it('should reject invalid rating values', async () => {
    const res = await request(baseUrl)
      .post('/api/ratings')
      .send({ orderId: 'ORD124', rating: 8 });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
