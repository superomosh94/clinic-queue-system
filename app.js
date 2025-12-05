const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

console.log('🚀 Starting Clinic Queue System...');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== ADD THIS LINE ==========
// Trust proxy for rate limiting (fixes X-Forwarded-For header issue)
app.set('trust proxy', 1);
// ===================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// CORS
app.use(cors());

// Rate limiting - Updated with validate option
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  // Add validation options to handle proxy headers properly
  validate: {
    trustProxy: true,
    xForwardedForHeader: false  // Temporarily disable validation while developing
  }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Import and set up routes with error handling
console.log('📂 Loading routes...');

// First, let's define all our routes
const routes = [
  { path: '/', file: './routes/index' },
  { path: '/patient', file: './routes/patient' },
  { path: '/staff', file: './routes/staff' },
  { path: '/admin', file: './routes/admin' },
  { path: '/api/auth', file: './routes/api/auth' },
  { path: '/api/queue', file: './routes/api/queue' },
  { path: '/api/stats', file: './routes/api/stats' }
];

// Load each route with validation
routes.forEach(route => {
  try {
    console.log(`\n📁 Attempting to load: ${route.file}`);
    const router = require(route.file);
    
    // Validate it's a router
    if (router && typeof router === 'function' && router.name === 'router') {
      app.use(route.path, router);
      console.log(`✅ Route ${route.path} loaded successfully`);
    } else if (router && typeof router === 'function') {
      // It's a function but maybe not a router (could be an app)
      app.use(route.path, router);
      console.log(`⚠️  Route ${route.path} loaded as function (not router)`);
    } else {
      console.error(`❌ ${route.file} does not export a router or function`);
      console.log(`   Type: ${typeof router}`);
      console.log(`   Value:`, router);
      
      // Create a fallback router - FIXED: Use 500.ejs instead of 501.ejs
      const fallbackRouter = express.Router();
      fallbackRouter.all('*', (req, res) => {
        res.status(500).render('error/500', {
          pageTitle: 'Route Configuration Error',
          message: `Route ${route.path} is not properly configured. Please check ${route.file}`,
          user: req.user || null
        });
      });
      app.use(route.path, fallbackRouter);
    }
  } catch (error) {
    console.error(`❌ Failed to load ${route.file}:`, error.message);
    
    // Create a fallback router for missing routes - FIXED: Use 500.ejs
    const fallbackRouter = express.Router();
    fallbackRouter.all('*', (req, res) => {
      res.status(500).render('error/500', {
        pageTitle: 'Route Under Construction',
        message: `The ${route.path} routes are currently being set up. Check ${route.file}`,
        user: req.user || null
      });
    });
    app.use(route.path, fallbackRouter);
    console.log(`⚠️  Created fallback router for ${route.path}`);
  }
});

// Basic home route if index route fails
app.get('/', (req, res) => {
  res.render('index', { 
    pageTitle: 'Clinic Queue System',
    user: req.user || null
  });
});

// ========== ERROR HANDLERS (Only define ONCE) ==========

// 404 handler (must be after all routes but before error handler)
app.use((req, res, next) => {
  res.status(404).render('error/404', {
    pageTitle: 'Page Not Found - Clinic Queue System',
    message: 'The page you are looking for does not exist.',
    user: req.user || null
  });
});

// Global error handler (must be last)
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  console.error(err.stack);
  
  const statusCode = err.status || 500;
  
  // Use 500.ejs for all server errors (500, 501, 502, etc.)
  res.status(statusCode).render('error/500', {
    pageTitle: statusCode === 404 ? 'Page Not Found' : 'Server Error - Clinic Queue System',
    message: err.message || 'An unexpected error occurred.',
    error: process.env.NODE_ENV === 'development' ? err : null,
    user: req.user || null
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log(`🏥 Clinic Queue System Ready!`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📋 Available routes:`);
  routes.forEach(r => console.log(`  http://localhost:${PORT}${r.path}`));
  console.log(`\n🎉 Try visiting: http://localhost:${PORT}/api/auth/login`);
  console.log(`   (or try: http://localhost:${PORT}/staff/dashboard if logged in)`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
});