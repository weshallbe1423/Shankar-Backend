const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class AuthService {
  constructor() {
    this.usersFile = path.join(__dirname, 'users.json');
    this.OTP_EXPIRY_MINUTES = 10;
  }

  // Generate random 6-digit OTP
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Check if OTP is expired
  isOTPExpired(expiryTime) {
    return new Date() > new Date(expiryTime);
  }

  // Calculate OTP expiry time
  getOTPExpiryTime() {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + this.OTP_EXPIRY_MINUTES);
    return expiry;
  }

  // Read users from JSON file
  async readUsers() {
    try {
      const data = await fs.readFile(this.usersFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, create with empty structure
      if (error.code === 'ENOENT') {
        return { users: [] };
      }
      throw error;
    }
  }

  // Write users to JSON file
  

  // Find user by email or mobile
  async findUser(email, mobile) {
    const data = await this.readUsers();
    return data.users.find(user => 
      user.email === email || user.mobile === mobile
    );
  }

  // Find user by email
  async findUserByEmail(email) {
    const data = await this.readUsers();
    return data.users.find(user => user.email === email);
  }

  // Find user by mobile
  async findUserByMobile(mobile) {
    const data = await this.readUsers();
    return data.users.find(user => user.mobile === mobile);
  }

  // Register new user - UPDATED: Auto-verify users
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const data = await this.readUsers();
    
    const newUser = {
      id: data.users.length + 1,
      email,
      mobile,
      password: hashedPassword,
      emailVerified: true, // Auto-verify email
      mobileVerified: true, // Auto-verify mobile
      createdAt: new Date().toISOString(),
      otp: {
        emailOtp: null,
        mobileOtp: null,
        emailOtpExpiry: null,
        mobileOtpExpiry: null
      }
    };

    data.users.push(newUser);
    await this.writeUsers(data);

    // REMOVED OTP sending since we're auto-verifying
    // await this.sendEmailOTP(email);
    // await this.sendMobileOTP(mobile);

    return {
      id: newUser.id,
      email: newUser.email,
      mobile: newUser.mobile,
      message: 'User registered successfully. You can now login.'
    };
  }

  // Send Email OTP (Keep for future use if needed)
  async sendEmailOTP(email) {
    const data = await this.readUsers();
    const userIndex = data.users.findIndex(user => user.email === email);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const emailOtp = this.generateOTP();
    const emailOtpExpiry = this.getOTPExpiryTime();

    data.users[userIndex].otp.emailOtp = emailOtp;
    data.users[userIndex].otp.emailOtpExpiry = emailOtpExpiry.toISOString();

    await this.writeUsers(data);

    // In real application, integrate with email service like SendGrid, SES, etc.
    console.log(`Email OTP for ${email}: ${emailOtp}`);
    
    return { message: 'Email OTP sent successfully' };
  }

  // Send Mobile OTP (Keep for future use if needed)
  async sendMobileOTP(mobile) {
    const data = await this.readUsers();
    const userIndex = data.users.findIndex(user => user.mobile === mobile);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const mobileOtp = this.generateOTP();
    const mobileOtpExpiry = this.getOTPExpiryTime();

    data.users[userIndex].otp.mobileOtp = mobileOtp;
    data.users[userIndex].otp.mobileOtpExpiry = mobileOtpExpiry.toISOString();

    await this.writeUsers(data);

    // In real application, integrate with SMS service like Twilio, etc.
    console.log(`Mobile OTP for ${mobile}: ${mobileOtp}`);
    
    return { message: 'Mobile OTP sent successfully' };
  }

  // Verify Email OTP (Keep for future use if needed)
  async verifyEmailOTP(email, otp) {
    const data = await this.readUsers();
    const userIndex = data.users.findIndex(user => user.email === email);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const user = data.users[userIndex];

    if (!user.otp.emailOtp || this.isOTPExpired(user.otp.emailOtpExpiry)) {
      throw new Error('Email OTP expired or not generated');
    }

    if (user.otp.emailOtp !== otp) {
      throw new Error('Invalid email OTP');
    }

    // Mark email as verified and clear OTP
    data.users[userIndex].emailVerified = true;
    data.users[userIndex].otp.emailOtp = null;
    data.users[userIndex].otp.emailOtpExpiry = null;

    await this.writeUsers(data);

    return { message: 'Email verified successfully' };
  }

  // Verify Mobile OTP (Keep for future use if needed)
  async verifyMobileOTP(mobile, otp) {
    const data = await this.readUsers();
    const userIndex = data.users.findIndex(user => user.mobile === mobile);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const user = data.users[userIndex];

    if (!user.otp.mobileOtp || this.isOTPExpired(user.otp.mobileOtpExpiry)) {
      throw new Error('Mobile OTP expired or not generated');
    }

    if (user.otp.mobileOtp !== otp) {
      throw new Error('Invalid mobile OTP');
    }

    // Mark mobile as verified and clear OTP
    data.users[userIndex].mobileVerified = true;
    data.users[userIndex].otp.mobileOtp = null;
    data.users[userIndex].otp.mobileOtpExpiry = null;

    await this.writeUsers(data);

    return { message: 'Mobile verified successfully' };
  }

  // Login with password - UPDATED: No verification required
  async login(emailOrMobile, password) {
    const user = await this.findUser(emailOrMobile, emailOrMobile);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // REMOVED verification requirement - users can login immediately
    // Check if both email and mobile are verified
    // if (!user.emailVerified || !user.mobileVerified) {
    //   throw new Error('Please verify both email and mobile before login');
    // }

    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      message: 'Login successful'
    };
  }

  // Resend OTP (Keep for future use if needed)
  async resendOTP(email, mobile) {
    if (email) {
      await this.sendEmailOTP(email);
    }
    if (mobile) {
      await this.sendMobileOTP(mobile);
    }

    return { message: 'OTP sent successfully' };
  }

  // Utility functions for validation
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidMobile(mobile) {
    // Basic mobile validation - adjust based on your requirements
    const mobileRegex = /^\+?[\d\s-()]{10,}$/;
    return mobileRegex.test(mobile);
  }

  // Get user profile
  async getUserProfile(userId) {
    const data = await this.readUsers();
    const user = data.users.find(user => user.id === userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      // emailVerified: user.emailVerified,
      // mobileVerified: user.mobileVerified,
      // createdAt: user.createdAt
    };
  }
}

module.exports = new AuthService();