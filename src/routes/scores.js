const express = require('express');
const {
  submitScore,
  getLeaderboard,
  getMyScores,
} = require('../controllers/scoreController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /scores & POST /scores/submit
router.post('/', protect, submitScore);
router.post('/submit', protect, submitScore);

// GET /scores/leaderboard
router.get('/leaderboard', getLeaderboard);

// GET /scores/my
router.get('/my', protect, getMyScores);

module.exports = router;
