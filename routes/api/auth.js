const express = require('express');
const router = express.Router();

console.log('📄 Loading auth.js routes...');

try {
  const AuthController = require('../../controllers/authController');
  console.log('✅ AuthController loaded successfully');
  console.log('🔍 AuthController.login type:', typeof AuthController.login);

  // POST /api/auth/login
  router.post('/login', (req, res) => {
    console.log('🔄 /api/auth/login route called');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    AuthController.login(req, res);
  });

  // GET /api/auth/logout
  router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
  });

} catch (error) {
  console.error('❌ Failed to load AuthController:', error.message);
  console.error(error.stack);

  // Create a fallback route for debugging
  router.post('/login', (req, res) => {
    console.log('⚠️  Using fallback login route');
    res.json({
      success: false,
      message: 'AuthController failed to load: ' + error.message
    });
  });
}

// GET /api/auth/check
router.get('/check', (req, res) => {
  res.json({
    success: true,
    authenticated: false,
    message: 'API is working'
  });
});

module.exports = router;