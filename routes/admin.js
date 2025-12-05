const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticateJWT } = require('../middleware/auth');
const requireAdmin = require('../middleware/adminCheck');

// Admin login page (public)
router.get('/login', (req, res) => {
  res.render('admin/login', { 
    title: 'Admin Login',
    error: null 
  });
});

// Protected admin routes
router.use(authenticateJWT);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', AdminController.dashboard);

// Staff management
router.get('/staff', AdminController.staffManagement);
router.post('/staff', AdminController.createStaff);
router.put('/staff/:id', AdminController.updateStaff);
router.delete('/staff/:id', AdminController.deleteStaff);

// Clinic settings
router.put('/settings', AdminController.updateClinicSettings);

// Reports and analytics
router.get('/reports', AdminController.getReports);
router.get('/export', AdminController.exportData);

// System maintenance
router.post('/maintenance', AdminController.systemMaintenance);
router.post('/broadcast', AdminController.sendBroadcast);

module.exports = router;