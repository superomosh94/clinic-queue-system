const Patient = require('../models/Patient');
const Staff = require('../models/Staff');
const ClinicSettings = require('../models/ClinicSettings');
const SSEMiddleware = require('../middleware/sseMiddleware');
const { log } = require('../utils/helpers');
const { AppError, ValidationError } = require('../middleware/errorHandler');
const { QUEUE_STATUS } = require('../utils/constants');

class StaffController {
  /**
   * Staff dashboard
   */
  async dashboard(req, res, next) {
    try {
      const waitingPatients = await Patient.getWaitingPatients();
      const activePatients = await Patient.getActivePatients();
      const queueStats = await Patient.getQueueStats();
      const activeStaff = await Staff.getActiveStaff();
      const clinicSettings = await ClinicSettings.get();

      res.render('staff/dashboard', {
        title: 'Staff Dashboard',
        user: req.user,
        waitingPatients,
        activePatients,
        queueStats,
        activeStaff,
        clinicSettings,
        QUEUE_STATUS
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Queue List View
   */
  async queueList(req, res, next) {
    try {
      res.render('staff/queue', {
        title: 'Queue List',
        user: req.user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * History View
   */
  async history(req, res, next) {
    try {
      res.render('staff/history', {
        title: 'Patient History',
        user: req.user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Call next patient
   */
  async callNextPatient(req, res, next) {
    try {
      const staffId = req.user.id;

      // Get next waiting patient
      const waitingPatients = await Patient.getWaitingPatients();

      if (waitingPatients.length === 0) {
        throw new AppError('No patients waiting in queue', 404);
      }

      const nextPatient = waitingPatients[0];

      // Update patient status to in-progress
      const result = await Patient.updateStatus(
        nextPatient.ticket_number,
        QUEUE_STATUS.IN_PROGRESS,
        staffId
      );

      // Broadcast queue update to all connected clients
      SSEMiddleware.broadcast('queue-update', {
        action: 'patient-called',
        ticketNumber: nextPatient.ticket_number,
        staffId: staffId,
        timestamp: new Date()
      });

      log(`Staff ${staffId} called next patient: ${nextPatient.ticket_number}`);

      res.status(200).json({
        success: true,
        message: `Patient ${nextPatient.ticket_number} called`,
        patient: nextPatient,
        result
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Update patient status
   */
  async updatePatientStatus(req, res, next) {
    try {
      const { ticketNumber, status } = req.body;
      const staffId = req.user.id;

      if (!ticketNumber || !status) {
        throw new ValidationError('Ticket number and status are required');
      }

      if (![QUEUE_STATUS.IN_PROGRESS, QUEUE_STATUS.SERVED, 'no-show'].includes(status)) {
        throw new ValidationError('Invalid status value');
      }

      // Update patient status
      const result = await Patient.updateStatus(ticketNumber, status, staffId);

      // Broadcast update based on status
      const broadcastEvent = status === QUEUE_STATUS.SERVED ? 'patient-served' : 'patient-updated';
      SSEMiddleware.broadcast(broadcastEvent, {
        ticketNumber,
        status,
        staffId,
        timestamp: new Date()
      });

      log(`Patient ${ticketNumber} status updated to ${status} by staff ${staffId}`);

      res.status(200).json({
        success: true,
        message: `Patient ${ticketNumber} status updated to ${status}`,
        result
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get patient details
   */
  async getPatientDetails(req, res, next) {
    try {
      const { ticketNumber } = req.params;

      if (!ticketNumber) {
        throw new ValidationError('Ticket number is required');
      }

      const patient = await Patient.findByTicket(ticketNumber);

      if (!patient) {
        throw new AppError('Patient not found', 404);
      }

      res.status(200).json({
        success: true,
        patient
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Search patients
   */
  async searchPatients(req, res, next) {
    try {
      const { query } = req.query;

      if (!query || query.length < 3) {
        throw new ValidationError('Search query must be at least 3 characters');
      }

      // For hackathon demo, simple search by ticket number
      const patient = await Patient.findByTicket(query);

      const results = patient ? [patient] : [];

      res.status(200).json({
        success: true,
        results,
        count: results.length
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get staff performance
   */
  async getStaffPerformance(req, res, next) {
    try {
      const staffId = req.user.id;
      const { startDate, endDate } = req.query;

      const dateRange = startDate && endDate ? { start: startDate, end: endDate } : null;
      const performance = await Staff.getPerformanceStats(staffId, dateRange);

      res.status(200).json({
        success: true,
        performance: performance[0] || {},
        dateRange
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Today's summary for staff
   */
  async getTodaySummary(req, res, next) {
    try {
      const staffId = req.user.id;

      // Get today's served patients by this staff
      const today = new Date().toISOString().split('T')[0];
      const performance = await Staff.getPerformanceStats(staffId, { start: today, end: today });

      // Get current queue stats
      const queueStats = await Patient.getQueueStats();

      // Get clinic settings
      const clinicSettings = await ClinicSettings.get();

      res.status(200).json({
        success: true,
        summary: {
          personal: performance[0] || {
            patients_served: 0,
            avg_wait_time: 0,
            avg_service_time: 0
          },
          queue: queueStats,
          clinic: {
            name: clinicSettings.clinic_name,
            isOpen: await ClinicSettings.isClinicOpen()
          },
          timestamp: new Date()
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * SSE endpoint for real-time updates
   */
  async queueSSE(req, res, next) {
    try {
      const clientId = SSEMiddleware.initialize(req, res);

      // Send initial queue state
      const waitingPatients = await Patient.getWaitingPatients();
      const activePatients = await Patient.getActivePatients();

      const initialData = {
        event: 'initial-state',
        data: {
          waitingPatients,
          activePatients,
          clientId,
          timestamp: new Date()
        }
      };

      res.write(`event: ${initialData.event}\n`);
      res.write(`data: ${JSON.stringify(initialData.data)}\n\n`);

      // Keep connection alive
      req.on('close', () => {
        log(`SSE connection closed for client ${clientId}`);
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Pause/resume receiving patients
   */
  async toggleAvailability(req, res, next) {
    try {
      const { isAvailable } = req.body;

      // In a real system, you would update staff availability status
      // For hackathon demo, we'll just log the action

      log(`Staff ${req.user.id} availability changed to: ${isAvailable ? 'available' : 'unavailable'}`);

      res.status(200).json({
        success: true,
        message: `You are now ${isAvailable ? 'available' : 'unavailable'} to receive patients`,
        isAvailable
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StaffController();