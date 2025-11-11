const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // OTP fields for password reset
    resetOTP: {
      type: String,
      default: null,
    },
    resetOTPExpires: {
      type: Date,
      default: null,
    },

    // FCM device token for push notifications (optional)
    fcmToken: {
      type: String,
      default: null,
    },

    // role: 'user' | 'partner' | 'admin'
    role: {
      type: String,
      enum: ['user', 'partner', 'admin'],
      default: 'user',
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
