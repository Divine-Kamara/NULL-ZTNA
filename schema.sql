-- NULL: ZTNA Platform PostgreSQL Database Schema
-- final-year cybersecurity project

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB NOT NULL
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    totp_secret VARCHAR(255) NULL,
    totp_enabled BOOLEAN DEFAULT FALSE,
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
    device_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    device_name VARCHAR(255) NULL,
    device_fingerprint VARCHAR(255) UNIQUE NOT NULL,
    trust_status VARCHAR(20) DEFAULT 'pending' CHECK (trust_status IN ('pending', 'trusted', 'revoked')),
    registration_date TIMESTAMP DEFAULT NOW()
);

-- Create policies table
CREATE TABLE IF NOT EXISTS policies (
    policy_id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    resource_name VARCHAR(255) NOT NULL,
    access_condition TEXT NOT NULL
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    login_time TIMESTAMP DEFAULT NOW(),
    expiry_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated'))
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    activity VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Seed Roles
INSERT INTO roles (role_name, permissions) VALUES 
('Administrator', '{"all": true}'),
('Employee', '{"read_resources": true}'),
('Guest', '{"read_guest_resources": true}')
ON CONFLICT (role_name) DO NOTHING;

-- Create student transcripts table
CREATE TABLE IF NOT EXISTS student_transcripts (
    transcript_id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    programme VARCHAR(255) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    courses JSONB NOT NULL,
    last_modified_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    last_modified_at TIMESTAMP DEFAULT NOW()
);

-- Seed student records
INSERT INTO student_transcripts (student_id, student_name, programme, academic_year, courses) VALUES
('STU2023001', 'Amara Diallo', 'BSc Computer Science', 'Year 2',
 '[{"code":"CSCI101","name":"Introduction to Programming","credits":3,"grade":"A"},{"code":"MATH101","name":"Calculus I","credits":3,"grade":"B"},{"code":"CSCI102","name":"Data Structures","credits":3,"grade":"A"},{"code":"ENGL101","name":"Communication Skills","credits":2,"grade":"B"}]'),
('STU2023002', 'Ngozi Okafor', 'BSc Cybersecurity', 'Year 2',
 '[{"code":"CSCI101","name":"Introduction to Programming","credits":3,"grade":"B"},{"code":"MATH101","name":"Calculus I","credits":3,"grade":"C"},{"code":"SECU101","name":"Network Security Fundamentals","credits":3,"grade":"A"},{"code":"ENGL101","name":"Communication Skills","credits":2,"grade":"A"}]'),
('STU2023003', 'Kwame Mensah', 'BSc Information Systems', 'Year 1',
 '[{"code":"CSCI101","name":"Introduction to Programming","credits":3,"grade":"C"},{"code":"MATH101","name":"Calculus I","credits":3,"grade":"B"},{"code":"ENGL101","name":"Communication Skills","credits":2,"grade":"B"}]')
ON CONFLICT (student_id) DO NOTHING;

