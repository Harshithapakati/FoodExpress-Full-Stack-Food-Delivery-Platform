const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cuisine: String,
  rating: Number,
  reviewCount: Number,
  image: String,
  deliveryTime: String,
  deliveryFee: Number,
  isActive: { type: Boolean, default: true },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  contactNumber: String,
  openingHours: {
    open: String,
    close: String
  }
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
