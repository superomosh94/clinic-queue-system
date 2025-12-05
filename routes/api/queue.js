const express = require('express');
const router = express.Router();
const QueueController = require('../../controllers/queueController');
const { authenticateJWT } = require('../../middleware/auth');
const { requireStaff } = require('../../middleware/staffCheck');
const requireAdmin = require('../../middleware/adminCheck');
const { apiLimiter } = require('../../middleware/rateLimiter');

// Public queue API endpoints
router.get('/status', apiLimiter, QueueController.getQueueStatus);
router.post('/join', apiLimiter, QueueController.joinQueueAPI);
router.get('/wait-time/:ticketNumber?', apiLimiter, QueueController.getEstimatedWait);
router.get('/position/:ticketNumber', apiLimiter, QueueController.getPatientPosition);
router.get('/waiting', apiLimiter, QueueController.getWaitingPatientsAPI);
router.get('/active', apiLimiter, QueueController.getActivePatientsAPI);
router.get('/stats', apiLimiter, QueueController.getQueueStatsAPI);

// Staff-only queue API endpoints
router.use(authenticateJWT);
router.use(requireStaff);

router.post('/call-next', apiLimiter, QueueController.callNextPatientAPI);
router.post('/complete/:ticketNumber', apiLimiter, QueueController.completePatientAPI);
router.post('/no-show/:ticketNumber', apiLimiter, QueueController.markNoShowAPI);

// Admin-only queue API endpoints
router.use(requireAdmin);
router.post('/cleanup', apiLimiter, QueueController.cleanupQueue);

module.exports = router;