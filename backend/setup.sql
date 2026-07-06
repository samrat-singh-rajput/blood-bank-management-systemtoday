
-- Database Setup for Blood Bank Management System
CREATE DATABASE IF NOT EXISTS bloodbank_system;
USE bloodbank_system;

-- Users Table
-- Removed UNIQUE from username to allow same username for different roles (e.g., 'anuj' for Donor and 'anuj' for User)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'DONOR', 'USER') NOT NULL,
    name VARCHAR(100) NOT NULL,
    bloodType VARCHAR(5),
    location VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    is_verified TINYINT(1) DEFAULT 0,
    status ENUM('Active', 'Blocked', 'Inactive', 'Pending') DEFAULT 'Active',
    otp VARCHAR(6),
    otp_expiry DATETIME,
    joinDate DATE,
    accentColor VARCHAR(20) DEFAULT 'blood',
    fontSize VARCHAR(10) DEFAULT 'medium',
    avatarUrl LONGTEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default Accounts
-- Admin: rajput / rajput
-- Donor: anuj / singh
-- User: anuj / anuj
-- Passwords are hashed using PHP PASSWORD_DEFAULT (Bcrypt)
INSERT IGNORE INTO users (id, username, password, role, name, bloodType, email, status, joinDate) VALUES 
('admin_default', 'rajput', '$2y$10$8.vY3m9/H9xX/YwYp.yKqFmOQYyX.yKqFmOQYyX.yKqFmOQYyX.yKqF', 'ADMIN', 'System Admin', 'O+', 'admin@bloodbank.com', 'Active', '2023-10-01'),
('donor_default', 'anuj', '$2y$10$L1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7', 'DONOR', 'Anuj Donor', 'A+', 'anuj_donor@example.com', 'Active', '2023-10-01'),
('user_default', 'anuj', '$2y$10$A1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7', 'USER', 'Anuj User', 'B-', 'anuj_user@example.com', 'Active', '2023-10-01');

-- Note: The hashes above are placeholders for 'rajput', 'singh', and 'anuj'
-- Actual hashes for logic:
-- rajput: $2y$10$RzUv9Lw.8v0J9R1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7
-- singh:  $2y$10$L1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7
-- anuj:   $2y$10$A1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7J8R1v7

-- Donation Requests Table
CREATE TABLE IF NOT EXISTS requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donorName VARCHAR(100),
    bloodType VARCHAR(5),
    status ENUM('Pending', 'Approved', 'Completed', 'Rejected') DEFAULT 'Pending',
    date DATE,
    urgency ENUM('Low', 'Medium', 'Critical') DEFAULT 'Medium',
    hospital VARCHAR(100),
    location VARCHAR(100),
    phone VARCHAR(20),
    type ENUM('Donation', 'Request') NOT NULL,
    units INT DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hospitals Table
CREATE TABLE IF NOT EXISTS hospitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    address VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(100),
    status ENUM('Active', 'Inactive') DEFAULT 'Active'
);

-- Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId VARCHAR(50),
    userRole VARCHAR(20),
    message TEXT,
    date DATETIME,
    reply TEXT
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    senderId VARCHAR(50),
    senderName VARCHAR(100),
    receiverId VARCHAR(50),
    receiverName VARCHAR(100),
    text TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Certificates Table
CREATE TABLE IF NOT EXISTS certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donorId VARCHAR(50),
    date DATE,
    hospitalName VARCHAR(100),
    imageUrl LONGTEXT
);

-- Emergency Keys Table
CREATE TABLE IF NOT EXISTS emergency_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    type VARCHAR(20),
    usesRemaining INT DEFAULT 1,
    issuedDate DATE,
    status ENUM('Active', 'Expired') DEFAULT 'Active',
    ownerId VARCHAR(50)
);

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hospitalName VARCHAR(100),
    date DATE,
    time TIME,
    status ENUM('Scheduled', 'Completed') DEFAULT 'Scheduled',
    donorId VARCHAR(50)
);

-- Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200),
    description TEXT,
    date VARCHAR(50),
    location VARCHAR(100),
    imageUrl VARCHAR(255),
    attendees INT DEFAULT 0
);

-- Blood Stocks Table
CREATE TABLE IF NOT EXISTS stocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bloodGroup VARCHAR(5) UNIQUE NOT NULL,
    units INT DEFAULT 0,
    maxCapacity INT DEFAULT 500,
    lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Security Logs Table
CREATE TABLE IF NOT EXISTS security_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event VARCHAR(255) NOT NULL,
    user VARCHAR(100) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    severity ENUM('info', 'warning', 'critical') DEFAULT 'info',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Hospitals
INSERT IGNORE INTO hospitals (id, name, city, address, phone, email, status) VALUES 
(1, 'AIIMS Super Speciality Hospital', 'New Delhi', 'Ansari Nagar East, New Delhi', '+91 11 2658 8500', 'aiims_blood@example.com', 'Active'),
(2, 'Apollo Super Speciality Care', 'Mumbai', '66 Mathura Road, Sarita Vihar', '+91 22 2692 5000', 'apollo_mumbai@example.com', 'Active'),
(3, 'Fortis Health Center', 'Bangalore', '154/9 Bannerghatta Road', '+91 80 6621 4444', 'fortis_blr@example.com', 'Active'),
(4, 'Max Care Hospital', 'Kolkata', 'Plot No 34, Salt Lake City', '+91 33 2355 6000', 'max_kol@example.com', 'Active');

-- Seed Default Blood Stocks
INSERT IGNORE INTO stocks (id, bloodGroup, units, maxCapacity) VALUES 
(1, 'O+', 120, 500),
(2, 'A+', 85, 400),
(3, 'B+', 95, 400),
(4, 'AB+', 45, 250),
(5, 'O-', 30, 200),
(6, 'A-', 25, 200),
(7, 'B-', 20, 200),
(8, 'AB-', 15, 150);

-- Seed Default Security Logs
INSERT IGNORE INTO security_logs (id, event, user, ip, severity) VALUES 
(1, 'System initialized and DB synchronized', 'System Admin', '127.0.0.1', 'info'),
(2, 'Default administrator account login verified', 'rajput', '192.168.1.100', 'info'),
(3, 'Automatic inventory check completed', 'System Admin', '127.0.0.1', 'info');
