/**
 * Input validation utilities
 */

// Validate ticket number format
exports.isValidTicketNumber = (ticket) => {
  if (!ticket || typeof ticket !== 'string') return false;
  const pattern = /^[A-Z]+-\d+$/;
  return pattern.test(ticket);
};

// Validate staff PIN (4-6 digits)
exports.isValidStaffPIN = (pin) => {
  if (!pin || typeof pin !== 'string') return false;
  const pattern = /^\d{4,6}$/;
  return pattern.test(pin);
};

// Validate phone number (basic African format)
exports.isValidPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  // Accepts formats: +254..., 254..., 07..., 01...
  const pattern = /^(\+?(\d{1,3}))?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;
  return pattern.test(phone) && phone.length >= 9 && phone.length <= 15;
};

// Validate queue status
exports.isValidQueueStatus = (status) => {
  const validStatuses = ['waiting', 'in-progress', 'served', 'no-show'];
  return validStatuses.includes(status);
};

// Validate date range
exports.isValidDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end && start <= new Date();
};

// Sanitize input
exports.sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .substring(0, 255); // Limit length
};