const nodemailer = require('nodemailer');

// Check if email credentials are configured
const isEmailConfigured = process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD;

// Create reusable transporter only if credentials are available
let transporter = null;
if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
}

// Send OTP email
const sendOTPEmail = async (email, otp) => {
  // If email is not configured, just log the OTP for development
  if (!isEmailConfigured) {
    console.log(`\n=== OTP FOR ${email} ===`);
    console.log(`OTP: ${otp}`);
    console.log('Expires in 10 minutes');
    console.log('========================\n');
    return true;
  }
  const mailOptions = {
    from: `"FoodExpress" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset OTP - FoodExpress',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">FoodExpress</h1>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p style="color: #666; font-size: 16px;">
            You requested to reset your password. Use the OTP below to complete the process:
          </p>
          <div style="background-color: white; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
            <h1 style="color: #e74c3c; font-size: 48px; margin: 0; letter-spacing: 8px;">${otp}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">
            This OTP will expire in <strong>10 minutes</strong>.
          </p>
          <p style="color: #666; font-size: 14px;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
        <div style="padding: 20px; text-align: center; background-color: #333; color: white;">
          <p style="margin: 0; font-size: 12px;">© 2025 FoodExpress. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = { sendOTPEmail };

