const express = require('express');
const {
  register,
  login,
  getMe,
  listAll,
} = require('../controllers/participantController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /participants  →  Register
router.post('/', register);

// POST /participants/login  →  Login
router.post('/login', login);

// GET /participants/me  →  Current participant
router.get('/me', protect, getMe);

// GET /participants  →  List all
router.get('/', listAll);

module.exports = router;
