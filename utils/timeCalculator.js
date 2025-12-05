const db = require('../config/db');
const serverConfig = require('../config/serverConfig');
const { getTimeDiffInMinutes } = require('./helpers');

/**
 * Calculate estimated wait time for a patient
 */
exports.calculateEstimatedWait = async (ticketNumber) => {
  try {
    // Count patients ahead in queue
    const [patientsAhead] = await db.execute(
      `SELECT COUNT(*) as count FROM patients 
       WHERE status = 'waiting' 
       AND created_at < (SELECT created_at FROM patients WHERE ticket_number = ?)
       AND ticket_number != ?`,
      [ticketNumber, ticketNumber]
    );
    
    const aheadCount = patientsAhead[0]?.count || 0;
    
    // Get average service time from settings or use default
    const avgServiceTime = serverConfig.averageServiceTime;
    
    // Calculate estimated wait
    const estimatedWait = aheadCount * avgServiceTime;
    
    return {
      patientsAhead: aheadCount,
      estimatedMinutes: estimatedWait,
      estimatedDisplay: estimatedWait < 60 ? 
        `${estimatedWait} minutes` : 
        `${Math.floor(estimatedWait / 60)}h ${estimatedWait % 60}m`
    };
    
  } catch (error) {
    console.error('Error calculating wait time:', error);
    return {
      patientsAhead: 0,
      estimatedMinutes: 15,
      estimatedDisplay: '15 minutes'
    };
  }
};

/**
 * Calculate actual wait time for completed patients
 */
exports.calculateActualWaitTime = (checkinTime, servedTime) => {
  const checkin = new Date(checkinTime);
  const served = new Date(servedTime);
  return Math.floor((served - checkin) / (1000 * 60)); // minutes
};

/**
 * Update average service time based on recent completions
 */
exports.updateAverageServiceTime = async () => {
  try {
    // Get last 20 completed patients
    const [recentPatients] = await db.execute(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, served_at, created_at)) as avg_time 
       FROM patients 
       WHERE status = 'served' 
       AND served_at IS NOT NULL 
       ORDER BY served_at DESC 
       LIMIT 20`
    );
    
    const avgTime = recentPatients[0]?.avg_time || serverConfig.averageServiceTime;
    
    // Update config (in memory)
    serverConfig.averageServiceTime = Math.round(avgTime);
    
    log(`Updated average service time: ${Math.round(avgTime)} minutes`);
    
  } catch (error) {
    log(`Error updating average service time: ${error.message}`, 'error');
  }
};