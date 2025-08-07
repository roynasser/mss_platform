// =============================================================================
// COMMON TYPES AND INTERFACES
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string; // For validation errors
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
  total?: number;
  timestamp: string;
  version: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// AUTHENTICATION & AUTHORIZATION TYPES
// =============================================================================

export interface JWTPayload {
  sub: string; // user ID
  org: string; // organization ID
  role: UserRole;
  type: OrganizationType;
  iat: number;
  exp: number;
  jti: string; // JWT ID for session tracking
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  tokenType: 'Bearer';
}

// =============================================================================
// ORGANIZATION TYPES
// =============================================================================

export type OrganizationType = 'customer' | 'mss_provider';
export type OrganizationStatus = 'active' | 'suspended' | 'deleted';

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  domain?: string;
  ssoEnabled: boolean;
  status: OrganizationStatus;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateOrganizationRequest {
  name: string;
  type: OrganizationType;
  domain?: string;
  settings?: Record<string, any>;
}

export interface UpdateOrganizationRequest {
  name?: string;
  domain?: string;
  ssoEnabled?: boolean;
  status?: OrganizationStatus;
  settings?: Record<string, any>;
}

// =============================================================================
// USER TYPES
// =============================================================================

export type CustomerUserRole = 'admin' | 'report_viewer' | 'request_user' | 'basic_user';
export type MSSUserRole = 'super_admin' | 'technician' | 'security_analyst' | 'account_manager';
export type UserRole = CustomerUserRole | MSSUserRole;
export type UserStatus = 'active' | 'suspended' | 'locked' | 'deleted';

export interface User {
  id: string;
  orgId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  mfaEnabled: boolean;
  mfaLastUsed?: string;
  failedLoginAttempts: number;
  lockedUntil?: string;
  passwordChangedAt?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateUserRequest {
  orgId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password?: string; // Optional for SSO users
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
}

// =============================================================================
// AUDIT TYPES
// =============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLog {
  id: string;
  userId?: string;
  sessionId?: string;
  actionType: string;
  resourceType: string;
  resourceId?: string;
  actionDescription: string;
  actionData: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  organizationId?: string;
  riskLevel: RiskLevel;
  complianceRelevant: boolean;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface AuditLogQuery extends PaginationQuery {
  userId?: string;
  actionType?: string;
  resourceType?: string;
  organizationId?: string;
  riskLevel?: RiskLevel;
  complianceRelevant?: boolean;
  startDate?: string;
  endDate?: string;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// =============================================================================
// FILTER & SEARCH TYPES
// =============================================================================

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface SearchQuery {
  q?: string;
  filters?: Record<string, any>;
  dateRange?: DateRangeFilter;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const API_VERSIONS = {
  V1: 'v1',
} as const;

export const ERROR_CODES = {
  // Authentication
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_MFA_REQUIRED: 'AUTH_MFA_REQUIRED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_DUPLICATE_VALUE: 'VALIDATION_DUPLICATE_VALUE',
  
  // Resources
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_FORBIDDEN: 'RESOURCE_FORBIDDEN',
  
  // System
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Business Logic
  ORGANIZATION_LIMIT_REACHED: 'ORGANIZATION_LIMIT_REACHED',
  USER_LIMIT_REACHED: 'USER_LIMIT_REACHED',
  ACCESS_EXPIRED: 'ACCESS_EXPIRED',
  INVALID_OPERATION: 'INVALID_OPERATION',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;