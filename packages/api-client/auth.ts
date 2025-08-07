// =============================================================================
// AUTHENTICATION & SESSION MANAGEMENT ENDPOINTS
// =============================================================================

import { ApiResponse } from '../types/common';
import {
  LoginRequest,
  LoginResponse,
  MFASetupRequest,
  MFASetupResponse,
  MFAVerifyRequest,
  MFALoginRequest,
  SSOInitiateRequest,
  SSOInitiateResponse,
  SSOCallbackRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  RefreshTokenRequest,
  LogoutRequest,
  SendVerificationEmailRequest,
  VerifyEmailRequest,
  UserSession,
  AuthenticatedUser,
} from '../types/auth';

/**
 * Authentication Endpoints
 * Base URL: /api/v1/auth
 */

// =============================================================================
// LOGIN & LOGOUT
// =============================================================================

/**
 * POST /api/v1/auth/login
 * Authenticate user with email/password
 */
export interface LoginEndpoint {
  method: 'POST';
  path: '/api/v1/auth/login';
  body: LoginRequest;
  response: ApiResponse<LoginResponse>;
  description: 'Authenticate user with email and password. May require MFA completion.';
  rateLimit: '5 requests per minute per IP';
  audit: true;
}

/**
 * POST /api/v1/auth/mfa/complete
 * Complete MFA authentication
 */
export interface MFACompleteEndpoint {
  method: 'POST';
  path: '/api/v1/auth/mfa/complete';
  body: MFALoginRequest;
  response: ApiResponse<LoginResponse>;
  description: 'Complete MFA authentication with temporary token and MFA code';
  rateLimit: '5 requests per minute per IP';
  audit: true;
}

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
export interface RefreshTokenEndpoint {
  method: 'POST';
  path: '/api/v1/auth/refresh';
  body: RefreshTokenRequest;
  response: ApiResponse<LoginResponse>;
  description: 'Refresh access token using refresh token';
  rateLimit: '10 requests per minute per token';
  audit: false;
}

/**
 * POST /api/v1/auth/logout
 * Logout user and revoke tokens
 */
export interface LogoutEndpoint {
  method: 'POST';
  path: '/api/v1/auth/logout';
  headers: { Authorization: 'Bearer <token>' };
  body: LogoutRequest;
  response: ApiResponse<void>;
  description: 'Logout user and optionally revoke all sessions';
  auth: 'required';
  audit: true;
}

// =============================================================================
// MFA MANAGEMENT
// =============================================================================

/**
 * POST /api/v1/auth/mfa/setup
 * Initialize MFA setup
 */
export interface MFASetupEndpoint {
  method: 'POST';
  path: '/api/v1/auth/mfa/setup';
  headers: { Authorization: 'Bearer <token>' };
  body: MFASetupRequest;
  response: ApiResponse<MFASetupResponse>;
  description: 'Generate MFA secret and QR code for user';
  auth: 'required';
  audit: true;
}

/**
 * POST /api/v1/auth/mfa/verify
 * Verify and enable MFA
 */
export interface MFAVerifyEndpoint {
  method: 'POST';
  path: '/api/v1/auth/mfa/verify';
  headers: { Authorization: 'Bearer <token>' };
  body: MFAVerifyRequest;
  response: ApiResponse<{ backupCodes: string[] }>;
  description: 'Verify MFA code and enable MFA for user';
  auth: 'required';
  audit: true;
}

/**
 * DELETE /api/v1/auth/mfa
 * Disable MFA
 */
export interface MFADisableEndpoint {
  method: 'DELETE';
  path: '/api/v1/auth/mfa';
  headers: { Authorization: 'Bearer <token>' };
  body: { password: string };
  response: ApiResponse<void>;
  description: 'Disable MFA for user (requires password confirmation)';
  auth: 'required';
  audit: true;
}

/**
 * POST /api/v1/auth/mfa/backup-codes/regenerate
 * Regenerate MFA backup codes
 */
export interface RegenerateMFABackupCodesEndpoint {
  method: 'POST';
  path: '/api/v1/auth/mfa/backup-codes/regenerate';
  headers: { Authorization: 'Bearer <token>' };
  body: { password: string };
  response: ApiResponse<{ backupCodes: string[] }>;
  description: 'Generate new MFA backup codes (invalidates old ones)';
  auth: 'required';
  audit: true;
}

// =============================================================================
// SSO AUTHENTICATION
// =============================================================================

/**
 * POST /api/v1/auth/sso/initiate
 * Initiate SSO authentication
 */
export interface SSOInitiateEndpoint {
  method: 'POST';
  path: '/api/v1/auth/sso/initiate';
  body: SSOInitiateRequest;
  response: ApiResponse<SSOInitiateResponse>;
  description: 'Initiate SSO authentication flow for organization';
  rateLimit: '10 requests per minute per IP';
  audit: true;
}

/**
 * POST /api/v1/auth/sso/callback
 * Complete SSO authentication
 */
export interface SSOCallbackEndpoint {
  method: 'POST';
  path: '/api/v1/auth/sso/callback';
  body: SSOCallbackRequest;
  response: ApiResponse<LoginResponse>;
  description: 'Complete SSO authentication with provider response';
  rateLimit: '10 requests per minute per IP';
  audit: true;
}

// =============================================================================
// PASSWORD MANAGEMENT
// =============================================================================

/**
 * POST /api/v1/auth/password/forgot
 * Request password reset
 */
export interface ForgotPasswordEndpoint {
  method: 'POST';
  path: '/api/v1/auth/password/forgot';
  body: ForgotPasswordRequest;
  response: ApiResponse<void>;
  description: 'Send password reset email to user';
  rateLimit: '3 requests per hour per email';
  audit: true;
}

/**
 * POST /api/v1/auth/password/reset
 * Reset password with token
 */
export interface ResetPasswordEndpoint {
  method: 'POST';
  path: '/api/v1/auth/password/reset';
  body: ResetPasswordRequest;
  response: ApiResponse<void>;
  description: 'Reset password using reset token';
  rateLimit: '5 requests per hour per IP';
  audit: true;
}

/**
 * POST /api/v1/auth/password/change
 * Change password (authenticated user)
 */
export interface ChangePasswordEndpoint {
  method: 'POST';
  path: '/api/v1/auth/password/change';
  headers: { Authorization: 'Bearer <token>' };
  body: ChangePasswordRequest;
  response: ApiResponse<void>;
  description: 'Change password for authenticated user';
  auth: 'required';
  audit: true;
}

// =============================================================================
// EMAIL VERIFICATION
// =============================================================================

/**
 * POST /api/v1/auth/email/verify/send
 * Send email verification
 */
export interface SendVerificationEmailEndpoint {
  method: 'POST';
  path: '/api/v1/auth/email/verify/send';
  headers: { Authorization: 'Bearer <token>' };
  body: SendVerificationEmailRequest;
  response: ApiResponse<void>;
  description: 'Send email verification link';
  auth: 'required';
  rateLimit: '3 requests per hour per user';
  audit: true;
}

/**
 * POST /api/v1/auth/email/verify
 * Verify email address
 */
export interface VerifyEmailEndpoint {
  method: 'POST';
  path: '/api/v1/auth/email/verify';
  body: VerifyEmailRequest;
  response: ApiResponse<void>;
  description: 'Verify email address using verification token';
  rateLimit: '10 requests per hour per IP';
  audit: true;
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * GET /api/v1/auth/me
 * Get current authenticated user
 */
export interface GetCurrentUserEndpoint {
  method: 'GET';
  path: '/api/v1/auth/me';
  headers: { Authorization: 'Bearer <token>' };
  response: ApiResponse<AuthenticatedUser>;
  description: 'Get current authenticated user information';
  auth: 'required';
  audit: false;
}

/**
 * GET /api/v1/auth/sessions
 * Get user sessions
 */
export interface GetUserSessionsEndpoint {
  method: 'GET';
  path: '/api/v1/auth/sessions';
  headers: { Authorization: 'Bearer <token>' };
  query?: {
    page?: number;
    limit?: number;
    status?: 'active' | 'expired' | 'revoked';
  };
  response: ApiResponse<UserSession[]>;
  description: 'Get all sessions for authenticated user';
  auth: 'required';
  audit: false;
}

/**
 * DELETE /api/v1/auth/sessions/:sessionId
 * Revoke specific session
 */
export interface RevokeSessionEndpoint {
  method: 'DELETE';
  path: '/api/v1/auth/sessions/:sessionId';
  headers: { Authorization: 'Bearer <token>' };
  params: { sessionId: string };
  response: ApiResponse<void>;
  description: 'Revoke a specific user session';
  auth: 'required';
  audit: true;
}

/**
 * DELETE /api/v1/auth/sessions
 * Revoke all other sessions
 */
export interface RevokeAllSessionsEndpoint {
  method: 'DELETE';
  path: '/api/v1/auth/sessions';
  headers: { Authorization: 'Bearer <token>' };
  response: ApiResponse<void>;
  description: 'Revoke all other user sessions (except current)';
  auth: 'required';
  audit: true;
}

// =============================================================================
// AUTHENTICATION MIDDLEWARE SPECIFICATION
// =============================================================================

export interface AuthMiddleware {
  /**
   * Extract and validate JWT token from Authorization header
   */
  extractToken(authHeader?: string): string | null;
  
  /**
   * Verify JWT token and return payload
   */
  verifyToken(token: string): Promise<JWTPayload>;
  
  /**
   * Check if user has required permissions
   */
  hasPermission(userRole: string, orgType: string, permission: string): boolean;
  
  /**
   * Check if user can access organization resource
   */
  canAccessOrganization(userOrgId: string, targetOrgId: string, userRole: string): boolean;
  
  /**
   * Rate limiting check
   */
  checkRateLimit(identifier: string, limit: string): Promise<boolean>;
  
  /**
   * Log authentication event
   */
  logAuthEvent(event: AuthEvent): Promise<void>;
}

export interface AuthEvent {
  type: 'login' | 'logout' | 'token_refresh' | 'mfa_setup' | 'password_change' | 'session_revoked';
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

// =============================================================================
// ERROR RESPONSES
// =============================================================================

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: {
    code: 'AUTH_INVALID_CREDENTIALS',
    message: 'Invalid email or password',
    status: 401,
  },
  ACCOUNT_LOCKED: {
    code: 'AUTH_ACCOUNT_LOCKED',
    message: 'Account is locked due to multiple failed login attempts',
    status: 423,
  },
  MFA_REQUIRED: {
    code: 'AUTH_MFA_REQUIRED',
    message: 'MFA verification required',
    status: 200, // Special case - success but additional step required
  },
  TOKEN_EXPIRED: {
    code: 'AUTH_TOKEN_EXPIRED',
    message: 'Authentication token has expired',
    status: 401,
  },
  TOKEN_INVALID: {
    code: 'AUTH_TOKEN_INVALID',
    message: 'Invalid authentication token',
    status: 401,
  },
  INSUFFICIENT_PERMISSIONS: {
    code: 'AUTH_INSUFFICIENT_PERMISSIONS',
    message: 'Insufficient permissions for this operation',
    status: 403,
  },
  EMAIL_NOT_VERIFIED: {
    code: 'AUTH_EMAIL_NOT_VERIFIED',
    message: 'Email address not verified',
    status: 403,
  },
  SSO_NOT_CONFIGURED: {
    code: 'AUTH_SSO_NOT_CONFIGURED',
    message: 'SSO not configured for organization',
    status: 400,
  },
  PASSWORD_REQUIREMENTS: {
    code: 'AUTH_PASSWORD_REQUIREMENTS',
    message: 'Password does not meet security requirements',
    status: 400,
  },
} as const;