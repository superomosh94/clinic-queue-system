const express = require('express');
const router = express.Router();
const StatsController = require('../../controllers/statsController');
const { authenticateJWT } = require('../../middleware/auth');
const requireAdmin = require('../../middleware/adminCheck');
const { apiLimiter } = require('../../middleware/rateLimiter');

// Public stats endpoints
router.get('/queue-analytics', apiLimiter, StatsController.getQueueAnalytics);
router.get('/realtime', apiLimiter, StatsController.getRealtimeMetrics);

// Admin-only stats endpoints
router.use(authenticateJWT);
router.use(requireAdmin);

router.get('/dashboard', apiLimiter, StatsController.getDashboardStats);
router.get('/daily/:date', apiLimiter, StatsController.getDailyStatistics);
router.get('/date-range', apiLimiter, StatsController.getDateRangeStats);
router.get('/staff-performance', apiLimiter, StatsController.getStaffPerformanceStats);
router.get('/notifications', apiLimiter, StatsController.getNotificationStats);
router.get('/export', apiLimiter, StatsController.exportStatistics);

module.exports = router;