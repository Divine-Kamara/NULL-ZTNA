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
