const bcrypt = require("bcrypt");
const User = require("../models/user");

class AuthService {
  constructor() {
    // No OTP services needed
  }

  // Find user by email or mobile
  async findUser(email, mobile) {
    return await User.findOne({
      $or: [{ email }, { mobile }]
    });
  }

  // Find user by ID
  async findUserById(id) {
    return await User.findById(id);
  }

  // Register new user - Only one admin allowed
  async register(userData) {
    const { email, mobile, password } = userData;

    // Check if user already exists
    const existingUser = await this.findUser(email, mobile);
    if (existingUser) {
      throw new Error('User with this email or mobile already exists');
    }

    // Validate email and mobile
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (!this.isValidMobile(mobile)) {
      throw new Error('Invalid mobile number format');
    }

    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user - auto-verified since no OTP
    const newUser = new User({
      email,
      mobile,
      password: hashedPassword,
      role: adminExists ? 'user' : 'admin', // Only first user becomes admin
      emailVerified: true,
      mobileVerified: true
    });

    await newUser.save();

    return {
      id: newUser._id,
      email: newUser.email,
      mobile: newUser.mobile,
      role: newUser.role,
      message: adminExists 
        ? 'User registered successfully. You can now login.' 
        : 'Admin user registered successfully. You can now login.'
    };
  }

  // Login user
  async login(identifier, password) {
    const user = await User.findOne({ 
      $or: [{ email: identifier }, { mobile: identifier }] 
    });
    
    if (!user) {
      throw new Error("User not found");
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error("Invalid password");
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    return {
      id: user._id,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      message: "Login successful"
    };
  }

  // Check if admin user exists
  async adminExists() {
    const admin = await User.findOne({ role: 'admin' });
    return !!admin;
  }

  // Get admin user
  async getAdminUser() {
    return await User.findOne({ role: 'admin' });
  }

  // Promote user to admin (only if no admin exists)
  async promoteToAdmin(userId) {
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (adminExists) {
      throw new Error('Admin user already exists. Only one admin allowed.');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.role = 'admin';
    await user.save();

    return { message: 'User promoted to admin successfully' };
  }

  // Demote admin to user
  async demoteAdmin(userId) {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'admin') {
      throw new Error('User is not an admin');
    }

    user.role = 'user';
    await user.save();

    return { message: 'Admin demoted to user successfully' };
  }

  // Get user profile
  async getUserProfile(userId) {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user._id,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };
  }

  // Get all users (admin only)
  async getAllUsers() {
    return await User.find({}, { password: 0 }); // Exclude passwords
  }

  // Utility functions for validation
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidMobile(mobile) {
    const mobileRegex = /^\+?[\d\s-()]{10,}$/;
    return mobileRegex.test(mobile);
  }
}

module.exports = new AuthService();