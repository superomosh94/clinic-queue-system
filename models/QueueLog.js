const db = require('../config/db');
const { log } = require('../utils/helpers');

class QueueLog {
  /**
   * Log patient completion
   */
  static async create(logData) {
    try {
      const [result] = await db.execute(
        `INSERT INTO queue_logs (
          ticket_number,
          checkin_time,
          served_time,
          total_wait_time,
          served_by
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          logData.ticket_number,
          logData.checkin_time,
          logData.served_time || new Date(),
          logData.total_wait_time,
          logData.served_by
        ]
      );

      return result.insertId;

    } catch (error) {
      log(`Error creating queue log: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Get logs for specific date
   */
  static async getByDate(date) {
    try {
      const [logs] = await db.execute(
        `SELECT 
          ql.*,
          s.full_name as staff_name
         FROM queue_logs ql
         LEFT JOIN staff s ON ql.served_by = s.id
         WHERE DATE(ql.served_time) = ?
         ORDER BY ql.served_time DESC`,
        [date]
      );

      return logs;

    } catch (error) {
      log(`Error getting logs for date ${date}: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Get logs within date range
   */
  static async getByDateRange(startDate, endDate) {
    try {
      const [logs] = await db.execute(
        `SELECT 
          ql.*,
          s.full_name as staff_name
         FROM queue_logs ql
         LEFT JOIN staff s ON ql.served_by = s.id
         WHERE DATE(ql.served_time) BETWEEN ? AND ?
         ORDER BY ql.served_time ASC`,
        [startDate, endDate]
      );

      return logs;

    } catch (error) {
      log(`Error getting logs for range ${startDate}-${endDate}: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Get summary statistics for date range
   */
  static async getSummaryStats(startDate, endDate) {
    try {
      const [stats] = await db.execute(
        `SELECT 
          COUNT(*) as total_patients,
          AVG(total_wait_time) as avg_wait_time,
          MIN(total_wait_time) as min_wait_time,
          MAX(total_wait_time) as max_wait_time,
          SUM(CASE WHEN total_wait_time <= 30 THEN 1 ELSE 0 END) as patients_under_30min,
          SUM(CASE WHEN total_wait_time > 30 AND total_wait_time <= 60 THEN 1 ELSE 0 END) as patients_30_to_60min,
          SUM(CASE WHEN total_wait_time > 60 THEN 1 ELSE 0 END) as patients_over_60min
         FROM queue_logs 
         WHERE served_time BETWEEN ? AND ?`,
        [startDate, endDate]
      );

      return stats[0] || {
        total_patients: 0,
        avg_wait_time: 0,
        min_wait_time: 0,
        max_wait_time: 0,
        patients_under_30min: 0,
        patients_30_to_60min: 0,
        patients_over_60min: 0
      };

    } catch (error) {
      log(`Error getting summary stats: ${error.message}`, 'error');
      return {
        total_patients: 0,
        avg_wait_time: 0,
        min_wait_time: 0,
        max_wait_time: 0,
        patients_under_30min: 0,
        patients_30_to_60min: 0,
        patients_over_60min: 0
      };
    }
  }

  /**
   * Get daily statistics
   */
  static async getDailyStats(date) {
    try {
      const [stats] = await db.execute(
        `SELECT 
          DATE(served_time) as date,
          COUNT(*) as total_patients,
          AVG(total_wait_time) as avg_wait_time,
          MIN(total_wait_time) as min_wait_time,
          MAX(total_wait_time) as max_wait_time,
          SUM(CASE WHEN total_wait_time <= 30 THEN 1 ELSE 0 END) as patients_under_30min,
          SUM(CASE WHEN total_wait_time > 30 AND total_wait_time <= 60 THEN 1 ELSE 0 END) as patients_30_to_60min,
          SUM(CASE WHEN total_wait_time > 60 THEN 1 ELSE 0 END) as patients_over_60min
         FROM queue_logs 
         WHERE DATE(served_time) = ?
         GROUP BY DATE(served_time)`,
        [date]
      );

      return stats[0] || {
        date: date,
        total_patients: 0,
        avg_wait_time: 0,
        min_wait_time: 0,
        max_wait_time: 0,
        patients_under_30min: 0,
        patients_30_to_60min: 0,
        patients_over_60min: 0
      };

    } catch (error) {
      log(`Error getting daily stats: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Get hourly statistics for a specific date
   */
  static async getHourlyStats(date) {
    try {
      const [stats] = await db.execute(
        `SELECT 
          HOUR(served_time) as hour,
          COUNT(*) as patients_served,
          AVG(total_wait_time) as avg_wait_time
         FROM queue_logs 
         WHERE DATE(served_time) = ?
         GROUP BY HOUR(served_time)
         ORDER BY hour`,
        [date]
      );

      // Fill in missing hours with zeros
      const hourlyStats = [];
      for (let hour = 8; hour <= 17; hour++) { // Clinic hours 8 AM to 5 PM
        const hourData = stats.find(s => s.hour === hour);
        hourlyStats.push({
          hour: hour,
          hour_display: `${hour}:00`,
          patients_served: hourData ? hourData.patients_served : 0,
          avg_wait_time: hourData ? Math.round(hourData.avg_wait_time) : 0
        });
      }

      return hourlyStats;

    } catch (error) {
      log(`Error getting hourly stats: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Get weekly statistics
   */
  static async getWeeklyStats(startDate) {
    try {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      const [stats] = await db.execute(
        `SELECT 
          DATE(served_time) as date,
          DAYNAME(served_time) as day_name,
          COUNT(*) as total_patients,
          AVG(total_wait_time) as avg_wait_time
         FROM queue_logs 
         WHERE served_time BETWEEN ? AND ?
         GROUP BY DATE(served_time), DAYNAME(served_time)
         ORDER BY date`,
        [startDate, endDate]
      );

      return stats;

    } catch (error) {
      log(`Error getting weekly stats: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Get monthly statistics
   */
  static async getMonthlyStats(year, month) {
    try {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0); // Last day of month

      const [stats] = await db.execute(
        `SELECT 
          DATE(served_time) as date,
          COUNT(*) as total_patients,
          AVG(total_wait_time) as avg_wait_time
         FROM queue_logs 
         WHERE served_time BETWEEN ? AND ?
         GROUP BY DATE(served_time)
         ORDER BY date`,
        [startDate, endDate]
      );

      return stats;

    } catch (error) {
      log(`Error getting monthly stats: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Get staff performance from logs
   */
  static async getStaffPerformance(startDate, endDate) {
    try {
      const [performance] = await db.execute(
        `SELECT 
          s.id,
          s.full_name,
          s.role,
          COUNT(ql.id) as patients_served,
          AVG(ql.total_wait_time) as avg_wait_time,
          MIN(ql.served_time) as first_service,
          MAX(ql.served_time) as last_service
         FROM staff s
         LEFT JOIN queue_logs ql ON s.id = ql.served_by
         WHERE ql.served_time BETWEEN ? AND ?
         GROUP BY s.id, s.full_name, s.role
         ORDER BY patients_served DESC`,
        [startDate, endDate]
      );

      return performance;

    } catch (error) {
      log(`Error getting staff performance: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Get overall statistics
   */
  static async getOverallStats() {
    try {
      const [stats] = await db.execute(
        `SELECT 
          COUNT(*) as total_patients_served,
          AVG(total_wait_time) as overall_avg_wait,
          MIN(total_wait_time) as fastest_service,
          MAX(total_wait_time) as longest_wait,
          MIN(checkin_time) as first_record,
          MAX(served_time) as last_record
         FROM queue_logs`
      );

      return stats[0] || {
        total_patients_served: 0,
        overall_avg_wait: 0,
        fastest_service: 0,
        longest_wait: 0,
        first_record: null,
        last_record: null
      };

    } catch (error) {
      log(`Error getting overall stats: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Clean up old logs
   */
  static async cleanup(daysToKeep = 90) {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysToKeep);

      const [result] = await db.execute(
        'DELETE FROM queue_logs WHERE served_time < ?',
        [cutoff]
      );

      log(`Cleaned up ${result.affectedRows} old queue logs`);
      return result.affectedRows;

    } catch (error) {
      log(`Error cleaning up queue logs: ${error.message}`, 'error');
      return 0;
    }
  }
}

module.exports = QueueLog;