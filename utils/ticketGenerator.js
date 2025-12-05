const db = require('../config/db');
const serverConfig = require('../config/serverConfig');
const { log } = require('./helpers');

/**
 * Generate unique ticket number for patient
 */
exports.generateTicketNumber = async () => {
  try {
    // Get current queue number from clinic settings
    const [settings] = await db.execute(
      'SELECT current_queue_number FROM clinic_settings WHERE id = 1'
    );
    
    let currentNumber;
    if (settings.length === 0) {
      // Initialize settings if not exists
      await db.execute(
        'INSERT INTO clinic_settings (current_queue_number) VALUES (100)'
      );
      currentNumber = 100;
    } else {
      currentNumber = settings[0].current_queue_number;
    }
    
    // Increment queue number
    const nextNumber = currentNumber + 1;
    await db.execute(
      'UPDATE clinic_settings SET current_queue_number = ? WHERE id = 1',
      [nextNumber]
    );
    
    // Format ticket number (e.g., CLINIC-101)
    const ticketNumber = `${serverConfig.clinicCode}-${nextNumber}`;
    
    log(`Generated ticket: ${ticketNumber}`);
    return ticketNumber;
    
  } catch (error) {
    log(`Error generating ticket: ${error.message}`, 'error');
    throw new Error('Failed to generate ticket number');
  }
};

/**
 * Get next ticket number without incrementing (for display)
 */
exports.getNextTicketNumber = async () => {
  try {
    const [settings] = await db.execute(
      'SELECT current_queue_number FROM clinic_settings WHERE id = 1'
    );
    
    const currentNumber = settings[0]?.current_queue_number || 100;
    return `${serverConfig.clinicCode}-${currentNumber + 1}`;
    
  } catch (error) {
    return `${serverConfig.clinicCode}-100`;
  }
};