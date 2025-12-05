const db = require('../config/db');
const { log } = require('../utils/helpers');

class ClinicSettings {
  /**
   * Get clinic settings
   */
  static async get() {
    try {
      const [settings] = await db.execute(
        `SELECT 
          id,
          clinic_name,
          current_queue_number,
          avg_service_time,
          opening_time,
          closing_time,
          contact_phone,
          contact_email,
          address,
          updated_at
         FROM clinic_settings 
         WHERE id = 1`
      );

      if (settings.length === 0) {
        // Create default settings if not exists
        return await this.createDefault();
      }

      return settings[0];

    } catch (error) {
      log(`Error getting clinic settings: ${error.message}`, 'error');
      return this.getDefaultSettings();
    }
  }

  /**
   * Update clinic settings
   */
  static async update(updates) {
    try {
      const allowedFields = [
        'clinic_name',
        'avg_service_time',
        'opening_time',
        'closing_time',
        'contact_phone',
        'contact_email',
        'address'
      ];

      const updateFields = [];
      const updateValues = [];

      // Build dynamic update query
      for (const [field, value] of Object.entries(updates)) {
        if (allowedFields.includes(field) && value !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(value);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateValues.push(1); // ID is always 1

      const [result] = await db.execute(
        `UPDATE clinic_settings 
         SET ${updateFields.join(', ')}, updated_at = NOW()
         WHERE id = ?`,
        updateValues
      );

      if (result.affectedRows > 0) {
        log('Clinic settings updated');
        return true;
      }

      return false;

    } catch (error) {
      log(`Error updating clinic settings: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Get current queue number
   */
  static async getCurrentQueueNumber() {
    try {
      const [settings] = await db.execute(
        'SELECT current_queue_number FROM clinic_settings WHERE id = 1'
      );

      return settings[0]?.current_queue_number || 100;

    } catch (error) {
      log(`Error getting queue number: ${error.message}`, 'error');
      return 100;
    }
  }

  /**
   * Increment queue number
   */
  static async incrementQueueNumber() {
    try {
      const [result] = await db.execute(
        'UPDATE clinic_settings SET current_queue_number = current_queue_number + 1 WHERE id = 1'
      );

      if (result.affectedRows > 0) {
        const newNumber = await this.getCurrentQueueNumber();
        log(`Queue number incremented to: ${newNumber}`);
        return newNumber;
      }

      return null;

    } catch (error) {
      log(`Error incrementing queue number: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Check if clinic is open
   */
  static async isClinicOpen() {
    try {
      // For development/testing, always return true
      return true;

      /* Original logic commented out for testing
      const settings = await this.get();
      
      if (!settings.opening_time || !settings.closing_time) {
        return true; // Always open if no hours set
      }
      
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes
      
      const [openingHour, openingMinute] = settings.opening_time.split(':').map(Number);
      const [closingHour, closingMinute] = settings.closing_time.split(':').map(Number);
      
      const openingTime = openingHour * 60 + openingMinute;
      const closingTime = closingHour * 60 + closingMinute;
      
      return currentTime >= openingTime && currentTime <= closingTime;
      */
    } catch (error) {
      log(`Error checking clinic hours: ${error.message}`, 'error');
      return true;
    }
  }

  /**
   * Get operating hours as formatted string
   */
  static async getOperatingHours() {
    try {
      const settings = await this.get();

      if (!settings.opening_time || !settings.closing_time) {
        return '24/7';
      }

      const formatTime = (timeString) => {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
      };

      return `${formatTime(settings.opening_time)} - ${formatTime(settings.closing_time)}`;

    } catch (error) {
      return '8:00 AM - 5:00 PM';
    }
  }

  /**
   * Create default settings
   */
  static async createDefault() {
    try {
      const defaultSettings = this.getDefaultSettings();

      const [result] = await db.execute(
        `INSERT INTO clinic_settings (
          clinic_name,
          current_queue_number,
          avg_service_time,
          opening_time,
          closing_time
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          defaultSettings.clinic_name,
          defaultSettings.current_queue_number,
          defaultSettings.avg_service_time,
          defaultSettings.opening_time,
          defaultSettings.closing_time
        ]
      );

      log('Default clinic settings created');
      return defaultSettings;

    } catch (error) {
      log(`Error creating default settings: ${error.message}`, 'error');
      return this.getDefaultSettings();
    }
  }

  /**
   * Get default settings object
   */
  static getDefaultSettings() {
    return {
      id: 1,
      clinic_name: 'Community Health Clinic',
      current_queue_number: 100,
      avg_service_time: 15,
      opening_time: '08:00:00',
      closing_time: '17:00:00',
      contact_phone: null,
      contact_email: null,
      address: null,
      updated_at: new Date()
    };
  }

  /**
   * Reset queue number (start of day)
   */
  static async resetQueueNumber(startNumber = 100) {
    try {
      const [result] = await db.execute(
        'UPDATE clinic_settings SET current_queue_number = ? WHERE id = 1',
        [startNumber]
      );

      if (result.affectedRows > 0) {
        log(`Queue number reset to: ${startNumber}`);
        return true;
      }

      return false;

    } catch (error) {
      log(`Error resetting queue number: ${error.message}`, 'error');
      throw error;
    }
  }
}

module.exports = ClinicSettings;