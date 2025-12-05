// authController.js - Simplified Version
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { 
  generateToken, 
  setTokenCookie, 
  clearTokenCookie, 
  blacklistToken 
} = require('../middleware/auth');
const { log } = require('../utils/helpers');

class AuthController {
  /**
   * Staff login - Single login page for all users
   */
  async login(req, res) {
    try {
      const { username, password } = req.body;
      
      // Validate input
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }
      
      // Find staff by username
      const [staffRows] = await db.execute(
        'SELECT * FROM staff WHERE username = ? AND is_active = TRUE',
        [username]
      );
      
      if (staffRows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }
      
      const staff = staffRows[0];
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, staff.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }
      
      // Generate JWT token
      const token = generateToken({
        id: staff.id,
        username: staff.username,
        role: staff.role,
        full_name: staff.full_name
      });
      
      // Set token as HTTP-only cookie
      setTokenCookie(res, token);
      
      log(`Staff login successful: ${username} (${staff.role})`);
      
      // Redirect based on role or send success response
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        // API request - return JSON
        res.json({
          success: true,
          message: 'Login successful',
          redirectTo: '/dashboard', // All roles go to dashboard
          user: {
            id: staff.id,
            username: staff.username,
            fullName: staff.full_name,
            role: staff.role
          }
        });
      } else {
        // Form submission - redirect to dashboard
        res.redirect('/dashboard');
      }
      
    } catch (error) {
      log(`Login error: ${error.message}`, 'error');
      res.status(500).json({
        success: false,
        message: 'Server error during login'
      });
    }
  }
  
  /**
   * Staff logout
   */
  async logout(req, res) {
    try {
      // Get token from cookie
      const token = req.cookies.clinic_token || 
                   req.cookies.auth_token ||
                   req.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        // Add token to blacklist
        await blacklistToken(token);
      }
      
      // Clear cookie
      clearTokenCookie(res);
      
      log(`User logged out`);
      
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        // API request - return JSON
        res.json({
          success: true,
          message: 'Logout successful',
          redirectTo: '/login'
        });
      } else {
        // Browser request - redirect to login
        res.redirect('/login');
      }
      
    } catch (error) {
      log(`Logout error: ${error.message}`, 'error');
      res.clearCookie('clinic_token');
      res.clearCookie('auth_token');
      res.redirect('/login');
    }
  }
  
  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }
      
      // Get fresh user data from database
      const [staffRows] = await db.execute(
        'SELECT id, username, full_name, role, phone, email, created_at FROM staff WHERE id = ?',
        [req.user.id]
      );
      
      if (staffRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const staff = staffRows[0];
      
      res.json({
        success: true,
        user: {
          id: staff.id,
          username: staff.username,
          fullName: staff.full_name,
          role: staff.role,
          phone: staff.phone,
          email: staff.email,
          createdAt: staff.created_at
        }
      });
      
    } catch (error) {
      log(`Get profile error: ${error.message}`, 'error');
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
  
  /**
   * Change password
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }
      
      // Get staff and verify current password
      const [staffRows] = await db.execute(
        'SELECT password_hash FROM staff WHERE id = ?',
        [userId]
      );
      
      if (staffRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const staff = staffRows[0];
      const isValid = await bcrypt.compare(currentPassword, staff.password_hash);
      
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      // Hash new password
      const saltRounds = 12;
      const newHash = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password
      await db.execute(
        'UPDATE staff SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [newHash, userId]
      );
      
      log(`Password changed for user ID: ${userId}`);
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
      
    } catch (error) {
      log(`Change password error: ${error.message}`, 'error');
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
  
  /**
   * Check authentication status
   */
  async checkAuth(req, res) {
    try {
      if (!req.user) {
        return res.json({
          success: true,
          authenticated: false
        });
      }
      
      res.json({
        success: true,
        authenticated: true,
        user: req.user
      });
      
    } catch (error) {
      log(`Check auth error: ${error.message}`, 'error');
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = new AuthController();