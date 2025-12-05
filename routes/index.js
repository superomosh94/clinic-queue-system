const express = require('express');
const router = express.Router();
const PatientController = require('../controllers/patientController');
const { authenticateJWT } = require('../middleware/auth');

// ========== PUBLIC PATIENT ROUTES ==========

// Home page
router.get('/', (req, res) => {
  res.render('index', {
    title: 'Clinic Queue System',
    message: 'Welcome to our Smart Clinic Queue System',
    user: req.user || null
  });
});

// Login page - Render the unified login page
router.get('/login', (req, res) => {
  res.render('auth/login', {
    title: 'Login',
    user: req.user || null
  });
});

// Dashboard - REDIRECT to API dashboard
router.get('/dashboard', (req, res) => {
  res.redirect('/api/auth/dashboard');
});

// Profile Page (Protected)
router.get('/profile', authenticateJWT, (req, res) => {
  res.render('profile', {
    title: 'My Profile',
    user: req.user
  });
});

// Queue status page (public)
router.get('/queue-status', PatientController.getQueueStatus);

// Join queue page
router.get('/join-queue', PatientController.joinQueue);

// Handle joining queue form submission
router.post('/join-queue', PatientController.createPatient);

// View ticket by number
router.get('/ticket/:ticketNumber', PatientController.viewTicket);

// Rejoin queue with existing ticket
router.get('/rejoin/:ticketNumber', PatientController.rejoinQueue);

// ========== INFORMATION PAGES ==========

// About page
router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About Us - Clinic Queue System',
    message: 'Smart Queue System for African Healthcare',
    user: req.user || null
  });
});

// Contact page
router.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact Us - Clinic Queue System',
    message: 'Get in touch with our team',
    user: req.user || null
  });
});

module.exports = router;