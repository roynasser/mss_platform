// =============================================================================
// AUTHENTICATION & SESSION TYPES
// =============================================================================

import { UserRole, OrganizationType } from './common';

// =============================================================================
// LOGIN & AUTHENTICATION
// =============================================================================

export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
  rememberMe?: boolean;
  deviceInfo?: DeviceInfo;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: AuthenticatedUser;
  requiresMfa?: boolean;
  mfaToken?: string; // Temporary token for MFA completion
}

export interface MFASetupRequest {
  password: string;
}

export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MFAVerifyRequest {
  token: string;
  code: string;
}

export interface MFALoginRequest {
  mfaToken: string;
  code: string;
  deviceInfo?: DeviceInfo;
}

// =============================================================================
// SSO AUTHENTICATION
// =============================================================================

export interface SSOInitiateRequest {
  organizationDomain: string;
  redirectUri?: string;
}

export interface SSOInitiateResponse {
  authUrl: string;
  state: string;
}

export interface SSOCallbackRequest {
  code: string;
  state: string;
  organizationId?: string;
}

export interface SSOConfiguration {
  id: string;
  orgId: string;
  providerType: 'saml' | 'oidc' | 'oauth2';
  providerName: string;
  configurationData: Record<string, any>;
  metadata: Record<string, any>;
  enabled: boolean;
  isPrimary: boolean;
  autoProvision: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// =============================================================================
// PASSWORD MANAGEMENT
// =============================================================================

export interface ForgotPasswordRequest {
  email: string;
  organizationDomain?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

export interface DeviceInfo {
  userAgent: string;
  browser?: string;
  os?: string;
  device?: string;
  fingerprint?: string;
}

export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  deviceInfo?: DeviceInfo;
  ipAddress: string;
  userAgent?: string;
  location?: LocationInfo;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  status: 'active' | 'expired' | 'revoked';
  revokedAt?: string;
  revokedReason?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceInfo?: DeviceInfo;
}

export interface LogoutRequest {
  refreshToken?: string;
  logoutAll?: boolean;
}

// =============================================================================
// AUTHENTICATED USER
// =============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  mfaEnabled: boolean;
  emailVerified: boolean;
  permissions: string[];
  lastLoginAt?: string;
}

// =============================================================================
// EMAIL VERIFICATION
// =============================================================================

export interface SendVerificationEmailRequest {
  email?: string; // If not provided, sends to current user
}

export interface VerifyEmailRequest {
  token: string;
}

// =============================================================================
// LOGIN ATTEMPTS & SECURITY
// =============================================================================

export interface LoginAttempt {
  id: string;
  email: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  attemptedAt: string;
  locationData?: LocationInfo;
}

export interface SecurityAlert {
  type: 'suspicious_login' | 'multiple_failures' | 'new_device' | 'unusual_location';
  severity: 'low' | 'medium' | 'high';
  message: string;
  metadata: Record<string, any>;
  timestamp: string;
}

// =============================================================================
// PERMISSION TYPES
// =============================================================================

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

// Customer permissions
export const CUSTOMER_PERMISSIONS = {
  // Reports
  'reports:read': 'View security reports',
  'reports:download': 'Download security reports',
  
  // Intervention Requests
  'requests:create': 'Create intervention requests',
  'requests:read': 'View intervention requests',
  'requests:update': 'Update own intervention requests',
  
  // Dashboard
  'dashboard:view': 'View dashboard',
  
  // Users (admin only)
  'users:read': 'View organization users',
  'users:create': 'Create organization users',
  'users:update': 'Update organization users',
  'users:delete': 'Delete organization users',
  
  // Organization settings (admin only)
  'organization:read': 'View organization details',
  'organization:update': 'Update organization settings',
} as const;

// MSS Provider permissions
export const MSS_PERMISSIONS = {
  // All customer permissions plus:
  
  // Organizations
  'organizations:read': 'View all organizations',
  'organizations:create': 'Create organizations',
  'organizations:update': 'Update organizations',
  'organizations:delete': 'Delete organizations',
  
  // Access Management
  'access:grant': 'Grant technician access',
  'access:revoke': 'Revoke technician access',
  'access:read': 'View access grants',
  
  // Remote Sessions
  'sessions:create': 'Create remote sessions',
  'sessions:read': 'View remote sessions',
  'sessions:terminate': 'Terminate remote sessions',
  
  // Reports Management
  'reports:create': 'Create security reports',
  'reports:approve': 'Approve security reports',
  'reports:publish': 'Publish security reports',
  
  // Intervention Management
  'requests:assign': 'Assign intervention requests',
  'requests:manage': 'Manage all intervention requests',
  
  // System Administration (super_admin only)
  'system:audit': 'View audit logs',
  'system:monitor': 'View system metrics',
  'system:configure': 'Configure system settings',
} as const;

export type CustomerPermission = keyof typeof CUSTOMER_PERMISSIONS;
export type MSSPermission = keyof typeof MSS_PERMISSIONS;
export type AllPermission = CustomerPermission | MSSPermission;