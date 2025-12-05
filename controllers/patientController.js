const Patient = require('../models/Patient');
const ClinicSettings = require('../models/ClinicSettings');
const { generateTicketNumber, getNextTicketNumber } = require('../utils/ticketGenerator');
const { calculateEstimatedWait } = require('../utils/timeCalculator');
const notificationService = require('../utils/notification');
const { log } = require('../utils/helpers');
const { AppError, ValidationError } = require('../middleware/errorHandler');
const { QUEUE_STATUS } = require('../utils/constants');

class PatientController {
  /**
   * Join queue (create new patient)
   */
  async joinQueue(req, res, next) {
    try {
      const { phone } = req.body;
      
      // Check if clinic is open
      const isOpen = await ClinicSettings.isClinicOpen();
      if (!isOpen) {
        throw new AppError('Clinic is currently closed. Please visit during working hours.', 400);
      }
      
      // Get next ticket number for display
      const nextTicket = await getNextTicketNumber();
      
      // Check if max queue length reached
      const queueStats = await Patient.getQueueStats();
      if (queueStats.waiting_count >= 50) {
        throw new AppError('Queue is currently full. Please try again later.', 400);
      }
      
      res.render('patient/queue-join', {
        title: 'Join Queue',
        nextTicket,
        phone: phone || '',
        clinicOpen: isOpen
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Create new patient in queue
   */
  async createPatient(req, res, next) {
    try {
      const { phone } = req.body;
      
      // Validate phone if provided
      if (phone && phone.length > 0) {
        const phoneRegex = /^(\+?(\d{1,3}))?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;
        if (!phoneRegex.test(phone)) {
          throw new ValidationError('Invalid phone number format');
        }
      }
      
      // Check if clinic is open
      const isOpen = await ClinicSettings.isClinicOpen();
      if (!isOpen) {
        throw new AppError('Clinic is currently closed', 400);
      }
      
      // Create patient
      const patient = await Patient.create(phone);
      
      log(`New patient joined queue: ${patient.ticketNumber}`);
      
      // Redirect to ticket view
      res.redirect(`/patient/ticket/${patient.ticketNumber}`);
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * View ticket/queue status
   */
  async viewTicket(req, res, next) {
    try {
      const { ticketNumber } = req.params;
      
      if (!ticketNumber) {
        throw new ValidationError('Ticket number is required');
      }
      
      // Find patient
      const patient = await Patient.findByTicket(ticketNumber);
      
      if (!patient) {
        throw new AppError('Ticket not found', 404);
      }
      
      // Get position in queue
      const position = await Patient.getPosition(ticketNumber);
      
      // Format data for view
      const ticketData = {
        ticketNumber: patient.ticket_number,
        status: patient.status,
        patientsAhead: position,
        estimatedWait: patient.estimated_wait,
        waitTimeSoFar: patient.wait_time_so_far,
        createdAt: patient.created_at,
        servedAt: patient.served_at,
        phone: patient.phone,
        canRejoin: patient.status === 'no-show' || patient.status === 'served'
      };
      
      // If patient is waiting, send initial notification
      if (patient.status === QUEUE_STATUS.WAITING && position <= 3) {
        await notificationService.sendQueueNotification(
          ticketNumber,
          position,
          patient.phone
        );
      }
      
      res.render('patient/ticket-view', {
        title: `Ticket ${ticketNumber}`,
        ticket: ticketData,
        isActive: patient.status === 'waiting' || patient.status === 'in-progress'
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get live queue status (for public display)
   */
  async getQueueStatus(req, res, next) {
    try {
      const waitingPatients = await Patient.getWaitingPatients();
      const activePatients = await Patient.getActivePatients();
      const queueStats = await Patient.getQueueStats();
      const clinicSettings = await ClinicSettings.get();
      
      res.render('patient/queue-status', {
        title: 'Live Queue Status',
        waitingPatients,
        activePatients,
        queueStats,
        clinicName: clinicSettings.clinic_name,
        operatingHours: await ClinicSettings.getOperatingHours()
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Rejoin queue (for no-shows or served patients)
   */
  async rejoinQueue(req, res, next) {
    try {
      const { ticketNumber } = req.params;
      
      if (!ticketNumber) {
        throw new ValidationError('Ticket number is required');
      }
      
      // Check if patient exists and can rejoin
      const patient = await Patient.findByTicket(ticketNumber);
      
      if (!patient) {
        throw new AppError('Ticket not found', 404);
      }
      
      if (patient.status !== 'no-show' && patient.status !== 'served') {
        throw new AppError('Cannot rejoin with current ticket status', 400);
      }
      
      // Check if clinic is open
      const isOpen = await ClinicSettings.isClinicOpen();
      if (!isOpen) {
        throw new AppError('Clinic is currently closed', 400);
      }
      
      // Create new patient with same phone if exists
      const newPatient = await Patient.create(patient.phone);
      
      log(`Patient rejoined queue: ${ticketNumber} -> ${newPatient.ticketNumber}`);
      
      res.redirect(`/patient/ticket/${newPatient.ticketNumber}`);
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Check queue position (API endpoint)
   */
  async checkPosition(req, res, next) {
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
      
      // Send notification if position is 3 or less
      if (patient.status === QUEUE_STATUS.WAITING && position <= 3) {
        await notificationService.sendQueueNotification(
          ticketNumber,
          position,
          patient.phone
        );
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
   * Mark patient as no-show (staff only via API)
   */
  async markNoShow(req, res, next) {
    try {
      const { ticketNumber } = req.params;
      
      if (!ticketNumber) {
        throw new ValidationError('Ticket number is required');
      }
      
      const success = await Patient.markAsNoShow(ticketNumber);
      
      if (!success) {
        throw new AppError('Cannot mark patient as no-show', 400);
      }
      
      log(`Patient marked as no-show: ${ticketNumber} by staff ${req.user.id}`);
      
      res.status(200).json({
        success: true,
        message: `Patient ${ticketNumber} marked as no-show`
      });
      
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PatientController();