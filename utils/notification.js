const { log } = require('./helpers');

/**
 * Mock SMS notification system
 * In production, integrate with Twilio, AfricasTalking, etc.
 */
class NotificationService {
  constructor() {
    this.notificationsSent = [];
  }

  /**
   * Send SMS notification (mock for hackathon)
   */
  async sendSMS(phoneNumber, message) {
    try {
      // Mock SMS sending
      const notification = {
        id: Date.now(),
        phone: phoneNumber,
        message: message,
        timestamp: new Date(),
        status: 'sent'
      };
      
      this.notificationsSent.push(notification);
      
      log(`SMS sent to ${phoneNumber}: ${message}`);
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        success: true,
        messageId: notification.id,
        timestamp: notification.timestamp
      };
      
    } catch (error) {
      log(`Failed to send SMS: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send queue notification to patient
   */
  async sendQueueNotification(ticketNumber, patientsAhead, phoneNumber = null) {
    let message;
    
    if (patientsAhead === 0) {
      message = `Your turn is now! Please proceed to the counter. Ticket: ${ticketNumber}`;
    } else if (patientsAhead === 1) {
      message = `You're next in line! Please get ready. Ticket: ${ticketNumber}`;
    } else if (patientsAhead <= 3) {
      message = `You're ${patientsAhead} patients away. Ticket: ${ticketNumber}`;
    } else {
      message = `Your estimated wait: ${patientsAhead * 15} minutes. Ticket: ${ticketNumber}`;
    }
    
    if (phoneNumber) {
      return await this.sendSMS(phoneNumber, message);
    }
    
    // Return message for in-app notification
    return {
      success: true,
      message: message,
      type: patientsAhead <= 2 ? 'urgent' : 'info'
    };
  }

  /**
   * Get notification history (for admin)
   */
  getNotificationHistory(limit = 50) {
    return this.notificationsSent
      .slice(-limit)
      .reverse();
  }

  /**
   * Clear old notifications
   */
  clearOldNotifications(hours = 24) {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    this.notificationsSent = this.notificationsSent.filter(
      n => new Date(n.timestamp) > cutoff
    );
  }
}

// Singleton instance
module.exports = new NotificationService();