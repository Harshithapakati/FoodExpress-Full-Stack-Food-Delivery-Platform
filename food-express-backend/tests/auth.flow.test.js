const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
let app; 

let mongo; let email;
let _baseToken; 


beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  await connectDB();
  app = require('../app');
  email = `user_${Date.now()}@ex.com`;
  await request(app).post('/api/auth/register').send({ email, password: 'Pass1234' });
  const login = await request(app).post('/api/auth/login').send({ email, password: 'Pass1234' });
  _baseToken = login.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('duplicate registration rejected', async () => {
  const dup = await request(app).post('/api/auth/register').send({ email, password: 'Pass1234' });
  expect(dup.status).toBe(400);
});

test('login fails with wrong password', async () => {
  const bad = await request(app).post('/api/auth/login').send({ email, password: 'Wrong1234' });
  expect(bad.status).toBe(400);
});

test('forgot password issues OTP (non-config email logs OTP)', async () => {
  const res = await request(app).post('/api/auth/forgot-password').send({ email });
  expect(res.status).toBe(200);
  expect(res.body.msg).toMatch(/OTP/);
});
