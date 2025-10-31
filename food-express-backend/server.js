require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

// Security: Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'EMAIL_USER', 'EMAIL_APP_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your .env file');
  process.exit(1);
}

// Security: Override MongoDB URI only if not set
if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb://localhost:27017/foodexpress';
}

const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');

const app = express();
connectDB();

// Security: Configure CORS properly
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:3002',
  credentials: true
}));

// Security: Limit request size
app.use(express.json({ limit: '10mb' }));

// Security: Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));

// Health check
app.get('/', (req, res) => res.send('API running!'));

// Security: Generate a strong JWT secret if not provided
if (process.env.JWT_SECRET === 'your_jwt_secret_key_here') {
  console.warn('⚠️  WARNING: Using default JWT secret. Please change JWT_SECRET in .env for production!');
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
  console.log(`📧 Email service: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Not set'}`);
});

// const mongoose = require('mongoose');

// mongoose.connection.on('connected', async () => {
//   console.log('Connected DB Name:', mongoose.connection.name);
//   console.log('Collections:', await mongoose.connection.db.listCollections().toArray());
// });



