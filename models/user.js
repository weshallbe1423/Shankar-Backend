const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true
    },
    password: { 
        type: String, 
        required: true 
    },
    mobile: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true
    },
    role: { 
        type: String, 
        required: true,
        enum: ['user', 'admin'],
        default: 'user'
    },
    emailVerified: {
        type: Boolean,
        default: true // Auto-verified since no OTP
    },
    mobileVerified: {
        type: Boolean,
        default: true // Auto-verified since no OTP
    },
    lastLogin: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ mobile: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('users', userSchema);