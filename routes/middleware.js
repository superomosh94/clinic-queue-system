/**
 * Middleware aggregator for routes
 */

const { authenticateJWT } = require('../middleware/auth');
const requireAdmin = require('../middleware/adminCheck');
const { requireStaff } = require('../middleware/staffCheck');
const { validateRequest, validationRules } = require('../middleware/validateRequest');
const { 
  queueJoinLimiter, 
  staffActionLimiter, 
  apiLimiter 
} = require('../middleware/rateLimiter');

module.exports = {
  authenticateJWT,
  requireAdmin,
  requireStaff,
  validateRequest,
  validationRules,
  queueJoinLimiter,
  staffActionLimiter,
  apiLimiter
};