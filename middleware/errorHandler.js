const { log } = require('../utils/helpers');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error
  log(`Error ${statusCode}: ${message} - ${req.method} ${req.originalUrl}`, 'error');
  
  if (err.stack && process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  
  // Determine response format based on request
  if (req.accepts('html')) {
    // HTML response
    res.status(statusCode).render('error/500', {
      title: 'Error',
      message: message,
      statusCode: statusCode,
      stack: process.env.NODE_ENV === 'development' ? err.stack : null
    });
  } else {
    // JSON response
    res.status(statusCode).json({
      success: false,
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
};

/**
 * Custom error classes
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message) {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message) {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

module.exports = {
  errorHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError
};