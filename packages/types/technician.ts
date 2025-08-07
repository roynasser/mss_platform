// =============================================================================
// TECHNICIAN ACCESS & REMOTE SESSIONS TYPES
// =============================================================================

import { PaginationQuery, DateRangeFilter } from './common';

export type AccessLevel = 'read_only' | 'full_access' | 'emergency';
export type AccessStatus = 'active' | 'expired' | 'revoked' | 'suspended';

export interface TechnicianCustomerAccess {
  id: string;
  technicianId: string;
  customerOrgId: string;
  accessLevel: AccessLevel;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
  allowedServices: string[];
  ipRestrictions: string[];
  timeRestrictions?: TimeRestriction;
  status: AccessStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeRestriction {
  allowedHours?: HourRange[];
  allowedDays?: number[]; // 0-6, Sunday=0
  timezone: string;
  emergencyOverride?: boolean;
}

export interface HourRange {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

// =============================================================================
// ACCESS MANAGEMENT REQUEST TYPES
// =============================================================================

export interface GrantAccessRequest {
  technicianId: string;
  customerOrgId: string;
  accessLevel: AccessLevel;
  expiresAt?: string;
  allowedServices?: string[];
  ipRestrictions?: string[];
  timeRestrictions?: TimeRestriction;
  notes?: string;
}

export interface UpdateAccessRequest {
  accessLevel?: AccessLevel;
  expiresAt?: string;
  allowedServices?: string[];
  ipRestrictions?: string[];
  timeRestrictions?: TimeRestriction;
  status?: AccessStatus;
  notes?: string;
}

export interface RevokeAccessRequest {
  reason: string;
  immediate?: boolean;
}

export interface AccessQuery extends PaginationQuery {
  technicianId?: string;
  customerOrgId?: string;
  accessLevel?: AccessLevel;
  status?: AccessStatus;
  grantedBy?: string;
  expiresWithin?: string; // Duration string like "7d", "1h"
  dateRange?: DateRangeFilter;
}

// =============================================================================
// REMOTE ACCESS SESSION TYPES
// =============================================================================

export type SessionType = 'rdp' | 'ssh' | 'vpn' | 'web_terminal' | 'guacamole';
export type SessionStatus = 'active' | 'completed' | 'terminated' | 'failed' | 'timeout';

export interface RemoteAccessSession {
  id: string;
  technicianId: string;
  customerOrgId: string;
  accessGrantId: string;
  sessionType: SessionType;
  targetSystem: string;
  targetPort?: number;
  protocol?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  clientIp: string;
  proxyServer?: string;
  connectionMethod?: string;
  status: SessionStatus;
  terminationReason?: string;
  activitiesLogged: boolean;
  screenshotsTaken: number;
  filesTransferred: number;
  commandsExecuted: number;
  sessionData: Record<string, any>;
  createdAt: string;
}

export interface CreateSessionRequest {
  customerOrgId: string;
  sessionType: SessionType;
  targetSystem: string;
  targetPort?: number;
  protocol?: string;
  connectionMethod?: string;
  sessionData?: Record<string, any>;
}

export interface SessionQuery extends PaginationQuery {
  technicianId?: string;
  customerOrgId?: string;
  accessGrantId?: string;
  sessionType?: SessionType;
  status?: SessionStatus;
  targetSystem?: string;
  dateRange?: DateRangeFilter;
  minDuration?: number; // seconds
  maxDuration?: number; // seconds
}

export interface TerminateSessionRequest {
  reason?: string;
  immediate?: boolean;
}

// =============================================================================
// SESSION ACTIVITY TRACKING
// =============================================================================

export interface SessionActivity {
  id: string;
  sessionId: string;
  activityType: 'command' | 'file_transfer' | 'screen_capture' | 'connection_change' | 'system_access';
  timestamp: string;
  description: string;
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flagged: boolean;
}

export interface CommandActivity {
  command: string;
  workingDirectory: string;
  exitCode?: number;
  output?: string; // Truncated for security
  duration: number; // milliseconds
}

export interface FileTransferActivity {
  sourceFile: string;
  destinationFile: string;
  direction: 'upload' | 'download';
  fileSize: number;
  fileHash?: string;
  successful: boolean;
}

export interface ScreenCaptureActivity {
  captureId: string;
  filename: string;
  timestamp: string;
  automated: boolean; // vs manual capture
}

// =============================================================================
// SESSION MONITORING & ALERTS
// =============================================================================

export interface SessionAlert {
  id: string;
  sessionId: string;
  alertType: 'suspicious_activity' | 'policy_violation' | 'security_risk' | 'system_warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  triggered: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedAt?: string;
  metadata: Record<string, any>;
}

export interface SessionPolicy {
  id: string;
  name: string;
  description: string;
  customerOrgId?: string; // null for global policies
  rules: PolicyRule[];
  actions: PolicyAction[];
  active: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyRule {
  id: string;
  type: 'time_limit' | 'command_restriction' | 'file_access' | 'system_access' | 'geo_restriction';
  condition: Record<string, any>;
  enabled: boolean;
}

export interface PolicyAction {
  id: string;
  trigger: 'on_violation' | 'on_warning' | 'on_session_start' | 'on_session_end';
  action: 'terminate_session' | 'send_alert' | 'log_event' | 'require_approval' | 'block_command';
  parameters: Record<string, any>;
}

// =============================================================================
// TECHNICIAN WORKSPACE TYPES
// =============================================================================

export interface TechnicianWorkspace {
  technicianId: string;
  activeConnections: ActiveConnection[];
  recentSessions: RemoteAccessSession[];
  assignedCustomers: CustomerAccess[];
  pendingApprovals: ApprovalRequest[];
  alerts: SessionAlert[];
}

export interface ActiveConnection {
  sessionId: string;
  customerName: string;
  targetSystem: string;
  sessionType: SessionType;
  startedAt: string;
  lastActivity: string;
  status: 'connected' | 'idle' | 'warning';
}

export interface CustomerAccess {
  customerOrgId: string;
  customerName: string;
  accessLevel: AccessLevel;
  expiresAt?: string;
  lastAccessedAt?: string;
  activeSessions: number;
  totalSessions: number;
}

export interface ApprovalRequest {
  id: string;
  type: 'session_approval' | 'access_extension' | 'emergency_access';
  customerOrgId: string;
  customerName: string;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  metadata: Record<string, any>;
}

// =============================================================================
// AUDIT & COMPLIANCE TYPES
// =============================================================================

export interface TechnicianAuditReport {
  technicianId: string;
  period: {
    start: string;
    end: string;
  };
  summary: TechnicianActivitySummary;
  sessions: RemoteAccessSession[];
  violations: PolicyViolation[];
  alerts: SessionAlert[];
}

export interface TechnicianActivitySummary {
  totalSessions: number;
  totalDuration: number; // seconds
  uniqueCustomers: number;
  commandsExecuted: number;
  filesTransferred: number;
  screenshotsTaken: number;
  policiesViolated: number;
  averageSessionDuration: number; // seconds
}

export interface PolicyViolation {
  id: string;
  sessionId: string;
  policyId: string;
  policyName: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  actionTaken: string;
  resolved: boolean;
}

// =============================================================================
// REPORTING & ANALYTICS
// =============================================================================

export interface TechnicianMetrics {
  technicianId: string;
  period: {
    start: string;
    end: string;
  };
  sessionMetrics: SessionMetrics;
  customerMetrics: CustomerMetrics;
  complianceMetrics: ComplianceMetrics;
  performanceMetrics: PerformanceMetrics;
}

export interface SessionMetrics {
  totalSessions: number;
  averageDuration: number;
  successfulSessions: number;
  failedSessions: number;
  terminatedSessions: number;
  bySessionType: Record<SessionType, number>;
  peakHours: HourlyDistribution[];
}

export interface CustomerMetrics {
  uniqueCustomers: number;
  topCustomers: CustomerUsage[];
  accessViolations: number;
  expiredAccess: number;
}

export interface CustomerUsage {
  customerOrgId: string;
  customerName: string;
  sessionCount: number;
  totalDuration: number;
  lastAccess: string;
}

export interface ComplianceMetrics {
  totalPolicyChecks: number;
  violations: number;
  violationRate: number;
  criticalViolations: number;
  resolvedViolations: number;
  averageResolutionTime: number; // hours
}

export interface PerformanceMetrics {
  averageConnectionTime: number; // seconds
  connectionFailureRate: number;
  averageResponseTime: number; // milliseconds
  systemUptime: number; // percentage
}

export interface HourlyDistribution {
  hour: number; // 0-23
  sessionCount: number;
  totalDuration: number;
}