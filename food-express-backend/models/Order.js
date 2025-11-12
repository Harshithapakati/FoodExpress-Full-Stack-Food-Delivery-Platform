const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurantName: String,
  items: [
    {
      name: String,
      price: Number,
      quantity: Number,
      image: String
    }
  ],
  deliveryAddress: String,
  paymentMethod: String,
  status: { type: String, default: "Placed" }, // Keep your capitalization
  totalAmount: Number,
  razorpayOrderId: String,
  deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  tracking: {
    accepted: { type: Date, default: null },
    reached_restaurant: { type: Date, default: null },
    picked_up: { type: Date, default: null },
    out_for_delivery: { type: Date, default: null },
    reached_destination: { type: Date, default: null },
    delivered: { type: Date, default: null }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
