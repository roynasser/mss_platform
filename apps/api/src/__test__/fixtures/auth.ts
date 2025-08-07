import { AuthPayload } from '@/types'

export const authFixtures = {
  validTokenPayload: {
    userId: 'customer-user-id',
    email: 'customer@test.com',
    role: 'customer',
    orgId: 2,
    orgName: 'Customer Corporation',
    orgType: 'customer',
    mfaEnabled: false,
  } as AuthPayload,

  adminTokenPayload: {
    userId: 'admin-user-id',
    email: 'admin@test.com',
    role: 'admin',
    orgId: 1,
    orgName: 'MSS Security Solutions',
    orgType: 'mss_provider',
    mfaEnabled: false,
  } as AuthPayload,

  technicianTokenPayload: {
    userId: 'technician-user-id',
    email: 'technician@test.com',
    role: 'technician',
    orgId: 1,
    orgName: 'MSS Security Solutions',
    orgType: 'mss_provider',
    mfaEnabled: false,
  } as AuthPayload,

  mfaTokenPayload: {
    userId: 'mfa-user-id',
    email: 'mfa@test.com',
    role: 'customer',
    orgId: 2,
    orgName: 'Customer Corporation',
    orgType: 'customer',
    mfaEnabled: true,
  } as AuthPayload,
}

export const sessionFixtures = {
  validSession: {
    id: 'session-1',
    user_id: 'customer-user-id',
    device_info: 'Chrome 120.0.0 on Mac OS',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    location: 'San Francisco, CA',
    status: 'active',
    risk_score: 25,
    last_activity_at: new Date(),
    expires_at: new Date(Date.now() + 86400000), // 24 hours
    created_at: new Date(),
    updated_at: new Date(),
  },

  suspiciousSession: {
    id: 'session-2',
    user_id: 'customer-user-id',
    device_info: 'Unknown Browser on Unknown OS',
    ip_address: '1.2.3.4',
    user_agent: 'Suspicious User Agent',
    location: 'Unknown Location',
    status: 'active',
    risk_score: 85,
    last_activity_at: new Date(),
    expires_at: new Date(Date.now() + 86400000),
    created_at: new Date(),
    updated_at: new Date(),
  },
}

export const mfaFixtures = {
  totpSecret: 'JBSWY3DPEHPK3PXP',
  validTotpCode: '123456',
  invalidTotpCode: '000000',
  backupCodes: [
    'backup-code-1',
    'backup-code-2',
    'backup-code-3',
    'backup-code-4',
    'backup-code-5',
  ],
}

export const securityEventFixtures = {
  loginSuccess: {
    type: 'login',
    userId: 'customer-user-id',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    metadata: { loginMethod: 'password' },
    riskLevel: 'low',
    timestamp: new Date(),
  },

  loginFailure: {
    type: 'login_failed',
    userId: 'customer-user-id',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    metadata: { reason: 'invalid_password', attemptsRemaining: 4 },
    riskLevel: 'medium',
    timestamp: new Date(),
  },

  suspiciousActivity: {
    type: 'suspicious_activity',
    userId: 'customer-user-id',
    ipAddress: '1.2.3.4',
    userAgent: 'Suspicious User Agent',
    metadata: { 
      reason: 'unusual_location',
      previousLocation: 'San Francisco, CA',
      currentLocation: 'Unknown Location' 
    },
    riskLevel: 'high',
    timestamp: new Date(),
  },
}

export const createLoginRequest = (overrides = {}) => {
  return {
    email: 'customer@test.com',
    password: 'password123',
    ...overrides,
  }
}

export const createMfaRequest = (overrides = {}) => {
  return {
    code: '123456',
    pendingSessionId: 'mock-pending-session-id',
    ...overrides,
  }
}

export const createRefreshRequest = (overrides = {}) => {
  return {
    refreshToken: 'mock-refresh-token',
    ...overrides,
  }
}

export const createPasswordChangeRequest = (overrides = {}) => {
  return {
    currentPassword: 'oldPassword123',
    newPassword: 'newPassword123',
    ...overrides,
  }
}