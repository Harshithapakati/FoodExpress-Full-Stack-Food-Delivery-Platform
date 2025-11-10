const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
let app;

let mongo; let email;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  await connectDB();
  app = require('../app');
  email = `otp_${Date.now()}@ex.com`;
  await request(app).post('/api/auth/register').send({ email, password: 'Pass1234' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

function captureOTPLogs(run) {
  const logs = [];
  const orig = console.log;
  console.log = (...args) => { logs.push(args.join(' ')); orig.apply(console, args); };
  return run().then(() => {
    console.log = orig; return logs;
  }).catch((e) => { console.log = orig; throw e; });
}

function extractOTP(logs) {
  const line = logs.find(l => l.includes('OTP:')) || '';
  const match = line.match(/OTP:\s*(\d{6})/);
  return match ? match[1] : null;
}

test('verify OTP and reset password success', async () => {
  const logs = await captureOTPLogs(async () => {
    await request(app).post('/api/auth/forgot-password').send({ email });
  });
  const otp = extractOTP(logs);
  expect(otp).toHaveLength(6);

  const verify = await request(app).post('/api/auth/verify-otp').send({ email, otp });
  expect(verify.status).toBe(200);
  expect(verify.body.verified).toBe(true);

  const reset = await request(app).post('/api/auth/reset-password').send({ email, otp, newPassword: 'NewPass1234' });
  expect(reset.status).toBe(200);
});

test('expired OTP returns 400', async () => {
  // Request OTP
  const logs = await captureOTPLogs(async () => {
    await request(app).post('/api/auth/forgot-password').send({ email });
  });
  const otp = extractOTP(logs);

  // Expire it
  const user = await User.findOne({ email });
  user.resetOTPExpires = Date.now() - 1000;
  await user.save();

  const verify = await request(app).post('/api/auth/verify-otp').send({ email, otp });
  expect(verify.status).toBe(400);
});
