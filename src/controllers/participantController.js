const Participant = require('../models/Participant');
const { generateToken } = require('../utils/jwt');

// ─────────────────────────────────────────────
// POST /participants  →  Register new participant
// Body: { fullName: "Aarav Kumar", iggNumber: "IGG123456", location: "Nairobi" }
// ─────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const fullName = req.body.fullName || req.body.name;
    const iggNumber = req.body.iggNumber || req.body.phone;
    const location = req.body.location || req.body.region;

    if (!fullName || !iggNumber || !location) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid submission.',
          fields: {
            ...(!fullName && { fullName: 'fullName is required' }),
            ...(!iggNumber && { iggNumber: 'iggNumber is required' }),
            ...(!location && { location: 'location is required' }),
          },
        },
      });
    }

    const cleanFullName = String(fullName).trim();
    const cleanIggNumber = String(iggNumber).trim();
    const cleanLocation = String(location).trim();

    // Check for duplicate iggNumber
    const existing = await Participant.findOne({ iggNumber: cleanIggNumber });
    if (existing) {
      const token = generateToken(existing._id.toString());
      return res.status(200).json({
        token,
        participant: existing.toPublic(),
        scores: existing.getScoresObject(),
      });
    }

    // Create participant (passCode generated via pre-save hook)
    const participant = await Participant.create({
      fullName: cleanFullName,
      iggNumber: cleanIggNumber,
      location: cleanLocation,
    });

    const token = generateToken(participant._id.toString());

    return res.status(201).json({
      token,
      participant: participant.toPublic(),
      scores: participant.getScoresObject(),
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST /participants/login  →  Login with iggNumber + passCode
// ─────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const iggNumber = req.body.iggNumber || req.body.phone;
    const passCode = req.body.passCode;

    if (!iggNumber || !passCode) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'iggNumber and passCode are required.',
        },
      });
    }

    const cleanIgg = String(iggNumber).trim();
    const cleanPass = String(passCode).trim().toUpperCase();

    const participant = await Participant.findOne({
      iggNumber: cleanIgg,
      passCode: cleanPass,
    });

    if (!participant) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials. Please register again.',
        },
      });
    }

    const token = generateToken(participant._id.toString());

    return res.status(200).json({
      token,
      participant: participant.toPublic(),
      scores: participant.getScoresObject(),
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /participants/me  →  Get current participant
// ─────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const participant = req.participant;
    return res.status(200).json({
      participant: participant.toPublic(),
      scores: participant.getScoresObject(),
      totalScore: participant.totalScore || 0,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /participants  →  List all participants
// ─────────────────────────────────────────────
const listAll = async (req, res, next) => {
  try {
    const participants = await Participant.find({}).sort({ totalScore: -1, createdAt: 1 });
    return res.status(200).json({
      count: participants.length,
      participants: participants.map((p) => ({
        id: p._id.toString(),
        fullName: p.fullName,
        iggNumber: p.iggNumber,
        location: p.location,
        passCode: p.passCode,
        scores: p.getScoresObject(),
        totalScore: p.totalScore || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, listAll };
