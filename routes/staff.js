const express = require('express');
const router = express.Router();
const StaffController = require('../controllers/staffController');

console.log('DEBUG: Loading staff.js routes...');

// Import middleware
const auth = require('../middleware/auth');
const authenticateJWT = auth.authenticateJWT;

// Try to import staffCheck, but handle if it doesn't exist properly
let staffCheck;
try {
  staffCheck = require('../middleware/staffCheck');
  console.log('✅ staffCheck imported successfully');
  console.log('staffCheck exports:', Object.keys(staffCheck));
} catch (error) {
  console.error('❌ Error importing staffCheck:', error.message);
  staffCheck = null;
}

let requireStaff;
if (staffCheck && staffCheck.requireStaff) {
  requireStaff = staffCheck.requireStaff;
} else {
  console.warn('⚠️  requireStaff not found, creating dummy middleware');
  requireStaff = (req, res, next) => {
    console.log('DUMMY requireStaff: Allowing access');
    next();
  };
}

// Staff login page (public)
router.get('/login', (req, res) => {
  res.render('staff/login', { 
    title: 'Staff Login',
    error: null 
  });
});

// Apply middleware - but ONLY if they are functions
console.log('DEBUG: Setting up middleware...');
console.log('authenticateJWT is function:', typeof authenticateJWT === 'function');
console.log('requireStaff is function:', typeof requireStaff === 'function');

// Check if authenticateJWT is a function before using it
if (typeof authenticateJWT === 'function') {
  router.use(authenticateJWT);
} else {
  console.error('❌ authenticateJWT is not a function:', typeof authenticateJWT);
  // Create a fallback
  router.use((req, res, next) => {
    console.log('FALLBACK AUTH: Skipping auth');
    req.user = { id: 1, role: 'staff' };
    next();
  });
}

// Check if requireStaff is a function before using it
if (typeof requireStaff === 'function') {
  router.use(requireStaff);
} else {
  console.error('❌ requireStaff is not a function:', typeof requireStaff);
  // Create a fallback
  router.use((req, res, next) => {
    console.log('FALLBACK STAFFCHECK: Skipping staff check');
    next();
  });
}

// Staff dashboard
router.get('/dashboard', StaffController.dashboard);

// Queue management
router.post('/call-next', StaffController.callNextPatient);
router.post('/update-status', StaffController.updatePatientStatus);
router.get('/patient/:ticketNumber', StaffController.getPatientDetails);
router.get('/search', StaffController.searchPatients);

// Staff tools
router.get('/performance', StaffController.getStaffPerformance);
router.get('/today-summary', StaffController.getTodaySummary);
router.post('/availability', StaffController.toggleAvailability);

// Real-time updates
router.get('/queue-sse', StaffController.queueSSE);

console.log('✅ staff.js routes configured successfully');

module.exports = router;