// services/subscriptionService.js
const User = require('../models/user');

class SubscriptionService {
  async updateUserSubscription(userId, subscriptionData, adminUser) {
    try {
      // Validate admin user
      if (!adminUser || adminUser.role !== 'admin') {
        throw new Error('Only admin users can update subscriptions');
      }

      // Validate input data
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { allowedGames, dataPeriod, isActive } = subscriptionData;

      // Validate data types
      if (typeof isActive !== 'boolean') {
        throw new Error('isActive must be a boolean');
      }

      if (!Number.isInteger(dataPeriod) || dataPeriod < 1) {
        throw new Error('dataPeriod must be a positive integer');
      }

      if (!Array.isArray(allowedGames)) {
        throw new Error('allowedGames must be an array');
      }

      // Find user to update
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate expiration date if activating subscription
      let expiresAt = user.subscription?.expiresAt;
      if (isActive && !user.subscription?.isActive) {
        // First time activation or reactivation
        expiresAt = new Date(Date.now() + dataPeriod * 24 * 60 * 60 * 1000);
      } else if (isActive && user.subscription?.isActive) {
        // Extending existing subscription
        const currentExpiry = user.subscription.expiresAt || new Date();
        expiresAt = new Date(currentExpiry.getTime() + dataPeriod * 24 * 60 * 60 * 1000);
      }

      // Update subscription data
      user.subscription = {
        isActive: isActive,
        allowedGames: allowedGames,
        dataPeriod: dataPeriod,
        expiresAt: expiresAt,
        createdAt: user.subscription?.createdAt || new Date()
      };

      const updatedUser = await user.save();

      console.log(`Subscription updated for user ${user.email} by admin ${adminUser.email}`);

      return {
        userId: updatedUser._id,
        email: updatedUser.email,
        mobile: updatedUser.mobile,
        subscription: updatedUser.subscription
      };
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  async toggleSubscription(userId, isActive, adminUser) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      user.subscription.isActive = isActive;

      if (isActive && !user.subscription.expiresAt) {
        // Set expiration date if activating without one
        user.subscription.expiresAt = new Date(Date.now() + user.subscription.dataPeriod * 24 * 60 * 60 * 1000);
      }

      const updatedUser = await user.save();

      return {
        userId: updatedUser._id,
        email: updatedUser.email,
        subscription: updatedUser.subscription
      };
    } catch (error) {
      throw new Error(`Failed to toggle subscription: ${error.message}`);
    }
  }

  async getUserAccessibleGames(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Check if subscription is active and not expired
      const isSubscriptionValid = user.subscription?.isActive && 
        (!user.subscription.expiresAt || user.subscription.expiresAt > new Date());

      if (!isSubscriptionValid) {
        return {
          accessibleGames: [],
          message: 'No active subscription or subscription has expired',
          isActive: false,
          expiresAt: user.subscription?.expiresAt
        };
      }

      return {
        accessibleGames: user.subscription.allowedGames || [],
        dataPeriod: user.subscription.dataPeriod,
        isActive: true,
        expiresAt: user.subscription.expiresAt
      };
    } catch (error) {
      throw new Error(`Failed to get accessible games: ${error.message}`);
    }
  }

  async canUserAccessGame(userId, gameId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Check if subscription is active and not expired
      const isSubscriptionValid = user.subscription?.isActive && 
        (!user.subscription.expiresAt || user.subscription.expiresAt > new Date());

      if (!isSubscriptionValid) {
        return false;
      }

      const canAccess = user.subscription.allowedGames.includes(gameId);
      return canAccess;
    } catch (error) {
      throw new Error(`Failed to check game access: ${error.message}`);
    }
  }

  async getUserSubscription(userId) {
    try {
      const user = await User.findById(userId).select('email mobile name role subscription');
      
      if (!user) {
        throw new Error('User not found');
      }

      const isExpired = user.subscription?.expiresAt && user.subscription.expiresAt < new Date();
      const isActive = user.subscription?.isActive && !isExpired;

      return {
        userId: user._id,
        email: user.email,
        mobile: user.mobile,
        name: user.name,
        role: user.role,
        subscription: {
          ...user.subscription.toObject(),
          isActive: isActive, // Override with actual active status
          isExpired: isExpired,
          daysRemaining: isActive ? Math.ceil((user.subscription.expiresAt - new Date()) / (24 * 60 * 60 * 1000)) : 0
        }
      };
    } catch (error) {
      throw new Error(`Failed to get user subscription: ${error.message}`);
    }
  }

  async getSubscriptionStatus(userId) {
    try {
      const user = await User.findById(userId).select('email subscription');
      
      if (!user) {
        throw new Error('User not found');
      }

      const isExpired = user.subscription?.expiresAt && user.subscription.expiresAt < new Date();
      const isActive = user.subscription?.isActive && !isExpired;
      const daysRemaining = isActive ? Math.ceil((user.subscription.expiresAt - new Date()) / (24 * 60 * 60 * 1000)) : 0;

      return {
        isActive,
        isExpired,
        daysRemaining,
        allowedGames: user.subscription?.allowedGames || [],
        dataPeriod: user.subscription?.dataPeriod || 0,
        expiresAt: user.subscription?.expiresAt
      };
    } catch (error) {
      throw new Error(`Failed to get subscription status: ${error.message}`);
    }
  }

  async getAllSubscriptions() {
    try {
      const users = await User.find({
        'subscription.isActive': true
      }).select('email mobile name role subscription');

      return users.map(user => {
        const isExpired = user.subscription?.expiresAt && user.subscription.expiresAt < new Date();
        const isActive = user.subscription?.isActive && !isExpired;

        return {
          userId: user._id,
          email: user.email,
          mobile: user.mobile,
          name: user.name,
          role: user.role,
          subscription: {
            ...user.subscription.toObject(),
            isActive: isActive,
            isExpired: isExpired,
            daysRemaining: isActive ? Math.ceil((user.subscription.expiresAt - new Date()) / (24 * 60 * 60 * 1000)) : 0
          }
        };
      });
    } catch (error) {
      throw new Error(`Failed to get all subscriptions: ${error.message}`);
    }
  }

  async getSubscriptionAnalytics() {
    try {
      const totalUsers = await User.countDocuments();
      const usersWithActiveSubscription = await User.countDocuments({ 
        'subscription.isActive': true,
        'subscription.expiresAt': { $gt: new Date() }
      });
      const usersWithExpiredSubscription = await User.countDocuments({
        'subscription.isActive': true,
        'subscription.expiresAt': { $lt: new Date() }
      });
      const usersWithNoSubscription = totalUsers - usersWithActiveSubscription - usersWithExpiredSubscription;

      // Get subscription distribution by data period
      const dataPeriodStats = await User.aggregate([
        {
          $match: {
            'subscription.isActive': true,
            'subscription.expiresAt': { $gt: new Date() }
          }
        },
        {
          $group: {
            _id: '$subscription.dataPeriod',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Get most common games
      const popularGames = await User.aggregate([
        {
          $match: {
            'subscription.isActive': true,
            'subscription.expiresAt': { $gt: new Date() }
          }
        },
        { $unwind: '$subscription.allowedGames' },
        {
          $group: {
            _id: '$subscription.allowedGames',
            userCount: { $sum: 1 }
          }
        },
        { $sort: { userCount: -1 } },
        { $limit: 10 }
      ]);

      return {
        totalUsers,
        activeSubscriptions: usersWithActiveSubscription,
        expiredSubscriptions: usersWithExpiredSubscription,
        noSubscription: usersWithNoSubscription,
        activationRate: totalUsers > 0 ? (usersWithActiveSubscription / totalUsers * 100).toFixed(2) : 0,
        dataPeriodStats,
        popularGames
      };
    } catch (error) {
      throw new Error(`Failed to get analytics: ${error.message}`);
    }
  }

  // Clean up expired subscriptions (can be run as a cron job)
  async cleanupExpiredSubscriptions() {
    try {
      const result = await User.updateMany(
        {
          'subscription.isActive': true,
          'subscription.expiresAt': { $lt: new Date() }
        },
        {
          $set: { 'subscription.isActive': false }
        }
      );

      console.log(`Cleaned up ${result.modifiedCount} expired subscriptions`);
      return result.modifiedCount;
    } catch (error) {
      throw new Error(`Failed to cleanup expired subscriptions: ${error.message}`);
    }
  }
  
  async getMatkaList(){
     const matkaList = [
      { id: 'SHRD', name: 'SRIDEVI', file: 'SHRD.html', description: 'Sridevi Matka' },
      { id: 'MADHURI', name: 'MADHURI', file: 'MADHURI.html', description: 'Madhuri' },
      { id: 'TB', name: 'TIME BAZAR', file: 'TB.html', description: 'Time Bazar' },
      { id: 'MLD', name: 'MILAN DAY', file: 'MLD.html', description: 'Milan Day' },
      { id: 'PUNA', name: 'PUNA BAZAR', file: 'PUNA.html', description: 'Puna Bazar' },
      { id: 'KL', name: 'KALYAN', file: 'KL.html', description: 'Kalyan Matka' },
      { id: 'SHRN', name: 'SRIDEVI NIGHT', file: 'SHRN.html', description: 'Sridevi Night' },
      { id: 'MLN', name: 'MILAN NIGHT', file: 'MLN.html', description: 'Milan Night' },
      { id: 'RJD', name: 'RAJDHANI DAY', file: 'RJD.html', description: 'Rajdhani Day' },
      { id: 'MAIN', name: 'MAIN BAZAR', file: 'MAIN.html', description: 'Main Bazar' },
      { id: 'RJN', name: 'RAJDHANI NIGHT', file: 'RJN.html', description: 'Rajdhani Night' },
      { id: 'MADHURI NIGHT', name: 'MADHURI NIGHT', file: 'MDHN.html', description: 'Madhuri Night' }

    ];
    return matkaList; 
  }
}

module.exports = new SubscriptionService();