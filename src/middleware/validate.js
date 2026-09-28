const { validationResult } = require('express-validator');
const { error } = require('../utils/response');

/**
 * Middleware to check express-validator results.
 * Must be placed AFTER the validation chain in the route.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return error(res, 'Validation failed', 422, formatted);
  }
  next();
};

module.exports = { validate };
