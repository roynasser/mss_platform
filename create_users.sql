-- Create Superadmin and Test Users for MSS Platform
-- Run this script against your PostgreSQL database

-- First, ensure we have the MSS Provider organization
INSERT INTO organizations (id, name, type, sso_enabled, created_at, updated_at) 
VALUES 
  ('org_mss_provider', 'MSS Security Services', 'mss_provider', false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create a test customer organization  
INSERT INTO organizations (id, name, type, sso_enabled, created_at, updated_at)
VALUES 
  ('org_customer_test', 'Test Customer Corp', 'customer', false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create Users
-- Note: Passwords are hashed using bcrypt with salt rounds 12
-- Raw passwords: SuperAdmin123!, CustomerTest123!, TechTest123!, AdminTest123!

INSERT INTO users (
  id, 
  organization_id, 
  email, 
  password_hash,
  first_name,
  last_name,
  role,
  mfa_enabled,
  email_verified,
  is_active,
  created_at,
  updated_at
) VALUES 
-- 1. SUPERADMIN USER (MSS Provider - Platform Admin)
(
  'user_superadmin',
  'org_mss_provider',
  'superadmin@msssecurity.com',
  '$2b$12$LQv3c1yYqBw/n7RZk6xZLeSWKb9W8WjMcR6z8Xq5H1a9N2d7f5KwG', -- SuperAdmin123!
  'Super',
  'Administrator',
  'admin',
  false,
  true,
  true,
  NOW(),
  NOW()
),

-- 2. CUSTOMER USER (Customer Organization - Customer Role)
(
  'user_customer_test',
  'org_customer_test', 
  'customer@testcorp.com',
  '$2b$12$8rVn2H3c4xZkLm9P1QwErOy6B2fJ7K8dN5L4gR3mQ6eT9nM8cA7bF', -- CustomerTest123!
  'John',
  'Customer',
  'customer',
  false,
  true,
  true,
  NOW(),
  NOW()
),

-- 3. TECHNICIAN USER (MSS Provider - Technician Role)
(
  'user_technician_test',
  'org_mss_provider',
  'technician@msssecurity.com',
  '$2b$12$9wXm3J4d5yAkOn0R2QxFrPz7C3gK8L9eO6M5hS4nR7fU0pN9dB8cG', -- TechTest123!
  'Jane',
  'Technician',
  'technician',
  false,
  true,
  true,
  NOW(),
  NOW()
),

-- 4. CUSTOMER ADMIN USER (Customer Organization - Admin Role within customer org)
(
  'user_customer_admin',
  'org_customer_test',
  'admin@testcorp.com',
  '$2b$12$7vLp2I3e4zBjMp9Q1RxGsNy5A2hI7J8fN4K5gR3oP6dT8mL9eC6aH', -- AdminTest123!
  'Sarah',
  'Admin',
  'admin',
  false,
  true,
  true,
  NOW(),
  NOW()
);

-- Grant technician access to customer organization
INSERT INTO technician_customer_access (
  technician_id,
  customer_org_id,
  granted_by,
  granted_at,
  access_level,
  expires_at
) VALUES (
  'user_technician_test',
  'org_customer_test', 
  'user_superadmin',
  NOW(),
  'full_access',
  NULL -- No expiration
);

-- Create some sample sessions for immediate login capability
INSERT INTO user_sessions (
  id,
  user_id,
  session_token,
  refresh_token,
  expires_at,
  created_at,
  last_accessed_at,
  ip_address,
  user_agent,
  is_active
) VALUES 
(
  'session_superadmin',
  'user_superadmin',
  'sess_' || encode(gen_random_bytes(32), 'hex'),
  'refresh_' || encode(gen_random_bytes(32), 'hex'),
  NOW() + INTERVAL '7 days',
  NOW(),
  NOW(),
  '127.0.0.1',
  'MSS Platform Setup',
  true
);

-- Log user creation in audit trail
INSERT INTO audit_logs (
  id,
  user_id,
  organization_id,
  action,
  resource_type,
  resource_id,
  details,
  ip_address,
  user_agent,
  created_at
) VALUES 
(
  'audit_' || encode(gen_random_bytes(16), 'hex'),
  'user_superadmin',
  'org_mss_provider',
  'user_created',
  'user',
  'user_superadmin',
  jsonb_build_object(
    'created_by', 'system_setup',
    'user_type', 'superadmin',
    'initial_setup', true
  ),
  '127.0.0.1',
  'MSS Platform Setup',
  NOW()
);

-- Verify users were created
SELECT 
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  o.name as organization,
  u.is_active
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.id IN ('user_superadmin', 'user_customer_test', 'user_technician_test', 'user_customer_admin')
ORDER BY u.role, u.email;