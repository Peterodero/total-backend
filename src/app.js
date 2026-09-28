const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const participantRoutes = require('./routes/participants');
const scoreRoutes = require('./routes/scores');
const { getLeaderboard } = require('./controllers/scoreController');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// ─────────────────────────────────────────────
// Security & utility middleware
// ─────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SustainabALL API is up 🌱',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────
app.use('/participants', participantRoutes);
app.use('/scores', scoreRoutes);
app.use('/results', scoreRoutes);
app.get('/leaderboard', getLeaderboard);

// ─────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
