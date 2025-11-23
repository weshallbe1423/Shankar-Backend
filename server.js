const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const connectDB = require("./config/db");
// Import routes
const analysisRoutes = require('./routes/analysis');
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes")

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;
connectDB();
// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: [
    'https://shankar-baba-frontend.vercel.app', // Production frontend
    'http://localhost:3000',                    // Local dev
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


// Other middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use('/data', express.static(path.join(__dirname, 'inputData')));

// Rate limiting
// const { RateLimiterMemory } = require('rate-limiter-flexible');
// const rateLimiter = new RateLimiterMemory({
//   keyGenerator: (req) => req.ip,
//   points: 10, // 10 requests
//   duration: 1, // per 1 second
// });

// app.use((req, res, next) => {
//   rateLimiter.consume(req.ip)
//     .then(() => next())
//     .catch(() => {
//       res.status(429).json({
//         error: 'Too many requests',
//         message: 'Please slow down your requests'
//       });
//     });
// });

// Routes
app.use('/api/analysis', analysisRoutes);
app.use("/api/auth",authRoutes);
app.use("/api/admin", adminRoutes); // Add this

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Matka Analysis API',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    message: '🎰 Matka Analysis API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      analysis: {
        matkaList: 'GET /api/analysis/game-list',
        analyze: 'POST /api/analysis/analyze',
        dateGuesses: 'GET /api/analysis/date-guesses',
        batchAnalyze: 'POST /api/analysis/batch-analyze'
      }
    },
    documentation: 'See README for API documentation'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.originalUrl} does not exist`
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
  console.log(`❤️  Health check at http://localhost:${PORT}/api/health`);
});

module.exports = app;