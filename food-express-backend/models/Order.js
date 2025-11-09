const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurantName: String,
  items: [{
    name: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  deliveryAddress: String,
  paymentMethod: String,
  status: { type: String, default: "Placed" }, // "Placed", "Pending Payment", "Delivered", "Cancelled"
  totalAmount: Number,
  razorpayOrderId: String, // Store Razorpay order ID for tracking
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
