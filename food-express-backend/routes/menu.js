const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');

// GET /api/menu/:restaurantId - Fetch menu items for a specific restaurant
router.get('/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // First, verify the restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Fetch menu items for this restaurant
    const menuItems = await MenuItem.find({ 
      restaurantId: restaurantId.toString(),
      isAvailable: true 
    }).sort({ category: 1, name: 1 });

    res.status(200).json({
      success: true,
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        cuisine: restaurant.cuisine,
        rating: restaurant.rating,
        image: restaurant.image
      },
      count: menuItems.length,
      menuItems: menuItems
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching menu items',
      error: error.message
    });
  }
});

module.exports = router;
