const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.headers['user-id'] || req.body.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID required'
      });
    }

    const user = await authService.findUserById(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.'
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Check if admin exists
router.get('/admin-exists', async (req, res) => {
  try {
    const adminExists = await authService.adminExists();
    res.json({
      success: true,
      data: { adminExists }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all users (admin only)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await authService.getAllUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Other admin endpoints remain the same...
module.exports = router;