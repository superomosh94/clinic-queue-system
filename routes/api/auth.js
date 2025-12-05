const express = require('express');
const router = express.Router();
const AuthController = require('../../controllers/authController');
const { authenticateJWT } = require('../../middleware/auth');



// ========== PUBLIC ROUTES ==========

// Login page
router.get('/login', (req, res) => {
  if (req.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login');
});

// API Login
router.post('/api/login', AuthController.login);

// Logout redirect
router.get('/logout', (req, res) => {
  res.redirect('/api/logout');
});

// ========== PROTECTED ROUTES (require auth) ==========

// Apply authentication middleware to all following routes
router.use(authenticateJWT);

// Dashboard page
router.get('/dashboard', (req, res) => {
  res.render('dashboard/index', {
    pageTitle: 'Dashboard',
    user: req.user
  });
});

// API Logout
router.post('/api/logout', AuthController.logout);

// Other API endpoints
router.get('/api/profile', AuthController.getProfile);
router.post('/api/change-password', AuthController.changePassword);
router.post('/api/refresh', AuthController.refreshToken);
router.get('/api/check', AuthController.checkAuth);

module.exports = router;