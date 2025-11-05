const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  restaurantId: { 
    type: String, 
    required: true, 
    ref: 'restaurants' 
  },
  restaurantName: String,
  name: { 
    type: String, 
    required: true 
  },
  description: String,
  price: { 
    type: Number, 
    required: true 
  },
  category: String,
  image: String,
  isVeg: { 
    type: Boolean, 
    default: true 
  },
  isAvailable: { 
    type: Boolean, 
    default: true 
  },
  rating: Number,
  spicyLevel: { 
    type: String, 
    enum: ['Mild', 'Medium', 'Hot', 'Extra Hot'] 
  }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
