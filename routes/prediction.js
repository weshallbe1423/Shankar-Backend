const express = require('express');
const router = express.Router();
const Prediction = require('../models/prediction');
const authMiddleware = require('../middleware/authMiddleware');

// Create Prediction (Admin only)
router.post('/', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized' });
    try {
        const prediction = await Prediction.create({ ...req.body, postedBy: req.user.id });
        res.status(201).json(prediction);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get Today’s Prediction
router.get('/today', authMiddleware, async (req, res) => {
    const today = new Date();
    const start = new Date(today.setHours(0,0,0,0));
    const end = new Date(today.setHours(23,59,59,999));
    const prediction = await Prediction.findOne({ date: { $gte: start, $lte: end } });
    res.json(prediction);
});

module.exports = router;
