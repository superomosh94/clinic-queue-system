-- =============================================
-- DATABASE: clinic_queue
-- DESCRIPTION: Clinic Queue Management System
-- HACKATHON: Smart Digital Solution for Africa
-- =============================================

-- Drop existing database and create fresh
DROP DATABASE IF EXISTS clinic_queue;
CREATE DATABASE clinic_queue;
USE clinic_queue;

-- =============================================
-- TABLE: token_blacklist
-- For JWT token invalidation (logout functionality)
-- =============================================
CREATE TABLE token_blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(500) NOT NULL UNIQUE,
    blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_blacklisted_at (blacklisted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLE: patients
-- =============================================
CREATE TABLE patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  phone VARCHAR(20) NULL,
  estimated_wait INT DEFAULT 15,
  actual_wait_time INT NULL,
  status ENUM('waiting', 'in-progress', 'served', 'no-show') DEFAULT 'waiting',
  served_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  served_at TIMESTAMP NULL,
  
  INDEX idx_status (status),
  INDEX idx_ticket (ticket_number)
);

-- =============================================
-- TABLE: staff
-- =============================================
CREATE TABLE staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role ENUM('staff', 'admin') DEFAULT 'staff',
  phone VARCHAR(20) NULL,
  email VARCHAR(100) NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_username (username)
);

-- =============================================
-- TABLE: clinic_settings
-- =============================================
CREATE TABLE clinic_settings (
  id INT PRIMARY KEY DEFAULT 1,
  clinic_name VARCHAR(100) DEFAULT 'Community Health Clinic',
  current_queue_number INT DEFAULT 100,
  avg_service_time INT DEFAULT 15,
  opening_time TIME DEFAULT '08:00:00',
  closing_time TIME DEFAULT '17:00:00',
  contact_phone VARCHAR(20) NULL,
  contact_email VARCHAR(100) NULL,
  address TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE: queue_logs
-- =============================================
CREATE TABLE queue_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_number VARCHAR(20) NOT NULL,
  checkin_time TIMESTAMP NOT NULL,
  served_time TIMESTAMP NOT NULL,
  total_wait_time INT NOT NULL,
  served_by INT NULL
);

-- =============================================
-- SEED DATA: Clinic settings
-- =============================================
INSERT INTO clinic_settings (
  clinic_name,
  current_queue_number,
  avg_service_time,
  opening_time,
  closing_time,
  contact_phone,
  contact_email,
  address
) VALUES (
  'Community Health Clinic Nairobi',
  110,
  15,
  '08:00:00',
  '17:00:00',
  '+254 700 123 456',
  'info@clinic-nairobi.co.ke',
  'Moi Avenue, Nairobi, Kenya'
);

-- =============================================
-- SEED DATA: Staff members
-- Password hash for: 'password123'
-- =============================================
INSERT INTO staff (
  username,
  password_hash,
  full_name,
  role,
  phone,
  email
) VALUES 
(
  'admin',
  '$2a$12$eCldWEHrL1lMovfvuhIntOUVjs12l8ZV9VCYEODQLT5SJ6JU1a7Xu',
  'Dr. Amina Mohamed',
  'admin',
  '+254 711 234 567',
  'admin@clinic-nairobi.co.ke'
),
(
  'nurse_jane',
  '$2a$12$eCldWEHrL1lMovfvuhIntOUVjs12l8ZV9VCYEODQLT5SJ6JU1a7Xu',
  'Jane Wanjiku',
  'staff',
  '+254 722 345 678',
  'jane@clinic-nairobi.co.ke'
),
(
  'doc_peter',
  '$2a$12$eCldWEHrL1lMovfvuhIntOUVjs12l8ZV9VCYEODQLT5SJ6JU1a7Xu',
  'Dr. Peter Otieno',
  'staff',
  '+254 733 456 789',
  'peter@clinic-nairobi.co.ke'
),
(
  'reception_mary',
  '$2a$12$eCldWEHrL1lMovfvuhIntOUVjs12l8ZV9VCYEODQLT5SJ6JU1a7Xu',
  'Mary Akinyi',
  'staff',
  '+254 744 567 890',
  'mary@clinic-nairobi.co.ke'
);

-- =============================================
-- SEED DATA: Sample patients
-- =============================================
INSERT INTO patients (
  ticket_number,
  phone,
  estimated_wait,
  actual_wait_time,
  status,
  served_by
) VALUES 
('CLINIC-101', '+254 700 111 111', 15, 12, 'served', 2),
('CLINIC-102', '+254 700 222 222', 30, 28, 'served', 3),
('CLINIC-103', '+254 700 333 333', 45, 42, 'served', 2),
('CLINIC-104', '+254 700 444 444', 60, NULL, 'in-progress', 3),
('CLINIC-105', '+254 700 555 555', 45, NULL, 'waiting', NULL),
('CLINIC-106', '+254 700 666 666', 30, NULL, 'waiting', NULL),
('CLINIC-107', '+254 700 777 777', 15, NULL, 'waiting', NULL),
('CLINIC-108', NULL, 5, NULL, 'waiting', NULL),
('CLINIC-109', '+254 700 888 888', 0, NULL, 'waiting', NULL);

-- Update timestamps
UPDATE patients SET served_at = DATE_SUB(NOW(), INTERVAL 120 MINUTE) WHERE ticket_number = 'CLINIC-101';
UPDATE patients SET served_at = DATE_SUB(NOW(), INTERVAL 90 MINUTE) WHERE ticket_number = 'CLINIC-102';
UPDATE patients SET served_at = DATE_SUB(NOW(), INTERVAL 60 MINUTE) WHERE ticket_number = 'CLINIC-103';

UPDATE patients SET created_at = DATE_SUB(NOW(), INTERVAL 180 MINUTE) WHERE ticket_number = 'CLINIC-101';
UPDATE patients SET created_at = DATE_SUB(NOW(), INTERVAL 150 MINUTE) WHERE ticket_number = 'CLINIC-102';
UPDATE patients SET created_at = DATE_SUB(NOW(), INTERVAL 120 MINUTE) WHERE ticket_number = 'CLINIC-103';
UPDATE patients SET created_at = DATE_SUB(NOW(), INTERVAL 90 MINUTE) WHERE ticket_number = 'CLINIC-104';
UPDATE patients SET created_at = DATE_SUB(NOW(), INTERVAL 60 MINUTE) WHERE ticket_number = 'CLINIC-105';
UPDATE patients SET created_at = DATE_SUB(NOW(), INTERVAL 45 MINUTE) WHERE ticket_number = 'CLINIC-106';
UPDATE patients SET created_at = DATE_SUB(NOW(), INTERVAL 30 MINUTE) WHERE ticket_number = 'CLINIC-107';
UPDATE patients SET created_at = DATE_SUB(NOW(), INTERVAL 15 MINUTE) WHERE ticket_number = 'CLINIC-108';
UPDATE patients SET created_at = DATE_SUB(NOW(), INTERVAL 5 MINUTE) WHERE ticket_number = 'CLINIC-109';

-- =============================================
-- SEED DATA: Queue logs
-- =============================================
INSERT INTO queue_logs (
  ticket_number,
  checkin_time,
  served_time,
  total_wait_time,
  served_by
) VALUES 
('CLINIC-91', DATE_SUB(NOW(), INTERVAL 27 HOUR), DATE_SUB(NOW(), INTERVAL 26 HOUR), 15, 2),
('CLINIC-92', DATE_SUB(NOW(), INTERVAL 28 HOUR), DATE_SUB(NOW(), INTERVAL 27 HOUR), 40, 3),
('CLINIC-93', DATE_SUB(NOW(), INTERVAL 29 HOUR), DATE_SUB(NOW(), INTERVAL 28 HOUR), 45, 2);

-- =============================================
-- FINAL MESSAGE
-- =============================================
SELECT 'DATABASE CREATED SUCCESSFULLY!' as message;
SELECT 'Clinic Queue System Ready' as system_name;
SELECT CONCAT('Created: ', NOW()) as timestamp;
SELECT 'Test Users (password: password123):' as users;
SELECT 'Admin: admin' as admin;
SELECT 'Staff: nurse_jane' as staff1;
SELECT 'Staff: doc_peter' as staff2;
SELECT 'Staff: reception_mary' as staff3;

SELECT 
  'Queue Status:' as status,
  (SELECT COUNT(*) FROM patients WHERE status = 'waiting') as waiting,
  (SELECT COUNT(*) FROM patients WHERE status = 'in-progress') as in_progress,
  (SELECT COUNT(*) FROM patients WHERE status = 'served') as served;

-- Show all tables created
SELECT 'Tables created:' as table_list;
SHOW TABLES;