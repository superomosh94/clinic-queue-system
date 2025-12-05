const QueueLog = require('../models/QueueLog');
const Patient = require('../models/Patient');
const Staff = require('../models/Staff');
const ClinicSettings = require('../models/ClinicSettings');
const { getDatabaseStats } = require('../utils/database');
const notificationService = require('../utils/notification');
const { log } = require('../utils/helpers');
const { AppError, ValidationError } = require('../middleware/errorHandler');

class StatsController {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(req, res, next) {
    try {
      const dbStats = await getDatabaseStats();
      const queueStats = await Patient.getQueueStats();
      const clinicSettings = await ClinicSettings.get();
      const today = new Date().toISOString().split('T')[0];
      const dailyStats = await QueueLog.getDailyStats(today);
      const hourlyStats = await QueueLog.getHourlyStats(today);
      const staffPerformance = await Staff.getPerformanceStats();
      
      res.status(200).json({
        success: true,
        timestamp: new Date(),
        dashboard: {
          database: dbStats,
          queue: queueStats,
          clinic: {
            ...clinicSettings,
            isOpen: await ClinicSettings.isClinicOpen()
          },
          daily: dailyStats,
          hourly: hourlyStats,
          staff: staffPerformance,
          notifications: notificationService.getNotificationHistory(5)
        }
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get daily statistics
   */
  async getDailyStatistics(req, res, next) {
    try {
      const { date } = req.params;
      
      if (!date) {
        throw new ValidationError('Date is required (YYYY-MM-DD)');
      }
      
      const dailyStats = await QueueLog.getDailyStats(date);
      const hourlyStats = await QueueLog.getHourlyStats(date);
      const logs = await QueueLog.getByDate(date);
      
      res.status(200).json({
        success: true,
        date,
        statistics: dailyStats,
        hourlyBreakdown: hourlyStats,
        logs: logs.slice(0, 50), // Limit to 50 logs
        totalLogs: logs.length
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get date range statistics
   */
  async getDateRangeStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        throw new ValidationError('Start date and end date are required');
      }
      
      const logs = await QueueLog.getByDateRange(startDate, endDate);
      const staffPerformance = await QueueLog.getStaffPerformance(startDate, endDate);
      
      // Calculate summary statistics
      const totalPatients = logs.length;
      const totalWaitTime = logs.reduce((sum, log) => sum + (log.total_wait_time || 0), 0);
      const avgWaitTime = totalPatients > 0 ? Math.round(totalWaitTime / totalPatients) : 0;
      
      // Group by day
      const dailyStats = logs.reduce((acc, log) => {
        const date = log.served_time.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            count: 0,
            totalWait: 0
          };
        }
        acc[date].count++;
        acc[date].totalWait += log.total_wait_time || 0;
        return acc;
      }, {});
      
      const dailyArray = Object.values(dailyStats).map(day => ({
        ...day,
        avgWait: Math.round(day.totalWait / day.count)
      }));
      
      res.status(200).json({
        success: true,
        dateRange: { startDate, endDate },
        summary: {
          totalPatients,
          totalWaitTime,
          avgWaitTime,
          days: dailyArray.length
        },
        dailyBreakdown: dailyArray,
        staffPerformance,
        sampleLogs: logs.slice(0, 20) // First 20 logs as sample
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get staff performance statistics
   */
  async getStaffPerformanceStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      
      const dateRange = startDate && endDate ? { start: startDate, end: endDate } : null;
      const performance = await Staff.getPerformanceStats(null, dateRange);
      
      res.status(200).json({
        success: true,
        dateRange,
        staffCount: performance.length,
        performance,
        generatedAt: new Date()
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get queue analytics
   */
  async getQueueAnalytics(req, res, next) {
    try {
      const queueStats = await Patient.getQueueStats();
      const waitingPatients = await Patient.getWaitingPatients();
      const activePatients = await Patient.getActivePatients();
      const clinicSettings = await ClinicSettings.get();
      
      // Calculate wait time distribution
      const waitTimeDistribution = {
        under15: 0,
        under30: 0,
        under60: 0,
        over60: 0
      };
      
      for (const patient of waitingPatients) {
        const waitTime = patient.wait_time || 0;
        if (waitTime < 15) waitTimeDistribution.under15++;
        else if (waitTime < 30) waitTimeDistribution.under30++;
        else if (waitTime < 60) waitTimeDistribution.under60++;
        else waitTimeDistribution.over60++;
      }
      
      // Calculate service time efficiency
      const efficiency = clinicSettings.avg_service_time > 0 ? 
        Math.round((queueStats.served_count * clinicSettings.avg_service_time) / 
          (waitingPatients.length + queueStats.served_count) * 100) / 100 : 0;
      
      res.status(200).json({
        success: true,
        timestamp: new Date(),
        analytics: {
          currentQueue: {
            waiting: queueStats.waiting_count,
            active: queueStats.active_count,
            servedToday: queueStats.served_count,
            oldestWaiting: queueStats.oldest_waiting
          },
          waitTimeDistribution,
          efficiency: {
            score: efficiency,
            interpretation: efficiency > 1.2 ? 'High' : efficiency > 0.8 ? 'Normal' : 'Low'
          },
          clinic: {
            avgServiceTime: clinicSettings.avg_service_time,
            isOpen: await ClinicSettings.isClinicOpen(),
            operatingHours: await ClinicSettings.getOperatingHours()
          }
        }
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get real-time metrics
   */
  async getRealtimeMetrics(req, res, next) {
    try {
      const queueStats = await Patient.getQueueStats();
      const waitingPatients = await Patient.getWaitingPatients();
      const activePatients = await Patient.getActivePatients();
      const activeStaff = await Staff.getActiveStaff();
      const clinicSettings = await ClinicSettings.get();
      
      // Calculate current metrics
      const currentTime = new Date();
      const hour = currentTime.getHours();
      const isPeakHour = (hour >= 9 && hour <= 12) || (hour >= 14 && hour <= 16);
      
      const metrics = {
        timestamp: currentTime,
        queue: {
          waiting: queueStats.waiting_count,
          active: queueStats.active_count,
          estimatedWait: queueStats.waiting_count * clinicSettings.avg_service_time,
          trend: 'stable' // Could be calculated from historical data
        },
        staff: {
          active: activeStaff.length,
          total: (await Staff.getAll()).length,
          efficiency: activeStaff.length > 0 ? 
            Math.round(queueStats.served_count / activeStaff.length) : 0
        },
        clinic: {
          isOpen: await ClinicSettings.isClinicOpen(),
          isPeakHour,
          nextHourPrediction: isPeakHour ? 
            Math.round(queueStats.waiting_count * 1.2) : 
            Math.round(queueStats.waiting_count * 0.8)
        },
        notifications: {
          sentToday: notificationService.getNotificationHistory().length,
          lastSent: notificationService.getNotificationHistory(1)[0]?.timestamp || null
        }
      };
      
      res.status(200).json({
        success: true,
        metrics,
        lastUpdated: currentTime
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Export statistics
   */
  async exportStatistics(req, res, next) {
    try {
      const { format, type } = req.query;
      
      let data;
      let filename;
      
      switch (type) {
        case 'daily':
          const today = new Date().toISOString().split('T')[0];
          data = await QueueLog.getByDate(today);
          filename = `daily_stats_${today}`;
          break;
          
        case 'weekly':
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          data = await QueueLog.getByDateRange(
            weekAgo.toISOString().split('T')[0],
            new Date().toISOString().split('T')[0]
          );
          filename = `weekly_stats_${new Date().toISOString().split('T')[0]}`;
          break;
          
        case 'staff_performance':
          data = await Staff.getPerformanceStats();
          filename = `staff_performance_${new Date().toISOString().split('T')[0]}`;
          break;
          
        default:
          data = await QueueLog.getOverallStats();
          filename = `overall_stats_${new Date().toISOString().split('T')[0]}`;
      }
      
      if (format === 'csv') {
        // Convert to CSV
        const fields = Object.keys(data[0] || {});
        const csv = [
          fields.join(','),
          ...data.map(row => fields.map(field => `"${row[field] || ''}"`).join(','))
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        return res.send(csv);
      }
      
      // Default JSON response
      res.status(200).json({
        success: true,
        type,
        format: format || 'json',
        exportedAt: new Date(),
        data
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get notification statistics
   */
  async getNotificationStats(req, res, next) {
    try {
      const notifications = notificationService.getNotificationHistory();
      
      const stats = {
        total: notifications.length,
        sentToday: notifications.filter(n => 
          new Date(n.timestamp).toDateString() === new Date().toDateString()
        ).length,
        byType: notifications.reduce((acc, n) => {
          acc[n.status] = (acc[n.status] || 0) + 1;
          return acc;
        }, {}),
        recent: notifications.slice(0, 10)
      };
      
      res.status(200).json({
        success: true,
        stats,
        generatedAt: new Date()
      });
      
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StatsController();