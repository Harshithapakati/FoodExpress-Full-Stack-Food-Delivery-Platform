// Mock email service BEFORE imports (Jest hoists this)
let capturedOTP = null;
jest.mock('../utils/emailService', () => ({
  sendOTPEmail: jest.fn((email, otp) => {
    capturedOTP = otp;
    return Promise.resolve(true);
  })
}));

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

test('verify OTP and reset password success', async () => {
  // Reset captured OTP
  capturedOTP = null;
  
  // Request OTP
  await request(app).post('/api/auth/forgot-password').send({ email });
  
  // Get OTP from mock (secure - no logging)
  const otp = capturedOTP;
  expect(otp).toBeTruthy();
  expect(otp).toHaveLength(6);

  const verify = await request(app).post('/api/auth/verify-otp').send({ email, otp });
  expect(verify.status).toBe(200);
  expect(verify.body.verified).toBe(true);

  const reset = await request(app).post('/api/auth/reset-password').send({ email, otp, newPassword: 'NewPass1234' });
  expect(reset.status).toBe(200);
});

test('expired OTP returns 400', async () => {
  // Reset captured OTP
  capturedOTP = null;
  
  // Request OTP
  await request(app).post('/api/auth/forgot-password').send({ email });
  
  // Get OTP from mock and expire it in database
  const otp = capturedOTP;
  expect(otp).toBeTruthy();
  
  const user = await User.findOne({ email });
  user.resetOTPExpires = Date.now() - 1000;
  await user.save();

  const verify = await request(app).post('/api/auth/verify-otp').send({ email, otp });
  expect(verify.status).toBe(400);
});
