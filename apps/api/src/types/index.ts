export interface User {
  id: string;
  orgId: string;
  email: string;
  emailVerified: boolean;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  role: string;
  status: 'active' | 'suspended' | 'locked' | 'deleted';
  
  // MFA settings
  mfaEnabled: boolean;
  mfaSecret?: string;
  mfaBackupCodes?: string[];
  mfaLastUsed?: Date;
  
  // Account security
  failedLoginAttempts: number;
  lockedUntil?: Date;
  passwordChangedAt?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  
  // Audit fields
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface Organization {
  id: string;
  name: string;
  type: 'customer' | 'mss_provider';
  domain?: string;
  ssoEnabled: boolean;
  status: 'active' | 'suspended' | 'deleted';
  settings: any;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
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

export interface SecurityReport {
  id: string;
  customerId: string;
  title: string;
  type: 'vulnerability' | 'threat' | 'incident' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  description: string;
  findings: any[];
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Alert {
  id: string;
  customerId: string;
  type: 'security' | 'system' | 'compliance' | 'network';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: string;
  metadata: any;
  isRead: boolean;
  isResolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface Intervention {
  id: string;
  customerId: string;
  technicianId?: string;
  title: string;
  description: string;
  type: 'remote_access' | 'security_patch' | 'incident_response' | 'maintenance';
  status: 'requested' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  notes: string[];
  createdAt: Date;
  updatedAt: Date;
}

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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}