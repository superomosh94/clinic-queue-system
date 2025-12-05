// middleware/staffCheck.js

const requireStaff = (req, res, next) => {
  console.log('STAFFCHECK: Verifying staff role...');
  
  // Check if user exists
  if (!req.user) {
    console.log('STAFFCHECK: No user found in request');
    return res.status(401).redirect('/staff/login');
  }
  
  // Check if user has staff role
  if (req.user.role !== 'staff') {
    console.log(`STAFFCHECK: User role "${req.user.role}" is not staff`);
    return res.status(403).render('error/403', {
      title: 'Access Denied',
      message: 'Staff privileges required to access this page.'
    });
  }
  
  console.log(`STAFFCHECK: User ${req.user.username || req.user.id} is authorized staff`);
  next();
};

// Make sure to export it properly
module.exports = {
  requireStaff
};

// Also export as default for flexibility
module.exports.requireStaff = requireStaff;