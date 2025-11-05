const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');

// GET /api/restaurants - Fetch all restaurants
router.get('/', async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ isActive: true })
      .select('name cuisine rating reviewCount image deliveryTime deliveryFee address')
      .sort({ rating: -1 });

    res.status(200).json({
      success: true,
      count: restaurants.length,
      restaurants: restaurants
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching restaurants',
      error: error.message
    });
  }
});

module.exports = router;
