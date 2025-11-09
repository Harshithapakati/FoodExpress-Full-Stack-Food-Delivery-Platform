#!/usr/bin/env node
// Usage:
//   node scripts/create_admin.js <email> <password>
// Or set env vars CREATE_ADMIN_EMAIL and CREATE_ADMIN_PASSWORD

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function main() {
  const email = process.argv[2] || process.env.CREATE_ADMIN_EMAIL;
  const password = process.argv[3] || process.env.CREATE_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Usage: node scripts/create_admin.js <email> <password>\nOr set CREATE_ADMIN_EMAIL and CREATE_ADMIN_PASSWORD in environment.');
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set in .env or environment. Aborting.');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set in .env or environment. Aborting.');
    process.exit(1);
  }

  try {
    await connectDB();

    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      console.log('User exists. Promoting to admin and updating password...');
      user.role = 'admin';
      user.password = await bcrypt.hash(password, 12);
    } else {
      console.log('Creating new admin user...');
      user = new User({ email: email.toLowerCase().trim(), password: await bcrypt.hash(password, 12), role: 'admin' });
    }

    await user.save();
    console.log('Admin user saved:', user.email, 'id:', user._id.toString());

    const token = jwt.sign({ id: user._id.toString(), email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('\n=== ADMIN TOKEN (copy and keep secure) ===\n');
    console.log(token);
    console.log('\nUse this token as: Authorization: Bearer <token>\n');

    process.exit(0);
  } catch (err) {
    console.error('Failed to create/promote admin:', err);
    process.exit(2);
  }
}

main();
