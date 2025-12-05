module.exports = {
  clinicName: process.env.CLINIC_NAME || 'Community Health Clinic',
  clinicCode: process.env.CLINIC_CODE || 'CLINIC',
  averageServiceTime: parseInt(process.env.AVERAGE_SERVICE_TIME) || 15, // minutes
  maxQueueLength: 50,
  notificationAdvance: 2, // Notify when 2 patients away
  autoCleanupHours: 24, // Clean old data after 24 hours
  timezone: 'Africa/Johannesburg'
};