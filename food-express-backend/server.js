require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

// Environment normalization
const isProd = process.env.NODE_ENV === 'production';

// Provide sensible local defaults before validation (non-production only)
if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb://localhost:27017/foodexpress';
}
if (!process.env.JWT_SECRET && !isProd) {
  process.env.JWT_SECRET = 'testsecret';
}

// Security: Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your .env file');
  process.exit(1);
}

// Email config warnings
if (isProd && (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD)) {
  console.warn('⚠️ Email credentials not set. Password reset emails will not be sent in production.');
}

const connectDB = require('./config/db');
const app = require('./app');
const express = require('express');
const cors = require('cors');

// Connect DB
connectDB();

// ✅ CORS CONFIG (merged)
app.use(
  cors({
    origin: function (origin, callback) {
      if (process.env.NODE_ENV !== 'production') {
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      } else {
        const allowedOrigin = process.env.FRONTEND_URL;
        if (origin === allowedOrigin) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
  })
);

// Security: Limit request size
app.use(express.json({ limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ✅ ROUTES (merged)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/device-token', require('./routes/deviceToken'));
app.use('/api/notify', require('./routes/notify'));
app.use('/api/partner', require('./routes/partner')); // ✅ restored
app.use('/api/payment', require('./routes/payment')); // payment (Razorpay) routes

// ✅ Firebase initialization (only ONCE)
try {
  const { initFirebase } = require('./firebase/admin');
  initFirebase();
} catch (err) {
  console.warn('Firebase Admin initialization skipped or failed:', err?.message || err);
}

// Health check
app.get('/', (req, res) => res.send('API running!'));

// Security warning for weak JWT
if (process.env.JWT_SECRET === 'your_jwt_secret_key_here') {
  console.warn('⚠️ WARNING: Using default JWT secret. Please change JWT_SECRET in .env for production!');
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
  console.log(`📧 Email service: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Not set'}`);
});
