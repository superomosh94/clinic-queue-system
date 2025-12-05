// authController.js - WITH DEBUG LOGGING
console.log('=== AUTH CONTROLLER LOADING ===');

try {
  const bcrypt = require('bcryptjs');
  console.log('✅ bcryptjs loaded successfully');
} catch (error) {
  console.error('❌ bcryptjs error:', error.message);
  console.error(error.stack);
}

try {
  const db = require('../config/db');
  console.log('✅ Database module loaded');
} catch (error) {
  console.error('❌ Database error:', error.message);
}

try {
  const authMiddleware = require('../middleware/auth');
  console.log('✅ Auth middleware loaded');
} catch (error) {
  console.error('❌ Middleware error:', error.message);
}

console.log('=== AUTH CONTROLLER READY ===\n');

const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { 
  generateToken, 
  setTokenCookie, 
  clearTokenCookie, 
  blacklistToken 
} = require('../middleware/auth');
const { log } = require('../utils/helpers');

class AuthController {
  async login(req, res) {
    console.log('\n=== LOGIN ATTEMPT ===');
    console.log('Request body:', req.body);
    console.log('Headers:', req.headers['content-type']);
    
    try {
      const { username, password } = req.body;
      
      console.log('🔐 Username:', username);
      console.log('🔑 Password length:', password ? password.length : 0);
      
      if (!username || !password) {
        console.log('❌ Missing credentials');
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }
      
      console.log('📊 Querying database for user:', username);
      const [staffRows] = await db.execute(
        'SELECT * FROM staff WHERE username = ? AND is_active = TRUE',
        [username]
      );
      
      console.log('📈 Database returned', staffRows.length, 'rows');
      
      if (staffRows.length === 0) {
        console.log('❌ User not found in database');
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }
      
      const staff = staffRows[0];
      console.log('✅ User found:', staff.username);
      console.log('📝 Password hash (first 30 chars):', staff.password_hash.substring(0, 30) + '...');
      
      console.log('🔍 Comparing password with bcryptjs...');
      const isValidPassword = await bcrypt.compare(password, staff.password_hash);
      console.log('🔑 Password comparison result:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('❌ Password does not match');
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }
      
      console.log('✅ Password verified successfully');
      
      console.log('🎫 Generating JWT token...');
      const token = generateToken({
        id: staff.id,
        username: staff.username,
        role: staff.role,
        full_name: staff.full_name
      });
      
      console.log('🍪 Setting cookie...');
      setTokenCookie(res, token);
      
      console.log('📤 Sending success response...');
      res.json({
        success: true,
        message: 'Login successful',
        redirectTo: '/dashboard',
        user: {
          id: staff.id,
          username: staff.username,
          fullName: staff.full_name,
          role: staff.role
        }
      });
      
      console.log('✅ Login completed successfully\n');
      
    } catch (error) {
      console.error('❌ LOGIN ERROR:');
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      console.error('Error type:', error.constructor.name);
      
      res.status(500).json({
        success: false,
        message: 'Server error: ' + error.message
      });
    }
  }
  
  // ... rest of your methods
}

module.exports = new AuthController();