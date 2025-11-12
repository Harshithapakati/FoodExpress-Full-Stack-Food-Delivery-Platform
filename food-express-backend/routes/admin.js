const express = require("express");
const router = express.Router();
const verifyAdmin = require("../middleware/verifyAdmin");
const { 
  getAllUsers, 
  getAllRestaurants, 
  verifyAdmin: verifyAdminController,
  createFirstAdmin,
  updateUserStatus,
  updateRestaurantStatus,
  getRestaurantMenu
} = require("../controllers/adminController");
const auth = require("../middleware/auth");
const { getAdminStats } = require("../controllers/adminController");
// Create first admin (development only - remove in production)
router.post("/setup-admin", createFirstAdmin);

// Admin verification endpoint
router.get("/verify", auth, verifyAdmin, verifyAdminController);

// Data endpoints
router.get("/users", auth, verifyAdmin, getAllUsers);
router.get("/restaurants", auth, verifyAdmin, getAllRestaurants);
router.get("/stats", auth, verifyAdmin, getAdminStats);
// Status management endpoints
router.patch("/users/:userId/status", auth, verifyAdmin, updateUserStatus);
router.patch("/restaurants/:restaurantId/status", auth, verifyAdmin, updateRestaurantStatus);
// Get menu items for a restaurant
router.get("/restaurants/:restaurantId/menu", auth, verifyAdmin, getRestaurantMenu);

module.exports = router;
