const Patient = require('../models/Patient');
const ClinicSettings = require('../models/ClinicSettings');
const { calculateEstimatedWait } = require('../utils/timeCalculator');
const { generateTicketNumber } = require('../utils/ticketGenerator');
const notificationService = require('../utils/notification');
const { log } = require('../utils/helpers');
const { AppError, ValidationError } = require('../middleware/errorHandler');
const { QUEUE_STATUS } = require('../utils/constants');

class QueueController {
  /**
   * Get current queue status (API)
   */
  async getQueueStatus(req, res, next) {
    try {
      const waitingPatients = await Patient.getWaitingPatients();
      const activePatients = await Patient.getActivePatients();
      const queueStats = await Patient.getQueueStats();
      const clinicSettings = await ClinicSettings.get();
      
      res.status(200).json({
        success: true,
        queue: {
          waiting: waitingPatients,
          active: activePatients,
          stats: queueStats
        },
        clinic: {
          name: clinicSettings.clinic_name,
          isOpen: await ClinicSettings.isClinicOpen(),
          operatingHours: await ClinicSettings.getOperatingHours()
        },
        timestamp: new Date()
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Join queue (API endpoint)
   */
  async joinQueueAPI(req, res, next) {
    try {
      const { phone } = req.body;
      
      // Check if clinic is open
      const isOpen = await ClinicSettings.isClinicOpen();
      if (!isOpen) {
        throw new AppError('Clinic is currently closed', 400);
      }
      
      // Check max queue length
      const queueStats = await Patient.getQueueStats();
      if (queueStats.waiting_count >= 50) {
        throw new AppError('Queue is currently full. Please try again later.', 400);
      }
      
      // Create patient
      const patient = await Patient.create(phone);
      
      log(`New patient joined via API: ${patient.ticketNumber}`);
      
      res.status(201).json({
        success: true,
        message: 'Successfully joined the queue',
        ticket: {
          number: patient.ticketNumber,
          estimatedWait: patient.estimatedWait.estimatedMinutes,
          estimatedDisplay: patient.estimatedWait.estimatedDisplay,
          patientsAhead: patient.estimatedWait.patientsAhead
        },
        joinTime: new Date()
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get patient position (API)
   */
  async getPatientPosition(req, res, next) {
    try {
      const { ticketNumber } = req.params;
      
      if (!ticketNumber) {
        throw new ValidationError('Ticket number is required');
      }
      
      const patient = await Patient.findByTicket(ticketNumber);
      
      if (!patient) {
        throw new AppError('Ticket not found', 404);
      }
      
      const position = await Patient.getPosition(ticketNumber);
      const estimatedWait = await calculateEstimatedWait(ticketNumber);
      
      // Auto-notify if position is 3 or less
      if (patient.status === QUEUE_STATUS.WAITING && position <= 3) {
        const notification = await notificationService.sendQueueNotification(
          ticketNumber,
          position,
          patient.phone
        );
        
        patient.notification = notification;
      }
      
      res.status(200).json({
        success: true,
        ticketNumber,
        status: patient.status,
        patientsAhead: position,
        estimatedWait: estimatedWait.estimatedMinutes,
        estimatedDisplay: estimatedWait.estimatedDisplay,
        waitTimeSoFar: patient.wait_time_so_far,
        lastUpdated: new Date()
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get estimated wait time (API)
   */
  async getEstimatedWait(req, res, next) {
    try {
      const { ticketNumber } = req.params;
      
      if (!ticketNumber) {
        // Get general wait time based on queue length
        const queueStats = await Patient.getQueueStats();
        const clinicSettings = await ClinicSettings.get();
        
        const estimatedWait = queueStats.waiting_count * clinicSettings.avg_service_time;
        
        return res.status(200).json({
          success: true,
          type: 'general',
          waitingCount: queueStats.waiting_count,
          estimatedWait,
          estimatedDisplay: estimatedWait < 60 ? 
            `${estimatedWait} minutes` : 
            `${Math.floor(estimatedWait / 60)}h ${estimatedWait % 60}m`
        });
      }
      
      // Get specific patient wait time
      const estimatedWait = await calculateEstimatedWait(ticketNumber);
      
      res.status(200).json({
        success: true,
        type: 'specific',
        ticketNumber,
        ...estimatedWait
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Call next patient (API - staff only)
   */
  async callNextPatientAPI(req, res, next) {
    try {
      const staffId = req.user.id;
      
      // Get next waiting patient
      const waitingPatients = await Patient.getWaitingPatients();
      
      if (waitingPatients.length === 0) {
        throw new AppError('No patients waiting in queue', 404);
      }
      
      const nextPatient = waitingPatients[0];
      
      // Update patient status
      const result = await Patient.updateStatus(
        nextPatient.ticket_number,
        QUEUE_STATUS.IN_PROGRESS,
        staffId
      );
      
      log(`Patient called via API: ${nextPatient.ticket_number} by staff ${staffId}`);
      
      res.status(200).json({
        success: true,
        message: `Patient ${nextPatient.ticket_number} called`,
        patient: nextPatient,
        calledBy: req.user.fullName,
        calledAt: new Date()
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Complete patient service (API - staff only)
   */
  async completePatientAPI(req, res, next) {
    try {
      const { ticketNumber } = req.params;
      const staffId = req.user.id;
      
      if (!ticketNumber) {
        throw new ValidationError('Ticket number is required');
      }
      
      // Update patient status to served
      const result = await Patient.updateStatus(
        ticketNumber,
        QUEUE_STATUS.SERVED,
        staffId
      );
      
      log(`Patient completed via API: ${ticketNumber} by staff ${staffId}`);
      
      res.status(200).json({
        success: true,
        message: `Patient ${ticketNumber} marked as served`,
        result,
        completedAt: new Date()
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get queue statistics (API)
   */
  async getQueueStatsAPI(req, res, next) {
    try {
      const queueStats = await Patient.getQueueStats();
      const clinicSettings = await ClinicSettings.get();
      
      res.status(200).json({
        success: true,
        stats: queueStats,
        clinic: {
          name: clinicSettings.clinic_name,
          avgServiceTime: clinicSettings.avg_service_time,
          isOpen: await ClinicSettings.isClinicOpen()
        },
        timestamp: new Date()
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Mark patient as no-show (API - staff only)
   */
  async markNoShowAPI(req, res, next) {
    try {
      const { ticketNumber } = req.params;
      
      if (!ticketNumber) {
        throw new ValidationError('Ticket number is required');
      }
      
      const success = await Patient.markAsNoShow(ticketNumber);
      
      if (!success) {
        throw new AppError('Cannot mark patient as no-show', 400);
      }
      
      log(`Patient marked as no-show via API: ${ticketNumber}`);
      
      res.status(200).json({
        success: true,
        message: `Patient ${ticketNumber} marked as no-show`
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get active patients (API)
   */
  async getActivePatientsAPI(req, res, next) {
    try {
      const activePatients = await Patient.getActivePatients();
      
      res.status(200).json({
        success: true,
        count: activePatients.length,
        patients: activePatients,
        timestamp: new Date()
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get waiting patients (API)
   */
  async getWaitingPatientsAPI(req, res, next) {
    try {
      const waitingPatients = await Patient.getWaitingPatients();
      
      res.status(200).json({
        success: true,
        count: waitingPatients.length,
        patients: waitingPatients,
        timestamp: new Date()
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Clean up old patients (API - admin only)
   */
  async cleanupQueue(req, res, next) {
    try {
      const cleanedCount = await Patient.cleanup();
      
      res.status(200).json({
        success: true,
        message: `Cleaned up ${cleanedCount} old patient records`,
        cleanedCount,
        timestamp: new Date()
      });
      
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new QueueController();