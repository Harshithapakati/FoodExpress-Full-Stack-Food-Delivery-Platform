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
// In production we require DB + JWT. Email creds are recommended but not fatal.
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your .env file');
  process.exit(1);
}

// Email config warnings (optional in dev/test, recommended in prod)
if (isProd && (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD)) {
  console.warn('⚠️  Email credentials not set. Password reset emails will not be sent in production.');
}

const connectDB = require('./config/db');
const app = require('./app');

connectDB();

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





