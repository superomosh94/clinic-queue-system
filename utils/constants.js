/**
 * Application constants
 */

module.exports = {
  // Queue statuses
  QUEUE_STATUS: {
    WAITING: 'waiting',
    IN_PROGRESS: 'in-progress',
    SERVED: 'served',
    NO_SHOW: 'no-show'
  },
  
  // User roles
  USER_ROLES: {
    PATIENT: 'patient',
    STAFF: 'staff',
    ADMIN: 'admin'
  },
  
  // Notification types
  NOTIFICATION_TYPES: {
    TURN_NOW: 'turn_now',
    TURN_SOON: 'turn_soon',
    WAIT_UPDATE: 'wait_update',
    CLINIC_ANNOUNCEMENT: 'clinic_announcement'
  },
  
  // Time constants (in milliseconds)
  TIME: {
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000
  },
  
  // Limits
  LIMITS: {
    MAX_QUEUE_LENGTH: 100,
    MAX_WAIT_TIME: 240, // 4 hours in minutes
    MAX_NOTIFICATIONS_PER_PATIENT: 3
  },
  
  // Messages
  MESSAGES: {
    WELCOME: 'Welcome to the Clinic Queue System',
    TICKET_ISSUED: 'Your ticket has been issued',
    TURN_NOW: 'Your turn is now! Please proceed to the counter.',
    TURN_SOON: 'You will be called soon. Please stay nearby.',
    CLINIC_CLOSED: 'The clinic is currently closed. Please visit during working hours.'
  },
  
  // Colors for UI
  COLORS: {
    PRIMARY: '#3498db',
    SUCCESS: '#2ecc71',
    WARNING: '#f39c12',
    DANGER: '#e74c3c',
    INFO: '#3498db',
    DARK: '#2c3e50',
    LIGHT: '#ecf0f1'
  }
};