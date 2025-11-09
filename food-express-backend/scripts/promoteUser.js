// Simple promotion script: node scripts/promoteUser.js --email user@example.com --role partner
const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const connectDB = require('../config/db');

async function main() {
  const argv = require('minimist')(process.argv.slice(2));
  const email = argv.email || argv.e;
  const role = argv.role || argv.r || 'partner';
  if (!email) {
    console.error('Usage: node scripts/promoteUser.js --email user@example.com [--role partner]');
    process.exit(1);
  }

  try {
    await connectDB();
    const user = await User.findOne({ email });
    if (!user) {
      console.error('User not found:', email);
      process.exit(2);
    }
    user.role = role;
    await user.save();
    console.log(`User ${email} promoted to role=${role}`);
    process.exit(0);
  } catch (err) {
    console.error('Error promoting user:', err);
    process.exit(3);
  }
}

main();
