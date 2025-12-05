const { validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

/**
 * Validate request using express-validator
 */
const validateRequest = (validations) => {
  return async (req, res, next) => {
    // Run validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Check for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg);
      throw new ValidationError(errorMessages.join(', '));
    }
    
    next();
  };
};

/**
 * Common validation rules
 */
const validationRules = {
  staffLogin: [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  
  joinQueue: [
    body('phone')
      .optional()
      .matches(/^(\+?(\d{1,3}))?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/)
      .withMessage('Invalid phone number format')
  ],
  
  updatePatientStatus: [
    body('status')
      .isIn(['in-progress', 'served', 'no-show'])
      .withMessage('Invalid status'),
    body('ticketNumber')
      .matches(/^[A-Z]+-\d+$/)
      .withMessage('Invalid ticket number format')
  ]
};

module.exports = {
  validateRequest,
  validationRules
};