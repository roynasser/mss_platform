import bcrypt from 'bcryptjs'

export const userFixtures = {
  admin: {
    id: 'admin-user-id',
    email: 'admin@test.com',
    password_hash: '$2a$10$test.hash.here',
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin',
    status: 'active',
    mfa_enabled: false,
    org_id: 1,
    failed_login_attempts: 0,
    locked_until: null,
    created_at: new Date(),
    updated_at: new Date(),
  },

  customer: {
    id: 'customer-user-id',
    email: 'customer@test.com',
    password_hash: '$2a$10$test.hash.here',
    first_name: 'Customer',
    last_name: 'User',
    role: 'customer',
    status: 'active',
    mfa_enabled: false,
    org_id: 2,
    failed_login_attempts: 0,
    locked_until: null,
    created_at: new Date(),
    updated_at: new Date(),
  },

  technician: {
    id: 'technician-user-id',
    email: 'technician@test.com',
    password_hash: '$2a$10$test.hash.here',
    first_name: 'Technician',
    last_name: 'User',
    role: 'technician',
    status: 'active',
    mfa_enabled: false,
    org_id: 1,
    failed_login_attempts: 0,
    locked_until: null,
    created_at: new Date(),
    updated_at: new Date(),
  },

  mfaUser: {
    id: 'mfa-user-id',
    email: 'mfa@test.com',
    password_hash: '$2a$10$test.hash.here',
    first_name: 'MFA',
    last_name: 'User',
    role: 'customer',
    status: 'active',
    mfa_enabled: true,
    mfa_secret: 'JBSWY3DPEHPK3PXP',
    org_id: 2,
    failed_login_attempts: 0,
    locked_until: null,
    created_at: new Date(),
    updated_at: new Date(),
  },

  lockedUser: {
    id: 'locked-user-id',
    email: 'locked@test.com',
    password_hash: '$2a$10$test.hash.here',
    first_name: 'Locked',
    last_name: 'User',
    role: 'customer',
    status: 'active',
    mfa_enabled: false,
    org_id: 2,
    failed_login_attempts: 5,
    locked_until: new Date(Date.now() + 900000), // 15 minutes from now
    created_at: new Date(),
    updated_at: new Date(),
  },

  inactiveUser: {
    id: 'inactive-user-id',
    email: 'inactive@test.com',
    password_hash: '$2a$10$test.hash.here',
    first_name: 'Inactive',
    last_name: 'User',
    role: 'customer',
    status: 'inactive',
    mfa_enabled: false,
    org_id: 2,
    failed_login_attempts: 0,
    locked_until: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
}

// Factory functions for creating test users
export const createTestUser = (overrides = {}) => {
  const defaultUser = {
    email: 'test@example.com',
    password_hash: '$2a$10$test.hash.here',
    first_name: 'Test',
    last_name: 'User',
    role: 'customer',
    status: 'active',
    mfa_enabled: false,
    org_id: 2,
    failed_login_attempts: 0,
    locked_until: null,
    created_at: new Date(),
    updated_at: new Date(),
  }

  return { ...defaultUser, ...overrides }
}

// Hash a password for testing
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 10)
}

// Common test passwords
export const testPasswords = {
  valid: 'password123',
  weak: '123',
  strong: 'StrongP@ssw0rd!123',
}

// User creation helpers
export const createAdminUser = (overrides = {}) => createTestUser({ 
  ...userFixtures.admin, 
  ...overrides 
})

export const createCustomerUser = (overrides = {}) => createTestUser({ 
  ...userFixtures.customer, 
  ...overrides 
})

export const createTechnicianUser = (overrides = {}) => createTestUser({ 
  ...userFixtures.technician, 
  ...overrides 
})