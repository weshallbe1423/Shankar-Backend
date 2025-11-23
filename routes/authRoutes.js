const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, mobile, password } = req.body;

    if (!email || !mobile || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, mobile and password are required'
      });
    }

    const result = await authService.register({ email, mobile, password });
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email/mobile and password are required'
      });
    }

    const result = await authService.login(identifier, password);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await authService.getUserProfile(userId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;