const db = require('../config/db');
const { QUEUE_STATUS } = require('../utils/constants');
const { calculateEstimatedWait, calculateActualWaitTime } = require('../utils/timeCalculator');
const { log } = require('../utils/helpers');

class Patient {
  /**
   * Create a new patient in queue
   */
  static async create(phone = null, email = null) {
    const connection = await db.getConnection();

    try {
      // Check if phone number or email already has an active ticket (waiting or in-progress)
      if (phone || email) {
        let query = `SELECT ticket_number FROM patients WHERE status IN (?, ?) AND (`;
        let params = [QUEUE_STATUS.WAITING, QUEUE_STATUS.IN_PROGRESS];

        if (phone && email) {
          query += `phone = ? OR email = ?)`;
          params.push(phone, email);
        } else if (phone) {
          query += `phone = ?)`;
          params.push(phone);
        } else {
          query += `email = ?)`;
          params.push(email);
        }

        const [existing] = await connection.execute(query, params);

        if (existing.length > 0) {
          throw new Error(`You already have an active ticket: ${existing[0].ticket_number}`);
        }
      }

      await connection.beginTransaction();

      // Get next ticket number
      const { generateTicketNumber } = require('../utils/ticketGenerator');
      const ticketNumber = await generateTicketNumber();

      // Calculate estimated wait
      const estimatedWait = await calculateEstimatedWait(ticketNumber);

      // Insert patient
      const [result] = await connection.execute(
        `INSERT INTO patients (
          ticket_number, 
          phone, 
          email,
          estimated_wait,
          status
        ) VALUES (?, ?, ?, ?, ?)`,
        [ticketNumber, phone, email, estimatedWait.estimatedMinutes, QUEUE_STATUS.WAITING]
      );

      await connection.commit();

      log(`New patient created: ${ticketNumber}`);

      return {
        id: result.insertId,
        ticketNumber,
        estimatedWait,
        message: `Your ticket number is ${ticketNumber}. Estimated wait: ${estimatedWait.estimatedDisplay}`
      };

    } catch (error) {
      await connection.rollback();
      log(`Error creating patient: ${error.message}`, 'error');
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get patient by ticket number
   */
  static async findByTicket(ticketNumber) {
    try {
      const [patients] = await db.execute(
        `SELECT 
          id,
          ticket_number,
          phone,
          email,
          estimated_wait,
          status,
          created_at,
          served_at,
          TIMESTAMPDIFF(MINUTE, created_at, NOW()) as wait_time_so_far
         FROM patients 
         WHERE ticket_number = ?`,
        [ticketNumber]
      );

      if (patients.length === 0) {
        return null;
      }

      const patient = patients[0];

      // Update estimated wait if still waiting
      if (patient.status === QUEUE_STATUS.WAITING) {
        const estimatedWait = await calculateEstimatedWait(ticketNumber);
        patient.estimated_wait = estimatedWait.estimatedMinutes;
        patient.patients_ahead = estimatedWait.patientsAhead;
      }

      return patient;

    } catch (error) {
      log(`Error finding patient ${ticketNumber}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Update patient status
   */
  static async updateStatus(ticketNumber, status, staffId = null) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      let query;
      let params;

      if (status === QUEUE_STATUS.IN_PROGRESS) {
        query = `UPDATE patients 
                 SET status = ?, served_by = ?, updated_at = NOW() 
                 WHERE ticket_number = ? AND status = 'waiting'`;
        params = [status, staffId, ticketNumber];
      } else if (status === QUEUE_STATUS.SERVED) {
        query = `UPDATE patients 
                 SET status = ?, served_at = NOW(), served_by = ?, updated_at = NOW() 
                 WHERE ticket_number = ? AND status = 'in-progress'`;
        params = [status, staffId, ticketNumber];
      } else {
        query = `UPDATE patients 
                 SET status = ?, updated_at = NOW() 
                 WHERE ticket_number = ?`;
        params = [status, ticketNumber];
      }

      const [result] = await connection.execute(query, params);

      if (result.affectedRows === 0) {
        throw new Error(`Cannot update status for ticket ${ticketNumber}`);
      }

      // If served, calculate actual wait time and log
      if (status === QUEUE_STATUS.SERVED) {
        const [patient] = await connection.execute(
          'SELECT created_at FROM patients WHERE ticket_number = ?',
          [ticketNumber]
        );

        const actualWait = calculateActualWaitTime(
          patient[0].created_at,
          new Date()
        );

        await connection.execute(
          `UPDATE patients 
           SET actual_wait_time = ? 
           WHERE ticket_number = ?`,
          [actualWait, ticketNumber]
        );

        // Log to queue_logs
        await connection.execute(
          `INSERT INTO queue_logs (ticket_number, checkin_time, served_time, total_wait_time)
           VALUES (?, ?, NOW(), ?)`,
          [ticketNumber, patient[0].created_at, actualWait]
        );

        log(`Patient ${ticketNumber} marked as served. Wait time: ${actualWait} minutes`);
      } else {
        log(`Patient ${ticketNumber} status updated to: ${status}`);
      }

      await connection.commit();

      return {
        success: true,
        ticketNumber,
        status,
        updatedAt: new Date()
      };

    } catch (error) {
      await connection.rollback();
      log(`Error updating patient status: ${error.message}`, 'error');
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all waiting patients
   */
  static async getWaitingPatients() {
    try {
      const [patients] = await db.execute(
        `SELECT 
          ticket_number,
          TIMESTAMPDIFF(MINUTE, created_at, NOW()) as wait_time,
          estimated_wait,
          created_at
         FROM patients 
         WHERE status = 'waiting'
         ORDER BY created_at ASC`
      );

      return patients;

    } catch (error) {
      log(`Error getting waiting patients: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Get patients currently being served
   */
  static async getActivePatients() {
    try {
      const [patients] = await db.execute(
        `SELECT 
          p.ticket_number,
          TIMESTAMPDIFF(MINUTE, p.created_at, NOW()) as total_wait,
          TIMESTAMPDIFF(MINUTE, p.updated_at, NOW()) as service_time,
          s.full_name as staff_name
         FROM patients p
         LEFT JOIN staff s ON p.served_by = s.id
         WHERE p.status = 'in-progress'
         ORDER BY p.updated_at ASC`
      );

      return patients;

    } catch (error) {
      log(`Error getting active patients: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats() {
    try {
      const [stats] = await db.execute(
        `SELECT 
          COUNT(*) as total_patients,
          SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting_count,
          SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as active_count,
          SUM(CASE WHEN status = 'served' THEN 1 ELSE 0 END) as served_count,
          AVG(CASE WHEN status = 'waiting' THEN estimated_wait END) as avg_estimated_wait,
          MIN(created_at) as oldest_waiting
         FROM patients`
      );

      return stats[0] || {
        total_patients: 0,
        waiting_count: 0,
        active_count: 0,
        served_count: 0,
        avg_estimated_wait: 0,
        oldest_waiting: null
      };

    } catch (error) {
      log(`Error getting queue stats: ${error.message}`, 'error');
      return {
        total_patients: 0,
        waiting_count: 0,
        active_count: 0,
        served_count: 0,
        avg_estimated_wait: 0,
        oldest_waiting: null
      };
    }
  }

  /**
   * Get patient position in queue
   */
  static async getPosition(ticketNumber) {
    try {
      const [position] = await db.execute(
        `SELECT COUNT(*) as position
         FROM patients 
         WHERE status = 'waiting' 
         AND created_at < (SELECT created_at FROM patients WHERE ticket_number = ?)`,
        [ticketNumber]
      );

      return position[0]?.position || 0;

    } catch (error) {
      log(`Error getting position for ${ticketNumber}: ${error.message}`, 'error');
      return 0;
    }
  }

  /**
   * Mark patient as no-show
   */
  static async markAsNoShow(ticketNumber) {
    try {
      const [result] = await db.execute(
        `UPDATE patients 
         SET status = 'no-show', updated_at = NOW() 
         WHERE ticket_number = ? AND status = 'waiting'`,
        [ticketNumber]
      );

      if (result.affectedRows > 0) {
        log(`Patient ${ticketNumber} marked as no-show`);
        return true;
      }

      return false;

    } catch (error) {
      log(`Error marking no-show: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Clean up old patients
   */
  static async cleanup() {
    try {
      // Archive served patients older than 24 hours
      const cutoff = new Date(Date.now() - (24 * 60 * 60 * 1000));

      const [result] = await db.execute(
        `DELETE FROM patients 
         WHERE (status = 'served' OR status = 'no-show') 
         AND created_at < ?`,
        [cutoff]
      );

      log(`Cleaned up ${result.affectedRows} old patient records`);
      return result.affectedRows;

    } catch (error) {
      log(`Error cleaning up patients: ${error.message}`, 'error');
      return 0;
    }
  }
}

module.exports = Patient;