// middleware/auth.js
const User = require('../models/user');
const jwt = require('jsonwebtoken'); // ✅ Add this line

const requireOwnershipOrAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { userId } = req.params;
    const currentUser = await User.findById(req.user._id).select('role');

    if (!currentUser) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    if (currentUser.role === 'admin' || req.user._id.toString() === userId) {
      req.user.role = currentUser.role;
      next();
    } else {
      return res.status(403).json({ success: false, error: 'Access denied. You can only access your own data.' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error in authentication' });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });

    const currentUser = await User.findById(req.user._id).select('role');
    if (!currentUser) return res.status(401).json({ success: false, error: 'User not found' });

    if (currentUser.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    req.user.role = currentUser.role;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error in authentication' });
  }
};

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, error: 'Access token required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) return res.status(401).json({ success: false, error: 'User not found' });

    req.user = {
      _id: user._id,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      emailVerified: user.emailVerified,
      mobileVerified: user.mobileVerified
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ success: false, error: 'Invalid token' });
    if (error.name === 'TokenExpiredError') return res.status(401).json({ success: false, error: 'Token expired' });

    return res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};

module.exports = { requireOwnershipOrAdmin, requireAdmin, authenticateToken };
