const { error } = require('../utils/response');

/**
 * Catch-all 404 handler
 */
const notFound = (req, res, next) => {
  return error(res, `Route ${req.originalUrl} not found`, 404);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Unhandled error:', err);

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return error(
      res,
      `A participant with ${field} "${value}" already exists.`,
      409
    );
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return error(res, 'Validation failed', 422, messages);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return error(res, 'Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return error(res, 'Token expired', 401);
  }

  const statusCode = err.statusCode || 500;
  return error(res, err.message || 'Internal server error', statusCode);
};

module.exports = { notFound, errorHandler };
