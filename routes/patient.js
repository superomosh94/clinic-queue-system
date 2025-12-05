const express = require('express');
const router = express.Router();
const PatientController = require('../controllers/patientController');
const { queueJoinLimiter } = require('../middleware/rateLimiter');

// Patient routes (public)
router.get('/queue-status', PatientController.getQueueStatus);
router.get('/join', queueJoinLimiter, PatientController.joinQueue);
router.post('/join', queueJoinLimiter, PatientController.createPatient);
router.get('/ticket/:ticketNumber', PatientController.viewTicket);
router.get('/rejoin/:ticketNumber', PatientController.rejoinQueue);
router.get('/check/:ticketNumber', PatientController.checkPosition);

module.exports = router;