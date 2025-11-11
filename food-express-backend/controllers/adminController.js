const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const MenuItem = require("../models/MenuItem");
const Order = require("../models/Order");
const bcrypt = require("bcryptjs");

// Development only - remove in production
exports.createFirstAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin user already exists"
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new User({
      email,
      password: hashedPassword,
      role: 'admin',
      status: 'active'
    });
    await admin.save();
    res.status(201).json({
      success: true,
      message: "Admin user created successfully",
      admin: {
        email: admin.email,
        role: admin.role,
        id: admin._id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating admin user",
      error: error.message
    });
  }
};

exports.verifyAdmin = async (req, res) => {
  try {
    res.json({ success: true, message: "Admin verified" });
  } catch (error) {
    res.status(401).json({ success: false, message: "Admin verification failed" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }, "-password")
      .select("email role status createdAt")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message
    });
  }
};

exports.getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({});
    const restaurantsWithDetails = await Promise.all(
      restaurants.map(async (restaurant) => {
        const menuCount = await MenuItem.countDocuments({ restaurantId: restaurant._id });
        const activeOrders = await Order.countDocuments({
          restaurantId: restaurant._id,
          status: { $in: ['pending', 'preparing', 'ready'] }
        });
        return {
          _id: restaurant._id,
          name: restaurant.name,
          address: restaurant.address,
          status: restaurant.status || 'active',
          menuCount,
          activeOrders,
          createdAt: restaurant.createdAt
        };
      })
    );
    res.json(restaurantsWithDetails);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching restaurants",
      error: error.message
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    if (!['active', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value"
      });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: "Cannot change status of admin users"
      });
    }
    user.status = status;
    await user.save();
    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating user status",
      error: error.message
    });
  }
};

exports.updateRestaurantStatus = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status } = req.body;
    if (!['active', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value"
      });
    }
    const restaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { status },
      { new: true }
    );
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found"
      });
    }
    res.json({
      success: true,
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        status: restaurant.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating restaurant status",
      error: error.message
    });
  }
};

exports.getRestaurantMenu = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const menuItems = await MenuItem.find({ restaurantId })
      .select('name description price category image isVeg isAvailable')
      .sort({ category: 1, name: 1 });
    res.json({
      success: true,
      menuItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching restaurant menu",
      error: error.message
    });
  }
};

// ------------------ NEW: ADMIN DASHBOARD STATS -------------------------

exports.getAdminStats = async (req, res) => {
  try {
    const range = req.query.range || '7d'; // default 7 days

    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();

    const totalOrderAgg = await Order.aggregate([
      { $match: { totalAmount: { $exists: true, $ne: null } } },
      { $group: { _id: null, sum: { $sum: "$totalAmount" } } }
    ]);
    const totalOrderValue = totalOrderAgg[0]?.sum || 0;
    const totalRevenue = totalOrderValue * 0.2;

    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    switch(range) {
      case '1m':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case '5y':
        startDate.setFullYear(startDate.getFullYear() - 5);
        break;
      case '7d':
      default:
        startDate.setDate(startDate.getDate() - 6);
    }

    const dailyStatsRaw = await Order.aggregate([
      { $match: { 
          createdAt: { $gte: startDate },
          totalAmount: { $exists: true, $ne: null } 
        } 
      },
      {
        $group: {
          _id: { 
            $dateToString: {
              format: (range === '1y' || range === '5y') ? "%Y-%m" : "%Y-%m-%d", 
              date:  "$createdAt"
            }
          },
          orderValue: { $sum: "$totalAmount" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const dailyStats = dailyStatsRaw.map(day => ({
      _id: day._id,
      revenue: day.orderValue * 0.2,
      orders: day.orders
    }));

    res.json({
      totalOrders,
      totalUsers,
      totalRevenue,
      daily: dailyStats
    });
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};
