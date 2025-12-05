const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwtConfig');
const db = require('../config/db');
const { log } = require('../utils/helpers');

/**
 * JWT Authentication Middleware
 */
const authenticateJWT = async (req, res, next) => {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies[jwtConfig.cookieName] || 
                  req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    // Check if token is blacklisted
    const [blacklisted] = await db.execute(
      'SELECT id FROM token_blacklist WHERE token = ?',
      [token]
    );
    
    if (blacklisted.length > 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has been revoked' 
      });
    }
    
    // Verify token
    jwt.verify(token, jwtConfig.secret, (err, decoded) => {
      if (err) {
        log(`JWT verification failed: ${err.message}`, 'error');
        return res.status(403).json({ 
          success: false, 
          message: 'Invalid or expired token' 
        });
      }
      
      // Attach user data to request
      req.user = decoded;
      next();
    });
    
  } catch (error) {
    log(`Auth middleware error: ${error.message}`, 'error');
    res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

/**
 * Generate JWT token
 */
const generateToken = (userData) => {
  return jwt.sign(
    {
      id: userData.id,
      username: userData.username,
      role: userData.role,
      fullName: userData.full_name
    },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );
};

/**
 * Set JWT cookie
 */
const setTokenCookie = (res, token) => {
  res.cookie(jwtConfig.cookieName, token, jwtConfig.cookieOptions);
};

/**
 * Clear JWT cookie (logout)
 */
const clearTokenCookie = (res) => {
  res.clearCookie(jwtConfig.cookieName);
};

/**
 * Blacklist token (for logout)
 */
const blacklistToken = async (token) => {
  try {
    await db.execute(
      'INSERT INTO token_blacklist (token) VALUES (?)',
      [token]
    );
    
    // Clean old blacklisted tokens (older than token expiry)
    const expiryDate = new Date(Date.now() - (8 * 60 * 60 * 1000));
    await db.execute(
      'DELETE FROM token_blacklist WHERE blacklisted_at < ?',
      [expiryDate]
    );
    
    return true;
  } catch (error) {
    log(`Failed to blacklist token: ${error.message}`, 'error');
    return false;
  }
};

module.exports = {
  authenticateJWT,
  generateToken,
  setTokenCookie,
  clearTokenCookie,
  blacklistToken
};