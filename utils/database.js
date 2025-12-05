const db = require('../config/db');
const { log } = require('./helpers');

/**
 * Database utility functions
 */

// Initialize database with required data
exports.initializeDatabase = async () => {
  try {
    // Check if clinic_settings exists
    const [settings] = await db.execute(
      'SELECT COUNT(*) as count FROM clinic_settings WHERE id = 1'
    );
    
    if (settings[0].count === 0) {
      await db.execute(
        `INSERT INTO clinic_settings (
          clinic_name, 
          current_queue_number, 
          avg_service_time, 
          opening_time, 
          closing_time
        ) VALUES (?, ?, ?, ?, ?)`,
        ['Community Health Clinic', 100, 15, '08:00:00', '17:00:00']
      );
      log('Clinic settings initialized');
    }
    
    // Check if admin staff exists
    const [staff] = await db.execute(
      'SELECT COUNT(*) as count FROM staff WHERE role = "admin"'
    );
    
    if (staff[0].count === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await db.execute(
        `INSERT INTO staff (username, password_hash, role, full_name) 
         VALUES (?, ?, ?, ?)`,
        ['admin', hashedPassword, 'admin', 'Clinic Administrator']
      );
      log('Default admin account created (username: admin, password: admin123)');
    }
    
    return { success: true, message: 'Database initialized successfully' };
    
  } catch (error) {
    log(`Database initialization failed: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
};

// Clean up old queue data
exports.cleanupOldData = async (hours = 24) => {
  try {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    // Archive served patients to queue_logs
    await db.execute(
      `INSERT INTO queue_logs (ticket_number, checkin_time, served_time, total_wait_time)
       SELECT ticket_number, created_at, served_at, 
              TIMESTAMPDIFF(MINUTE, created_at, served_at)
       FROM patients 
       WHERE status = 'served' 
       AND created_at < ?`,
      [cutoff]
    );
    
    // Delete old served patients
    await db.execute(
      'DELETE FROM patients WHERE status = "served" AND created_at < ?',
      [cutoff]
    );
    
    // Delete old no-shows
    await db.execute(
      'DELETE FROM patients WHERE status = "no-show" AND created_at < ?',
      [cutoff]
    );
    
    const [result] = await db.execute('SELECT ROW_COUNT() as deleted');
    log(`Cleaned up ${result[0].deleted} old records`);
    
    return result[0].deleted;
    
  } catch (error) {
    log(`Cleanup failed: ${error.message}`, 'error');
    return 0;
  }
};

// Get database statistics
exports.getDatabaseStats = async () => {
  try {
    const stats = {};
    
    // Count patients by status
    const [patientCounts] = await db.execute(
      `SELECT 
        status,
        COUNT(*) as count
       FROM patients 
       GROUP BY status`
    );
    
    stats.patients = patientCounts.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {});
    
    // Count staff
    const [staffCounts] = await db.execute(
      'SELECT role, COUNT(*) as count FROM staff WHERE is_active = 1 GROUP BY role'
    );
    
    stats.staff = staffCounts.reduce((acc, row) => {
      acc[row.role] = row.count;
      return acc;
    }, {});
    
    // Get queue logs count
    const [logCount] = await db.execute('SELECT COUNT(*) as count FROM queue_logs');
    stats.totalServed = logCount[0].count;
    
    // Get today's stats
    const [todayStats] = await db.execute(
      `SELECT 
        COUNT(*) as served_today,
        AVG(TIMESTAMPDIFF(MINUTE, checkin_time, served_time)) as avg_wait_today
       FROM queue_logs 
       WHERE DATE(served_time) = CURDATE()`
    );
    
    stats.today = todayStats[0];
    
    return stats;
    
  } catch (error) {
    log(`Failed to get database stats: ${error.message}`, 'error');
    return null;
  }
};