const Staff = require('../models/Staff');
const Patient = require('../models/Patient');
const ClinicSettings = require('../models/ClinicSettings');
const QueueLog = require('../models/QueueLog');
const { initializeDatabase, getDatabaseStats } = require('../utils/database');
const notificationService = require('../utils/notification');
const { log } = require('../utils/helpers');
const { AppError, ValidationError } = require('../middleware/errorHandler');

class AdminController {
  /**
   * Admin dashboard
   */
  async dashboard(req, res, next) {
    try {
      console.log('Admin dashboard accessed by:', req.user?.username);
      
      // Initialize data structure that matches your EJS template
      const data = {
        pageTitle: 'Admin Dashboard',
        user: req.user,
        queueStats: {
          total_patients: 0,
          waiting_count: 0,
          active_count: 0,
          served_count: 0
        },
        staffPerformance: []
      };

      try {
        // Try to fetch real data from models
        // Get queue statistics
        const queueStatsResult = await Patient.getQueueStats();
        if (queueStatsResult) {
          data.queueStats = {
            total_patients: queueStatsResult.total_patients || 0,
            waiting_count: queueStatsResult.waiting_count || 0,
            active_count: queueStatsResult.in_progress_count || 0,
            served_count: queueStatsResult.served_today || 0
          };
        }

        // Get staff performance
        const staffPerformanceResult = await Staff.getPerformanceStats();
        if (staffPerformanceResult && staffPerformanceResult.length > 0) {
          data.staffPerformance = staffPerformanceResult.map(staff => ({
            full_name: staff.full_name || `${staff.first_name} ${staff.last_name}`,
            role: staff.role,
            patients_served: staff.patients_served || 0,
            avg_service_time: staff.avg_service_time || null
          }));
        }

      } catch (error) {
        console.log('Error fetching dashboard data, using fallback:', error.message);
        
        // Fallback data for development/demo
        data.queueStats = {
          total_patients: 125,
          waiting_count: 8,
          active_count: 3,
          served_count: 42
        };
        
        data.staffPerformance = [
          { 
            full_name: 'Dr. John Smith', 
            role: 'doctor', 
            patients_served: 28, 
            avg_service_time: 12 
          },
          { 
            full_name: 'Nurse Jane Doe', 
            role: 'nurse', 
            patients_served: 35, 
            avg_service_time: 8 
          },
          { 
            full_name: 'Receptionist Bob', 
            role: 'staff', 
            patients_served: 45, 
            avg_service_time: 5 
          }
        ];
      }

      // Log for debugging
      console.log('Rendering dashboard with data:', {
        queueStats: data.queueStats,
        staffCount: data.staffPerformance.length
      });

      // Render the template
      res.render('admin/dashboard', data);

    } catch (error) {
      console.error('Fatal error in dashboard:', error);
      next(error);
    }
  }

  /**
   * Settings page
   */
  async settingsPage(req, res, next) {
    try {
      const clinicSettings = await ClinicSettings.get();

      res.render('admin/settings', {
        title: 'Clinic Settings',
        user: req.user,
        clinicSettings
      });

    } catch (error) {
      next(error);
    }
  } 

  /**
   * Get reports page
   */
  async getReports(req, res, next) {
    try {
      // Default date range: last 7 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      // Get report data
      const reportData = await QueueLog.getByDateRange(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Get summary statistics
      const summaryStats = await QueueLog.getSummaryStats(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      res.render('admin/reports', {
        title: 'Reports & Analytics',
        user: req.user,
        reportData,
        summaryStats,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * System maintenance
   */
  async systemMaintenance(req, res, next) {
    try {
      const { action } = req.body;

      let result;

      switch (action) {
        case 'reset_queue':
          await ClinicSettings.resetQueueNumber(100);
          result = 'Queue number reset to 100';
          break;

        case 'cleanup_patients':
          const cleaned = await Patient.cleanup();
          result = `Cleaned up ${cleaned} old patient records`;
          break;

        case 'cleanup_logs':
          const logsCleaned = await QueueLog.cleanup(30); // Keep 30 days
          result = `Cleaned up ${logsCleaned} old queue logs`;
          break;

        case 'initialize_db':
          const initResult = await initializeDatabase();
          result = initResult.message;
          break;

        case 'clear_notifications':
          notificationService.clearOldNotifications();
          result = 'Old notifications cleared';
          break;

        default:
          throw new ValidationError('Invalid maintenance action');
      }

      log(`System maintenance action '${action}' performed by admin ${req.user.id}: ${result}`);

      res.status(200).json({
        success: true,
        action,
        result,
        timestamp: new Date()
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Staff management page
   */
  async staffManagement(req, res, next) {
    try {
      const staffList = await Staff.getAll(true); // Include inactive

      res.render('admin/staff-manage', {
        title: 'Staff Management',
        user: req.user,
        staffList
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new staff member
   */
  async createStaff(req, res, next) {
    try {
      const { username, password, full_name, role, phone, email } = req.body;

      // Validate required fields
      if (!username || !password || !full_name) {
        throw new ValidationError('Username, password, and full name are required');
      }

      if (password.length < 6) {
        throw new ValidationError('Password must be at least 6 characters long');
      }

      if (!['staff', 'admin'].includes(role)) {
        throw new ValidationError('Invalid role');
      }

      // Create staff
      const staffData = {
        username,
        password,
        full_name,
        role,
        phone: phone || null,
        email: email || null
      };

      const staff = await Staff.create(staffData);

      log(`New staff created by admin ${req.user.id}: ${username} (${role})`);

      res.status(201).json({
        success: true,
        message: 'Staff member created successfully',
        staff
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Update staff member
   */
  async updateStaff(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!id) {
        throw new ValidationError('Staff ID is required');
      }

      // Remove password from updates if present (use separate endpoint for password)
      delete updates.password;
      delete updates.password_hash;

      // Validate role if provided
      if (updates.role && !['staff', 'admin'].includes(updates.role)) {
        throw new ValidationError('Invalid role');
      }

      const success = await Staff.update(parseInt(id), updates);

      if (!success) {
        throw new AppError('Failed to update staff member', 400);
      }

      log(`Staff ${id} updated by admin ${req.user.id}`);

      res.status(200).json({
        success: true,
        message: 'Staff member updated successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete/Deactivate staff member
   */
  async deleteStaff(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ValidationError('Staff ID is required');
      }

      // Cannot delete self
      if (parseInt(id) === req.user.id) {
        throw new ValidationError('Cannot delete your own account');
      }

      const success = await Staff.delete(parseInt(id));

      if (!success) {
        throw new AppError('Failed to delete staff member', 400);
      }

      log(`Staff ${id} deactivated by admin ${req.user.id}`);

      res.status(200).json({
        success: true,
        message: 'Staff member deactivated successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Update clinic settings
   */
  async updateClinicSettings(req, res, next) {
    try {
      const updates = req.body;

      // Validate time formats if provided
      if (updates.opening_time && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(updates.opening_time)) {
        throw new ValidationError('Invalid opening time format (HH:MM:SS)');
      }

      if (updates.closing_time && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(updates.closing_time)) {
        throw new ValidationError('Invalid closing time format (HH:MM:SS)');
      }

      if (updates.avg_service_time && (updates.avg_service_time < 1 || updates.avg_service_time > 120)) {
        throw new ValidationError('Average service time must be between 1 and 120 minutes');
      }

      const success = await ClinicSettings.update(updates);

      if (!success) {
        throw new AppError('Failed to update clinic settings', 400);
      }

      log(`Clinic settings updated by admin ${req.user.id}`);

      res.status(200).json({
        success: true,
        message: 'Clinic settings updated successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Send broadcast message to waiting patients
   */
  async sendBroadcast(req, res, next) {
    try {
      const { message } = req.body;

      if (!message || message.trim().length === 0) {
        throw new ValidationError('Message is required');
      }

      if (message.length > 500) {
        throw new ValidationError('Message too long (max 500 characters)');
      }

      // Get all waiting patients
      const waitingPatients = await Patient.getWaitingPatients();

      // Send notification to each (mock for demo)
      let sentCount = 0;
      for (const patient of waitingPatients) {
        if (patient.phone) {
          await notificationService.sendSMS(
            patient.phone,
            `Clinic Announcement: ${message}`
          );
          sentCount++;
        }
      }

      log(`Broadcast sent by admin ${req.user.id}: ${message} (to ${sentCount} patients)`);

      res.status(200).json({
        success: true,
        message: `Broadcast sent to ${sentCount} patients`,
        sentCount,
        totalPatients: waitingPatients.length
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Export data
   */
  async exportData(req, res, next) {
    try {
      const { dataType, format } = req.query;

      // For hackathon demo, return JSON
      // In production, you would generate CSV/Excel files

      let exportData;

      switch (dataType) {
        case 'queue_logs':
          const logs = await QueueLog.getByDateRange(
            req.query.startDate || new Date().toISOString().split('T')[0],
            req.query.endDate || new Date().toISOString().split('T')[0]
          );
          exportData = logs;
          break;

        case 'patients_today':
          const patients = await Patient.getWaitingPatients();
          exportData = patients;
          break;

        case 'staff_list':
          const staff = await Staff.getAll(true);
          exportData = staff;
          break;

        default:
          throw new ValidationError('Invalid data type');
      }

      log(`Data exported by admin ${req.user.id}: ${dataType} (${format || 'json'})`);

      if (format === 'csv') {
        // Simple CSV conversion for demo
        const fields = Object.keys(exportData[0] || {});
        const csv = [
          fields.join(','),
          ...exportData.map(row => fields.map(field => `"${row[field] || ''}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${dataType}_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
      }

      // Default JSON response
      res.status(200).json({
        success: true,
        dataType,
        format: format || 'json',
        count: exportData.length,
        data: exportData,
        exportedAt: new Date()
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();