-- Fix schema to match backend expectations

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Add missing column to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted'));

-- Add org_id column that backend expects (rename organization_id)
ALTER TABLE users RENAME COLUMN organization_id TO org_id;

-- Update all users to be active
UPDATE users SET status = 'active';
UPDATE organizations SET status = 'active';

-- Verify the schema matches backend expectations
SELECT 
    u.id, u.org_id, u.email, u.first_name, u.last_name, 
    u.role, u.status, u.mfa_enabled, u.failed_login_attempts,
    o.name as org_name, o.type as org_type, o.status as org_status
FROM users u
JOIN organizations o ON u.org_id = o.id
WHERE u.email = 'superadmin@msssecurity.com';