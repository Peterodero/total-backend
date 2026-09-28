const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT for a participant
 * @param {string} participantId - The UUID id of the participant
 * @returns {string} signed JWT token
 */
const generateToken = (participantId) => {
  return jwt.sign({ id: participantId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Verify a JWT token
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
