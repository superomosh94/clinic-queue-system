const db = require('../config/db');
const { log } = require('../utils/helpers');

class TokenBlacklist {
  /**
   * Add token to blacklist
   */
  static async add(token) {
    try {
      const [result] = await db.execute(
        'INSERT INTO token_blacklist (token) VALUES (?)',
        [token]
      );
      
      log(`Token blacklisted: ${token.substring(0, 20)}...`);
      return result.insertId;
      
    } catch (error) {
      log(`Error blacklisting token: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Check if token is blacklisted
   */
  static async isBlacklisted(token) {
    try {
      const [tokens] = await db.execute(
        'SELECT id FROM token_blacklist WHERE token = ?',
        [token]
      );
      
      return tokens.length > 0;
      
    } catch (error) {
      log(`Error checking token blacklist: ${error.message}`, 'error');
      return false;
    }
  }
  
  /**
   * Clean up expired tokens (older than 8 hours)
   */
  static async cleanup() {
    try {
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - 8);
      
      const [result] = await db.execute(
        'DELETE FROM token_blacklist WHERE blacklisted_at < ?',
        [cutoff]
      );
      
      if (result.affectedRows > 0) {
        log(`Cleaned up ${result.affectedRows} expired blacklisted tokens`);
      }
      
      return result.affectedRows;
      
    } catch (error) {
      log(`Error cleaning up token blacklist: ${error.message}`, 'error');
      return 0;
    }
  }
  
  /**
   * Get blacklist statistics
   */
  static async getStats() {
    try {
      const [stats] = await db.execute(
        `SELECT 
          COUNT(*) as total_blacklisted,
          MIN(blacklisted_at) as oldest,
          MAX(blacklisted_at) as newest
         FROM token_blacklist`
      );
      
      return stats[0] || {
        total_blacklisted: 0,
        oldest: null,
        newest: null
      };
      
    } catch (error) {
      log(`Error getting blacklist stats: ${error.message}`, 'error');
      return null;
    }
  }
}

module.exports = TokenBlacklist;