const db = require('../config/db');
const bcrypt = require('bcryptjs');
const bcryptConfig = require('../config/bcryptConfig');
const { log } = require('../utils/helpers');

class Staff {
  /**
   * Create new staff member
   */
  static async create(staffData) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(
        staffData.password, 
        bcryptConfig.saltRounds
      );
      
      const [result] = await db.execute(
        `INSERT INTO staff (
          username,
          password_hash,
          full_name,
          role,
          phone,
          email
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          staffData.username,
          hashedPassword,
          staffData.full_name,
          staffData.role || 'staff',
          staffData.phone || null,
          staffData.email || null
        ]
      );
      
      log(`Staff created: ${staffData.username} (${staffData.role})`);
      
      return {
        id: result.insertId,
        username: staffData.username,
        full_name: staffData.full_name,
        role: staffData.role
      };
      
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Username already exists');
      }
      log(`Error creating staff: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Find staff by username
   */
  static async findByUsername(username) {
    try {
      const [staff] = await db.execute(
        `SELECT 
          id,
          username,
          password_hash,
          full_name,
          role,
          phone,
          email,
          is_active,
          created_at
         FROM staff 
         WHERE username = ? AND is_active = 1`,
        [username]
      );
      
      return staff[0] || null;
      
    } catch (error) {
      log(`Error finding staff ${username}: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Find staff by ID
   */
  static async findById(id) {
    try {
      const [staff] = await db.execute(
        `SELECT 
          id,
          username,
          full_name,
          role,
          phone,
          email,
          is_active,
          created_at
         FROM staff 
         WHERE id = ?`,
        [id]
      );
      
      return staff[0] || null;
      
    } catch (error) {
      log(`Error finding staff ID ${id}: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Verify staff password
   */
  static async verifyPassword(staff, password) {
    try {
      return await bcrypt.compare(password, staff.password_hash);
    } catch (error) {
      log(`Error verifying password: ${error.message}`, 'error');
      return false;
    }
  }
  
  /**
   * Get all staff members
   */
  static async getAll(includeInactive = false) {
    try {
      let query = `SELECT 
        id,
        username,
        full_name,
        role,
        phone,
        email,
        is_active,
        created_at
       FROM staff`;
      
      if (!includeInactive) {
        query += ' WHERE is_active = 1';
      }
      
      query += ' ORDER BY role, full_name';
      
      const [staff] = await db.execute(query);
      return staff;
      
    } catch (error) {
      log(`Error getting all staff: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Update staff information
   */
  static async update(id, updates) {
    try {
      const allowedFields = ['full_name', 'phone', 'email', 'role', 'is_active'];
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
      
      updateValues.push(id);
      
      const [result] = await db.execute(
        `UPDATE staff 
         SET ${updateFields.join(', ')}, updated_at = NOW()
         WHERE id = ?`,
        updateValues
      );
      
      if (result.affectedRows > 0) {
        log(`Staff ${id} updated`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      log(`Error updating staff: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Update staff password
   */
  static async updatePassword(id, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(
        newPassword, 
        bcryptConfig.saltRounds
      );
      
      const [result] = await db.execute(
        'UPDATE staff SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, id]
      );
      
      if (result.affectedRows > 0) {
        log(`Password updated for staff ${id}`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      log(`Error updating password: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Delete staff (soft delete)
   */
  static async delete(id) {
    try {
      const [result] = await db.execute(
        'UPDATE staff SET is_active = 0, updated_at = NOW() WHERE id = ?',
        [id]
      );
      
      if (result.affectedRows > 0) {
        log(`Staff ${id} deactivated`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      log(`Error deleting staff: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Get staff performance statistics
   */
  static async getPerformanceStats(staffId = null, dateRange = null) {
    try {
      let query = `
        SELECT 
          s.id,
          s.full_name,
          s.role,
          COUNT(p.id) as patients_served,
          AVG(p.actual_wait_time) as avg_wait_time,
          AVG(TIMESTAMPDIFF(MINUTE, p.updated_at, p.served_at)) as avg_service_time,
          MIN(p.served_at) as first_service,
          MAX(p.served_at) as last_service
        FROM staff s
        LEFT JOIN patients p ON s.id = p.served_by
        WHERE p.status = 'served'
      `;
      
      const params = [];
      
      if (staffId) {
        query += ' AND s.id = ?';
        params.push(staffId);
      }
      
      if (dateRange) {
        query += ' AND DATE(p.served_at) BETWEEN ? AND ?';
        params.push(dateRange.start, dateRange.end);
      }
      
      query += ' GROUP BY s.id, s.full_name, s.role ORDER BY patients_served DESC';
      
      const [stats] = await db.execute(query, params);
      return stats;
      
    } catch (error) {
      log(`Error getting staff performance: ${error.message}`, 'error');
      return [];
    }
  }
  
  /**
   * Get staff activity (who is currently active)
   */
  static async getActiveStaff() {
    try {
      const [activeStaff] = await db.execute(
        `SELECT DISTINCT 
          s.id,
          s.full_name,
          s.role,
          MAX(p.updated_at) as last_activity
         FROM staff s
         JOIN patients p ON s.id = p.served_by
         WHERE p.status = 'in-progress'
         GROUP BY s.id, s.full_name, s.role
         ORDER BY last_activity DESC`
      );
      
      return activeStaff;
      
    } catch (error) {
      log(`Error getting active staff: ${error.message}`, 'error');
      return [];
    }
  }
}

module.exports = Staff;