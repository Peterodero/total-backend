const Participant = require('../models/Participant');

const GAME_CONFIG = {
  this_or_that: {
    label: 'This or That',
    total: 9,
    points: 5,
  },
  ten_second_quiz: {
    label: '10-Second Quiz',
    total: 8,
    points: 10,
  },
  five_second_rapid: {
    label: '5-Second Rapid',
    total: 6,
    points: 10,
  },
};

const VALID_GAME_IDS = Object.keys(GAME_CONFIG);

// Helper to normalize gameId from request
const normalizeGameId = (raw) => {
  if (!raw) return null;
  const str = String(raw).trim();
  if (VALID_GAME_IDS.includes(str)) return str;
  if (str === 'thisorthat') return 'this_or_that';
  if (str === 'tenshowdown' || str === '10_second_quiz') return 'ten_second_quiz';
  if (str === 'fiveshowdown' || str === '5_second_rapid') return 'five_second_rapid';
  return null;
};

// ─────────────────────────────────────────────
// POST /scores & POST /results  →  Submit result for a game
// ─────────────────────────────────────────────
const submitScore = async (req, res, next) => {
  try {
    const rawGameId = req.body.gameId || req.body.game || req.body.gameMode;
    const gameId = normalizeGameId(rawGameId);

    if (!gameId) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Unknown game.',
          fields: { gameId: 'Unknown game' },
        },
      });
    }

    const config = GAME_CONFIG[gameId];
    const score = Number(req.body.score !== undefined ? req.body.score : req.body.points);
    const correct = Number(req.body.correct);
    const total = Number(req.body.total !== undefined ? req.body.total : config.total);

    const fields = {};

    if (isNaN(correct) || !Number.isInteger(correct) || correct < 0 || correct > config.total) {
      fields.correct = `correct must be an integer between 0 and ${config.total}`;
    }

    if (isNaN(total) || total !== config.total) {
      fields.total = `total for ${config.label} must be ${config.total}`;
    }

    const expectedScore = correct * config.points;
    if (isNaN(score) || score !== expectedScore) {
      fields.score = `score must equal correct × ${config.points}`;
    }

    if (Object.keys(fields).length > 0) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid submission.',
          fields,
        },
      });
    }

    const participant = req.participant;

    // Check if game was ALREADY played by participant
    if (participant.results && participant.results.has(gameId)) {
      const existing = participant.results.get(gameId);
      return res.status(409).json({
        error: {
          code: 'ALREADY_PLAYED',
          message: `You have already played ${config.label}.`,
        },
        result: {
          gameId: existing.gameId,
          score: existing.score,
          correct: existing.correct,
          total: existing.total,
          submittedAt: existing.submittedAt.toISOString(),
        },
      });
    }

    const submittedAt = new Date();

    const gameResultData = {
      gameId,
      score,
      correct,
      total: config.total,
      submittedAt,
    };

    if (!participant.results) {
      participant.results = new Map();
    }
    participant.results.set(gameId, gameResultData);
    participant.scores[gameId] = score;

    // Recalculate total score
    participant.totalScore =
      (participant.scores.this_or_that || 0) +
      (participant.scores.ten_second_quiz || 0) +
      (participant.scores.five_second_rapid || 0);

    await participant.save();

    return res.status(201).json({
      gameId,
      score,
      correct,
      total: config.total,
      submittedAt: submittedAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /leaderboard  →  Ranked leaderboard
// Query params: ?game=this_or_that&region=Nairobi&limit=10
// ─────────────────────────────────────────────
const getLeaderboard = async (req, res, next) => {
  try {
    const rawGame = req.query.game || req.query.gameMode;
    const game = normalizeGameId(rawGame);

    if (rawGame && !game) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Unknown game.',
          fields: { game: 'Unknown game' },
        },
      });
    }

    const region = req.query.region || req.query.location || null;
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit, 10) || 100, 500) : null;

    // Query filter
    const query = {};
    if (region) {
      query.$or = [
        { location: new RegExp(region, 'i') },
        { region: new RegExp(region, 'i') },
      ];
    }

    const allParticipants = await Participant.find(query);

    // Global summary counts
    const totalParticipants = await Participant.countDocuments(region ? query : {});
    const countThisOrThat = await Participant.countDocuments({
      ...(region ? query : {}),
      'scores.this_or_that': { $gt: 0 },
    });
    const countTenSecondQuiz = await Participant.countDocuments({
      ...(region ? query : {}),
      'scores.ten_second_quiz': { $gt: 0 },
    });
    const countFiveSecondRapid = await Participant.countDocuments({
      ...(region ? query : {}),
      'scores.five_second_rapid': { $gt: 0 },
    });

    // Build entries
    const entriesList = allParticipants.map((p) => {
      const scores = {
        this_or_that: p.scores.this_or_that || 0,
        ten_second_quiz: p.scores.ten_second_quiz || 0,
        five_second_rapid: p.scores.five_second_rapid || 0,
      };

      const gamesPlayedCount = [
        scores.this_or_that > 0 || (p.results && p.results.has('this_or_that')),
        scores.ten_second_quiz > 0 || (p.results && p.results.has('ten_second_quiz')),
        scores.five_second_rapid > 0 || (p.results && p.results.has('five_second_rapid')),
      ].filter(Boolean).length;

      const totalPoints = scores.this_or_that + scores.ten_second_quiz + scores.five_second_rapid;

      return {
        id: p._id.toString(),
        name: p.fullName || p.name || 'Anonymous',
        region: p.location || p.region || 'N/A',
        scores,
        total: totalPoints,
        gameScore: game ? scores[game] || 0 : totalPoints,
        gamesPlayed: gamesPlayedCount,
        createdAt: p.createdAt,
      };
    });

    // Sort entries
    entriesList.sort((a, b) => {
      if (game) {
        if (b.gameScore !== a.gameScore) return b.gameScore - a.gameScore;
      }
      if (b.total !== a.total) return b.total - a.total;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    // Slice limit if provided
    const finalEntries = (limit ? entriesList.slice(0, limit) : entriesList).map(
      (entry, index) => ({
        rank: index + 1,
        name: entry.name,
        region: entry.region,
        scores: entry.scores,
        total: entry.total,
        gamesPlayed: entry.gamesPlayed,
      })
    );

    return res.status(200).json({
      game: game || null,
      region: region || null,
      summary: {
        participants: totalParticipants,
        played: {
          this_or_that: countThisOrThat,
          ten_second_quiz: countTenSecondQuiz,
          five_second_rapid: countFiveSecondRapid,
        },
      },
      entries: finalEntries,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /scores/my  →  My scores
// ─────────────────────────────────────────────
const getMyScores = async (req, res, next) => {
  try {
    const participant = req.participant;

    return res.status(200).json({
      participant: participant.toPublic(),
      scores: participant.getScoresObject(),
      totalScore: participant.totalScore || 0,
      results: Array.from(participant.results ? participant.results.values() : []),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { submitScore, getLeaderboard, getMyScores };
