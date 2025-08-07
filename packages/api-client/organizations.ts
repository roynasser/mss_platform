// =============================================================================
// ORGANIZATION MANAGEMENT ENDPOINTS
// =============================================================================

import { ApiResponse, PaginationQuery } from '../types/common';
import {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  User,
  CreateUserRequest,
  UpdateUserRequest,
} from '../types/common';
import { SSOConfiguration } from '../types/auth';

/**
 * Organization Management Endpoints
 * Base URL: /api/v1/organizations
 */

// =============================================================================
// ORGANIZATION CRUD OPERATIONS
// =============================================================================

/**
 * GET /api/v1/organizations
 * List organizations (MSS Provider only)
 */
export interface ListOrganizationsEndpoint {
  method: 'GET';
  path: '/api/v1/organizations';
  headers: { Authorization: 'Bearer <token>' };
  query?: PaginationQuery & {
    type?: 'customer' | 'mss_provider';
    status?: 'active' | 'suspended' | 'deleted';
    search?: string;
  };
  response: ApiResponse<Organization[]>;
  description: 'List all organizations (MSS Provider users only)';
  auth: 'required';
  permissions: ['organizations:read'];
  audit: false;
}

/**
 * GET /api/v1/organizations/:orgId
 * Get organization details
 */
export interface GetOrganizationEndpoint {
  method: 'GET';
  path: '/api/v1/organizations/:orgId';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string };
  response: ApiResponse<Organization>;
  description: 'Get organization details (own org or if MSS Provider)';
  auth: 'required';
  permissions: ['organization:read'];
  audit: false;
}

/**
 * POST /api/v1/organizations
 * Create new organization (MSS Provider only)
 */
export interface CreateOrganizationEndpoint {
  method: 'POST';
  path: '/api/v1/organizations';
  headers: { Authorization: 'Bearer <token>' };
  body: CreateOrganizationRequest;
  response: ApiResponse<Organization>;
  description: 'Create new customer organization';
  auth: 'required';
  permissions: ['organizations:create'];
  audit: true;
}

/**
 * PUT /api/v1/organizations/:orgId
 * Update organization
 */
export interface UpdateOrganizationEndpoint {
  method: 'PUT';
  path: '/api/v1/organizations/:orgId';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string };
  body: UpdateOrganizationRequest;
  response: ApiResponse<Organization>;
  description: 'Update organization details';
  auth: 'required';
  permissions: ['organization:update'];
  audit: true;
}

/**
 * DELETE /api/v1/organizations/:orgId
 * Delete organization (MSS Provider only)
 */
export interface DeleteOrganizationEndpoint {
  method: 'DELETE';
  path: '/api/v1/organizations/:orgId';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string };
  response: ApiResponse<void>;
  description: 'Delete organization (soft delete)';
  auth: 'required';
  permissions: ['organizations:delete'];
  audit: true;
}

// =============================================================================
// ORGANIZATION USER MANAGEMENT
// =============================================================================

/**
 * GET /api/v1/organizations/:orgId/users
 * List organization users
 */
export interface ListOrganizationUsersEndpoint {
  method: 'GET';
  path: '/api/v1/organizations/:orgId/users';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string };
  query?: PaginationQuery & {
    role?: string;
    status?: 'active' | 'suspended' | 'locked' | 'deleted';
    search?: string;
  };
  response: ApiResponse<User[]>;
  description: 'List users in organization';
  auth: 'required';
  permissions: ['users:read'];
  audit: false;
}

/**
 * GET /api/v1/organizations/:orgId/users/:userId
 * Get organization user details
 */
export interface GetOrganizationUserEndpoint {
  method: 'GET';
  path: '/api/v1/organizations/:orgId/users/:userId';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string; userId: string };
  response: ApiResponse<User>;
  description: 'Get user details within organization';
  auth: 'required';
  permissions: ['users:read'];
  audit: false;
}

/**
 * POST /api/v1/organizations/:orgId/users
 * Create organization user
 */
export interface CreateOrganizationUserEndpoint {
  method: 'POST';
  path: '/api/v1/organizations/:orgId/users';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string };
  body: Omit<CreateUserRequest, 'orgId'>;
  response: ApiResponse<User>;
  description: 'Create new user in organization';
  auth: 'required';
  permissions: ['users:create'];
  audit: true;
}

/**
 * PUT /api/v1/organizations/:orgId/users/:userId
 * Update organization user
 */
export interface UpdateOrganizationUserEndpoint {
  method: 'PUT';
  path: '/api/v1/organizations/:orgId/users/:userId';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string; userId: string };
  body: UpdateUserRequest;
  response: ApiResponse<User>;
  description: 'Update user in organization';
  auth: 'required';
  permissions: ['users:update'];
  audit: true;
}

/**
 * DELETE /api/v1/organizations/:orgId/users/:userId
 * Delete organization user
 */
export interface DeleteOrganizationUserEndpoint {
  method: 'DELETE';
  path: '/api/v1/organizations/:orgId/users/:userId';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string; userId: string };
  response: ApiResponse<void>;
  description: 'Delete user from organization';
  auth: 'required';
  permissions: ['users:delete'];
  audit: true;
}

/**
 * POST /api/v1/organizations/:orgId/users/:userId/invite
 * Resend user invitation
 */
export interface ResendUserInviteEndpoint {
  method: 'POST';
  path: '/api/v1/organizations/:orgId/users/:userId/invite';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string; userId: string };
  response: ApiResponse<void>;
  description: 'Resend invitation email to user';
  auth: 'required';
  permissions: ['users:create'];
  rateLimit: '5 requests per hour per user';
  audit: true;
}

// =============================================================================
// SSO CONFIGURATION MANAGEMENT
// =============================================================================

/**
 * GET /api/v1/organizations/:orgId/sso
 * List SSO configurations
 */
export interface ListSSOConfigurationsEndpoint {
  method: 'GET';
  path: '/api/v1/organizations/:orgId/sso';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string };
  response: ApiResponse<SSOConfiguration[]>;
  description: 'List SSO configurations for organization';
  auth: 'required';
  permissions: ['organization:read'];
  audit: false;
}

/**
 * GET /api/v1/organizations/:orgId/sso/:ssoId
 * Get SSO configuration
 */
export interface GetSSOConfigurationEndpoint {
  method: 'GET';
  path: '/api/v1/organizations/:orgId/sso/:ssoId';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string; ssoId: string };
  response: ApiResponse<SSOConfiguration>;
  description: 'Get SSO configuration details';
  auth: 'required';
  permissions: ['organization:read'];
  audit: false;
}

/**
 * POST /api/v1/organizations/:orgId/sso
 * Create SSO configuration
 */
export interface CreateSSOConfigurationEndpoint {
  method: 'POST';
  path: '/api/v1/organizations/:orgId/sso';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string };
  body: {
    providerType: 'saml' | 'oidc' | 'oauth2';
    providerName: string;
    configurationData: Record<string, any>;
    metadata?: Record<string, any>;
    autoProvision?: boolean;
  };
  response: ApiResponse<SSOConfiguration>;
  description: 'Create SSO configuration for organization';
  auth: 'required';
  permissions: ['organization:update'];
  audit: true;
}

/**
 * PUT /api/v1/organizations/:orgId/sso/:ssoId
 * Update SSO configuration
 */
export interface UpdateSSOConfigurationEndpoint {
  method: 'PUT';
  path: '/api/v1/organizations/:orgId/sso/:ssoId';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string; ssoId: string };
  body: {
    providerName?: string;
    configurationData?: Record<string, any>;
    metadata?: Record<string, any>;
    enabled?: boolean;
    autoProvision?: boolean;
  };
  response: ApiResponse<SSOConfiguration>;
  description: 'Update SSO configuration';
  auth: 'required';
  permissions: ['organization:update'];
  audit: true;
}

/**
 * DELETE /api/v1/organizations/:orgId/sso/:ssoId
 * Delete SSO configuration
 */
export interface DeleteSSOConfigurationEndpoint {
  method: 'DELETE';
  path: '/api/v1/organizations/:orgId/sso/:ssoId';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string; ssoId: string };
  response: ApiResponse<void>;
  description: 'Delete SSO configuration';
  auth: 'required';
  permissions: ['organization:update'];
  audit: true;
}

/**
 * POST /api/v1/organizations/:orgId/sso/:ssoId/test
 * Test SSO configuration
 */
export interface TestSSOConfigurationEndpoint {
  method: 'POST';
  path: '/api/v1/organizations/:orgId/sso/:ssoId/test';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string; ssoId: string };
  response: ApiResponse<{
    success: boolean;
    message: string;
    details?: Record<string, any>;
  }>;
  description: 'Test SSO configuration';
  auth: 'required';
  permissions: ['organization:update'];
  rateLimit: '10 requests per hour per organization';
  audit: true;
}

// =============================================================================
// ORGANIZATION STATISTICS
// =============================================================================

/**
 * GET /api/v1/organizations/:orgId/stats
 * Get organization statistics
 */
export interface GetOrganizationStatsEndpoint {
  method: 'GET';
  path: '/api/v1/organizations/:orgId/stats';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string };
  query?: {
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    startDate?: string;
    endDate?: string;
  };
  response: ApiResponse<OrganizationStats>;
  description: 'Get organization statistics and metrics';
  auth: 'required';
  permissions: ['organization:read'];
  audit: false;
}

export interface OrganizationStats {
  organization: {
    id: string;
    name: string;
    type: string;
    status: string;
  };
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
    recentLogins: number;
  };
  security: {
    reportsGenerated: number;
    interventionRequests: number;
    activeSessions: number;
    complianceScore?: number;
  };
  activity: {
    period: string;
    loginAttempts: number;
    successfulLogins: number;
    failedLogins: number;
    mfaUsage: number;
  };
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * POST /api/v1/organizations/:orgId/users/bulk
 * Bulk user operations
 */
export interface BulkUserOperationEndpoint {
  method: 'POST';
  path: '/api/v1/organizations/:orgId/users/bulk';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string };
  body: {
    operation: 'create' | 'update' | 'delete' | 'suspend' | 'activate';
    users: any[]; // Operation-specific user data
    options?: Record<string, any>;
  };
  response: ApiResponse<{
    success: string[]; // User IDs
    failed: Array<{
      userId?: string;
      email?: string;
      error: string;
    }>;
  }>;
  description: 'Perform bulk operations on users';
  auth: 'required';
  permissions: ['users:create', 'users:update', 'users:delete'];
  rateLimit: '10 requests per hour per organization';
  audit: true;
}

// =============================================================================
// ORGANIZATION SETTINGS
// =============================================================================

/**
 * GET /api/v1/organizations/:orgId/settings
 * Get organization settings
 */
export interface GetOrganizationSettingsEndpoint {
  method: 'GET';
  path: '/api/v1/organizations/:orgId/settings';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string };
  response: ApiResponse<OrganizationSettings>;
  description: 'Get organization configuration settings';
  auth: 'required';
  permissions: ['organization:read'];
  audit: false;
}

/**
 * PUT /api/v1/organizations/:orgId/settings
 * Update organization settings
 */
export interface UpdateOrganizationSettingsEndpoint {
  method: 'PUT';
  path: '/api/v1/organizations/:orgId/settings';
  headers: { Authorization: 'Bearer <token>' };
  params: { orgId: string };
  body: Partial<OrganizationSettings>;
  response: ApiResponse<OrganizationSettings>;
  description: 'Update organization configuration settings';
  auth: 'required';
  permissions: ['organization:update'];
  audit: true;
}

export interface OrganizationSettings {
  security: {
    passwordPolicy: PasswordPolicy;
    mfaRequired: boolean;
    sessionTimeout: number; // minutes
    maxConcurrentSessions: number;
    ipWhitelist?: string[];
  };
  notifications: {
    emailNotifications: boolean;
    securityAlerts: boolean;
    reportNotifications: boolean;
    maintenanceUpdates: boolean;
  };
  customization: {
    logo?: string;
    primaryColor?: string;
    timezone: string;
    dateFormat: string;
  };
  integration: {
    webhookUrl?: string;
    webhookSecret?: string;
    apiRateLimit?: number;
  };
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
  preventReuse: number; // number of previous passwords
}