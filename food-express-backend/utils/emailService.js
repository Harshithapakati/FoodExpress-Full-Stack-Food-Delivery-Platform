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
  // If email is not configured, just log for development (but NOT the actual OTP)
  if (!isEmailConfigured) {
    console.log(`OTP email requested for ${email} (email service not configured)`);
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

// Send order confirmation email with order details
const sendOrderConfirmation = async (email, order) => {
  // Build HTML for order items
  const itemsHtml = (order.items || []).map(it => {
    const name = it.name || it.title || 'Item';
    const qty = it.quantity || it.qty || 1;
    const price = typeof it.price !== 'undefined' ? it.price : (it.unitPrice || 0);
    return `<tr>
      <td style="padding:8px;border:1px solid #eee">${name}</td>
      <td style="padding:8px;border:1px solid #eee;text-align:center">${qty}</td>
      <td style="padding:8px;border:1px solid #eee;text-align:right">${price}</td>
    </tr>`;
  }).join('');

  const delivery = (order && typeof order.deliveryAddress === 'object') ? order.deliveryAddress : {};
  const deliveryRaw = order && typeof order.deliveryAddress === 'string' ? order.deliveryAddress : '';
  const orderId = order._id || order.id || '';
  const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleString() : (order.createdAtStr || '');
  const status = order.status || 'received';
  const total = order.totalAmount || order.total || order.amount || 0;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width:700px;margin:0 auto;border:1px solid #eee;">
      <div style="background:#e74c3c;color:#fff;padding:20px;text-align:center;">
        <h1 style="margin:0">FoodExpress</h1>
        <p style="margin:0">Order Confirmation</p>
      </div>
      <div style="padding:20px;">
        <h2 style="margin:0 0 10px 0">Order #${orderId}</h2>
        <p style="margin:0 0 10px 0;color:#555">Placed: ${createdAt}</p>
        <p style="margin:0 0 10px 0;color:#555">Status: <strong>${status}</strong></p>

        <h3 style="margin-top:20px">Items</h3>
        <table style="width:100%;border-collapse:collapse;margin-top:10px"> 
          <thead>
            <tr>
              <th style="text-align:left;padding:8px;border:1px solid #eee">Item</th>
              <th style="text-align:center;padding:8px;border:1px solid #eee">Qty</th>
              <th style="text-align:right;padding:8px;border:1px solid #eee">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <h3 style="text-align:right;margin-top:10px">Total: ₹${total}</h3>

        <h3 style="margin-top:20px">Delivery Address</h3>
        <p style="color:#555;margin:0">${delivery.name || delivery.recipient || ''}</p>
        <p style="color:#555;margin:0">${delivery.addressLine1 || delivery.address || ''}</p>
        <p style="color:#555;margin:0">${delivery.city || ''} ${delivery.postalCode || ''}</p>
        <p style="color:#555;margin:0">${delivery.phone || delivery.contact || ''}</p>
        ${deliveryRaw ? `<h4 style="margin-top:12px;margin-bottom:6px"></h4><p style="color:#555;margin:0">${deliveryRaw}</p>` : ''}

        <hr style="margin:20px 0" />
        <p style="color:#777;font-size:12px">If you have any questions, reply to this email or contact our support.</p>
      </div>
      <div style="background:#f5f5f5;padding:10px;text-align:center;color:#777;font-size:12px">© 2025 FoodExpress</div>
    </div>
  `;

  if (!isEmailConfigured) {
    console.log(`\n=== ORDER EMAIL (to: ${email}) ===`);
    console.log(`Subject: Order Confirmation - #${orderId}`);
    console.log(html);
    console.log('=== END ORDER EMAIL ===\n');
    return true;
  }

  const mailOptions = {
    from: `"FoodExpress" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Order Confirmation - #${orderId}`,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent:', info.messageId);
    return true;
  } catch (err) {
    console.error('Error sending order confirmation email:', err);
    throw new Error('Failed to send order confirmation email');
  }
};

module.exports = { sendOTPEmail, sendOrderConfirmation };

