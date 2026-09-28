const { verifyToken } = require('../utils/jwt');
const Participant = require('../models/Participant');

/**
 * Protect routes — validates Bearer JWT and attaches participant to req
 */
const protect = async (req, res, next) => {
  const sendUnauthorized = () => {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Please register again.',
      },
    });
  };

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized();
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return sendUnauthorized();
    }

    // Find participant by Mongo _id or custom id field
    let participant;
    if (decoded && decoded.id) {
      participant = await Participant.findOne({
        $or: [{ id: decoded.id }, { passCode: decoded.id }],
      });
      if (!participant && decoded.id.match(/^[0-9a-fA-F]{24}$/)) {
        participant = await Participant.findById(decoded.id);
      }
    }

    if (!participant) {
      return sendUnauthorized();
    }

    req.participant = participant;
    next();
  } catch (err) {
    return sendUnauthorized();
  }
};

module.exports = { protect };
