-- ========================================
-- JWT Authentication Migration
-- ========================================

-- Add email and password_hash to admin table (if not exist)
ALTER TABLE admin ADD COLUMN IF NOT EXISTS email VARCHAR(100) UNIQUE;
ALTER TABLE admin ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE admin ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Update existing admin password to hash (placeholder - should be done manually)
UPDATE admin SET password_hash = password WHERE password_hash IS NULL;

-- Create rider_requests table for pending rider approvals
CREATE TABLE IF NOT EXISTS rider_requests (
    request_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    appointment_code VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    vehicle_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by INT,
    FOREIGN KEY (reviewed_by) REFERENCES admin(admin_id)
);

-- Update rider table to include email and password_hash
ALTER TABLE rider ADD COLUMN IF NOT EXISTS email VARCHAR(100) UNIQUE;
ALTER TABLE rider ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE rider ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE rider ADD COLUMN IF NOT EXISTS appointment_code VARCHAR(50);
ALTER TABLE rider ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Add created_at to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Create index for faster email lookups during login
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_admin_email ON admin(email);
CREATE INDEX IF NOT EXISTS idx_rider_email ON rider(email);
CREATE INDEX IF NOT EXISTS idx_rider_requests_email ON rider_requests(email);
