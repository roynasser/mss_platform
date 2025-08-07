export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  orgId: string;
  orgName: string;
  orgType: 'customer' | 'mss_provider';
  mfaEnabled?: boolean;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  refreshToken: string;
  deviceInfo?: any;
  ipAddress: string;
  userAgent?: string;
  location?: any;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  status: 'active' | 'expired' | 'revoked';
  revokedAt?: Date;
  revokedReason?: string;
}

export interface SecurityEvent {
  type: string;
  userId: string;
  ipAddress: string;
  userAgent?: string;
  location?: any;
  metadata?: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

// Multi-tenant types
export interface Organization {
  id: string;
  name: string;
  type: 'customer' | 'mss_provider';
  domain?: string;
  ssoEnabled: boolean;
  status: 'active' | 'suspended' | 'deleted';
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface TechnicianAccess {
  id: string;
  technicianId: string;
  customerOrgId: string;
  accessLevel: 'read_only' | 'full_access' | 'emergency';
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
  revokedReason?: string;
  allowedServices?: string[];
  ipRestrictions?: string[];
  timeRestrictions?: Record<string, any>;
  status: 'active' | 'expired' | 'revoked' | 'suspended';
  notes?: string;
}

export interface AccessMatrixEntry {
  technicianId: string;
  customerOrgId: string;
  hasAccess: boolean;
  access?: TechnicianAccess;
}

export interface UserRole {
  // Customer roles
  CUSTOMER_ADMIN: 'admin';
  CUSTOMER_REPORT_VIEWER: 'report_viewer';
  CUSTOMER_REQUEST_USER: 'request_user';
  CUSTOMER_BASIC_USER: 'basic_user';
  
  // MSS provider roles
  MSS_SUPER_ADMIN: 'super_admin';
  MSS_TECHNICIAN: 'technician';
  MSS_SECURITY_ANALYST: 'security_analyst';
  MSS_ACCOUNT_MANAGER: 'account_manager';
}

export const USER_ROLES = {
  // Customer roles
  CUSTOMER_ADMIN: 'admin',
  CUSTOMER_REPORT_VIEWER: 'report_viewer',
  CUSTOMER_REQUEST_USER: 'request_user',
  CUSTOMER_BASIC_USER: 'basic_user',
  
  // MSS provider roles
  MSS_SUPER_ADMIN: 'super_admin',
  MSS_TECHNICIAN: 'technician',
  MSS_SECURITY_ANALYST: 'security_analyst',
  MSS_ACCOUNT_MANAGER: 'account_manager',
} as const;

export const CUSTOMER_ROLES = [
  USER_ROLES.CUSTOMER_ADMIN,
  USER_ROLES.CUSTOMER_REPORT_VIEWER,
  USER_ROLES.CUSTOMER_REQUEST_USER,
  USER_ROLES.CUSTOMER_BASIC_USER,
] as const;

export const MSS_ROLES = [
  USER_ROLES.MSS_SUPER_ADMIN,
  USER_ROLES.MSS_TECHNICIAN,
  USER_ROLES.MSS_SECURITY_ANALYST,
  USER_ROLES.MSS_ACCOUNT_MANAGER,
] as const;

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
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceRelevant: boolean;
  timestamp: Date;
  metadata: Record<string, any>;
}