// routes/subscription.js
const express = require("express");
const router = express.Router();
const subscriptionService = require("../services/subscriptionService");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

// 🎯 User – Get Accessible Games
router.get("/user/accessible-games/:userId", authenticateToken, async (req, res) => {
  try {
    const result = await subscriptionService.getUserAccessibleGames(req.params.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 🎯 User – Can Access Specific Game
router.get("/user/can-access-game/:userId/:gameId", authenticateToken, async (req, res) => {
  try {
    const result = await subscriptionService.canUserAccessGame(req.params.userId, req.params.gameId);
    res.status(200).json({ success: true, canAccess: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 🔐 ADMIN – Update Subscription
router.post("/admin/update-subscription/:userId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await subscriptionService.updateUserSubscription(req.params.userId, req.body, req.user);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 🔐 ADMIN – Get All Subscriptions
router.get("/admin/all-subscriptions", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await subscriptionService.getAllSubscriptions();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 🔐 ADMIN – Subscription Analytics
router.get("/admin/analytics", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await subscriptionService.getSubscriptionAnalytics();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/admin/matkaList", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await subscriptionService.getMatkaList();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});


module.exports = router;
