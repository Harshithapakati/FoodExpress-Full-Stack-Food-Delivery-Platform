const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  menuItemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MenuItem',
    required: true 
  },
  name: String,
  price: Number,
  quantity: { 
    type: Number, 
    default: 1 
  },
  image: String,
  restaurantId: String,
  restaurantName: String
});

const cartSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true 
  },
  items: [cartItemSchema],
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Cart', cartSchema);
