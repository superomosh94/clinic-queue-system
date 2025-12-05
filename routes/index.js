const express = require('express');
const router = express.Router();
const PatientController = require('../controllers/patientController');

// Public routes
router.get('/', (req, res) => {
  res.render('index', { 
    title: 'Clinic Queue System',
    message: 'Welcome to our Smart Clinic Queue System'
  });
});

router.get('/queue-status', PatientController.getQueueStatus);
router.get('/join-queue', PatientController.joinQueue);
router.post('/join-queue', PatientController.createPatient);
router.get('/ticket/:ticketNumber', PatientController.viewTicket);
router.get('/rejoin/:ticketNumber', PatientController.rejoinQueue);

// About page
router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About Us',
    message: 'Smart Queue System for African Healthcare'
  });
});

// Contact page
router.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact Us',
    message: 'Get in touch with our team'
  });
});

module.exports = router;