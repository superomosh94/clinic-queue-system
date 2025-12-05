const rateLimit = require('express-rate-limit');
const { log } = require('../utils/helpers');

/**
 * Rate limiter for queue join (prevent spam)
 */
const queueJoinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 queue joins per window
  message: {
    success: false,
    message: 'Too many queue join attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for staff actions
 */
const staffActionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each IP to 100 actions per window
  message: {
    success: false,
    message: 'Too many actions. Please slow down.'
  }
});

/**
 * Rate limiter for API endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: {
    success: false,
    message: 'Too many API requests. Please try again later.'
  }
});

module.exports = {
  queueJoinLimiter,
  staffActionLimiter,
  apiLimiter
};