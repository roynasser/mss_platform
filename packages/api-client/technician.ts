// =============================================================================
// TECHNICIAN ACCESS & REMOTE SESSION ENDPOINTS
// =============================================================================

import { ApiResponse, PaginationQuery } from '../types/common';
import {
  TechnicianCustomerAccess,
  GrantAccessRequest,
  UpdateAccessRequest,
  RevokeAccessRequest,
  AccessQuery,
  RemoteAccessSession,
  CreateSessionRequest,
  SessionQuery,
  TerminateSessionRequest,
  SessionActivity,
  SessionAlert,
  TechnicianWorkspace,
  TechnicianAuditReport,
  TechnicianMetrics,
} from '../types/technician';

/**
 * Technician Access & Remote Session Endpoints
 * Base URL: /api/v1/technician
 */

// =============================================================================
// TECHNICIAN ACCESS MANAGEMENT
// =============================================================================

/**
 * GET /api/v1/technician/access
 * List technician access grants
 */
export interface ListTechnicianAccessEndpoint {
  method: 'GET';
  path: '/api/v1/technician/access';
  headers: { Authorization: 'Bearer <token>' };
  query?: AccessQuery;
  response: ApiResponse<TechnicianCustomerAccess[]>;
  description: 'List technician access grants (filtered by current user if technician)';
  auth: 'required';
  permissions: ['access:read'];
  audit: false;
}

/**
 * GET /api/v1/technician/access/:accessId
 * Get access grant details
 */
export interface GetAccessGrantEndpoint {
  method: 'GET';
  path: '/api/v1/technician/access/:accessId';
  headers: { Authorization: 'Bearer <token>' };
  params: { accessId: string };
  response: ApiResponse<TechnicianCustomerAccess>;
  description: 'Get detailed technician access grant';
  auth: 'required';
  permissions: ['access:read'];
  audit: false;
}

/**
 * POST /api/v1/technician/access
 * Grant technician access to customer
 */
export interface GrantTechnicianAccessEndpoint {
  method: 'POST';
  path: '/api/v1/technician/access';
  headers: { Authorization: 'Bearer <token>' };
  body: GrantAccessRequest;
  response: ApiResponse<TechnicianCustomerAccess>;
  description: 'Grant technician access to customer organization';
  auth: 'required';
  permissions: ['access:grant'];
  audit: true;
}

/**
 * PUT /api/v1/technician/access/:accessId
 * Update technician access
 */
export interface UpdateTechnicianAccessEndpoint {
  method: 'PUT';
  path: '/api/v1/technician/access/:accessId';
  headers: { Authorization: 'Bearer <token>' };
  params: { accessId: string };
  body: UpdateAccessRequest;
  response: ApiResponse<TechnicianCustomerAccess>;
  description: 'Update technician access grant';
  auth: 'required';
  permissions: ['access:grant'];
  audit: true;
}

/**
 * DELETE /api/v1/technician/access/:accessId
 * Revoke technician access
 */
export interface RevokeTechnicianAccessEndpoint {
  method: 'DELETE';
  path: '/api/v1/technician/access/:accessId';
  headers: { Authorization: 'Bearer <token>' };
  params: { accessId: string };
  body: RevokeAccessRequest;
  response: ApiResponse<void>;
  description: 'Revoke technician access to customer';
  auth: 'required';
  permissions: ['access:revoke'];
  audit: true;
}

/**
 * POST /api/v1/technician/access/:accessId/extend
 * Extend access expiration
 */
export interface ExtendAccessEndpoint {
  method: 'POST';
  path: '/api/v1/technician/access/:accessId/extend';
  headers: { Authorization: 'Bearer <token>' };
  params: { accessId: string };
  body: {
    expiresAt: string;
    reason: string;
  };
  response: ApiResponse<TechnicianCustomerAccess>;
  description: 'Extend technician access expiration';
  auth: 'required';
  permissions: ['access:grant'];
  audit: true;
}

// =============================================================================
// REMOTE ACCESS SESSIONS
// =============================================================================

/**
 * GET /api/v1/technician/sessions
 * List remote access sessions
 */
export interface ListRemoteSessionsEndpoint {
  method: 'GET';
  path: '/api/v1/technician/sessions';
  headers: { Authorization: 'Bearer <token>' };
  query?: SessionQuery;
  response: ApiResponse<RemoteAccessSession[]>;
  description: 'List remote access sessions (filtered by technician for non-admins)';
  auth: 'required';
  permissions: ['sessions:read'];
  audit: false;
}

/**
 * GET /api/v1/technician/sessions/:sessionId
 * Get remote session details
 */
export interface GetRemoteSessionEndpoint {
  method: 'GET';
  path: '/api/v1/technician/sessions/:sessionId';
  headers: { Authorization: 'Bearer <token>' };
  params: { sessionId: string };
  response: ApiResponse<RemoteAccessSession & {
    activities: SessionActivity[];
    alerts: SessionAlert[];
  }>;
  description: 'Get detailed remote access session with activities';
  auth: 'required';
  permissions: ['sessions:read'];
  audit: true;
}

/**
 * POST /api/v1/technician/sessions
 * Create remote access session
 */
export interface CreateRemoteSessionEndpoint {
  method: 'POST';
  path: '/api/v1/technician/sessions';
  headers: { Authorization: 'Bearer <token>' };
  body: CreateSessionRequest;
  response: ApiResponse<RemoteAccessSession & {
    connectionDetails: {
      proxyUrl?: string;
      credentials?: Record<string, string>;
      instructions?: string;
    };
  }>;
  description: 'Create new remote access session';
  auth: 'required';
  permissions: ['sessions:create'];
  rateLimit: '20 sessions per hour per technician';
  audit: true;
}

/**
 * PUT /api/v1/technician/sessions/:sessionId/end
 * End remote access session
 */
export interface EndRemoteSessionEndpoint {
  method: 'PUT';
  path: '/api/v1/technician/sessions/:sessionId/end';
  headers: { Authorization: 'Bearer <token>' };
  params: { sessionId: string };
  body?: TerminateSessionRequest;
  response: ApiResponse<RemoteAccessSession>;
  description: 'End active remote access session';
  auth: 'required';
  permissions: ['sessions:create'];
  audit: true;
}

/**
 * POST /api/v1/technician/sessions/:sessionId/terminate
 * Forcefully terminate session (admin only)
 */
export interface TerminateRemoteSessionEndpoint {
  method: 'POST';
  path: '/api/v1/technician/sessions/:sessionId/terminate';
  headers: { Authorization: 'Bearer <token>' };
  params: { sessionId: string };
  body: TerminateSessionRequest;
  response: ApiResponse<RemoteAccessSession>;
  description: 'Forcefully terminate remote access session';
  auth: 'required';
  permissions: ['sessions:terminate'];
  audit: true;
}

// =============================================================================
// SESSION ACTIVITY TRACKING
// =============================================================================

/**
 * GET /api/v1/technician/sessions/:sessionId/activities
 * Get session activities
 */
export interface GetSessionActivitiesEndpoint {
  method: 'GET';
  path: '/api/v1/technician/sessions/:sessionId/activities';
  headers: { Authorization: 'Bearer <token>' };
  params: { sessionId: string };
  query?: PaginationQuery & {
    activityType?: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    flagged?: boolean;
  };
  response: ApiResponse<SessionActivity[]>;
  description: 'Get activities from remote access session';
  auth: 'required';
  permissions: ['sessions:read'];
  audit: false;
}

/**
 * POST /api/v1/technician/sessions/:sessionId/activities
 * Log session activity
 */
export interface LogSessionActivityEndpoint {
  method: 'POST';
  path: '/api/v1/technician/sessions/:sessionId/activities';
  headers: { Authorization: 'Bearer <token>' };
  params: { sessionId: string };
  body: {
    activityType: string;
    description: string;
    details: Record<string, any>;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  };
  response: ApiResponse<SessionActivity>;
  description: 'Log activity during remote session';
  auth: 'required';
  permissions: ['sessions:create'];
  audit: true;
}

/**
 * PUT /api/v1/technician/sessions/:sessionId/activities/:activityId/flag
 * Flag suspicious activity
 */
export interface FlagActivityEndpoint {
  method: 'PUT';
  path: '/api/v1/technician/sessions/:sessionId/activities/:activityId/flag';
  headers: { Authorization: 'Bearer <token>' };
  params: { sessionId: string; activityId: string };
  body: { reason: string; severity?: 'medium' | 'high' | 'critical' };
  response: ApiResponse<SessionActivity>;
  description: 'Flag suspicious session activity';
  auth: 'required';
  permissions: ['sessions:read'];
  audit: true;
}

// =============================================================================
// SESSION MONITORING & ALERTS
// =============================================================================

/**
 * GET /api/v1/technician/sessions/active
 * Get active sessions
 */
export interface GetActiveSessionsEndpoint {
  method: 'GET';
  path: '/api/v1/technician/sessions/active';
  headers: { Authorization: 'Bearer <token>' };
  query?: {
    technicianId?: string; // Admin can specify technician
    customerOrgId?: string;
  };
  response: ApiResponse<RemoteAccessSession[]>;
  description: 'Get currently active remote sessions';
  auth: 'required';
  permissions: ['sessions:read'];
  audit: false;
}

/**
 * GET /api/v1/technician/alerts
 * Get session alerts
 */
export interface GetSessionAlertsEndpoint {
  method: 'GET';
  path: '/api/v1/technician/alerts';
  headers: { Authorization: 'Bearer <token>' };
  query?: PaginationQuery & {
    alertType?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    acknowledged?: boolean;
    sessionId?: string;
  };
  response: ApiResponse<SessionAlert[]>;
  description: 'Get session monitoring alerts';
  auth: 'required';
  permissions: ['sessions:read'];
  audit: false;
}

/**
 * POST /api/v1/technician/alerts/:alertId/acknowledge
 * Acknowledge session alert
 */
export interface AcknowledgeSessionAlertEndpoint {
  method: 'POST';
  path: '/api/v1/technician/alerts/:alertId/acknowledge';
  headers: { Authorization: 'Bearer <token>' };
  params: { alertId: string };
  body?: { notes?: string };
  response: ApiResponse<SessionAlert>;
  description: 'Acknowledge session monitoring alert';
  auth: 'required';
  permissions: ['sessions:read'];
  audit: true;
}

// =============================================================================
// TECHNICIAN WORKSPACE
// =============================================================================

/**
 * GET /api/v1/technician/workspace
 * Get technician workspace dashboard
 */
export interface GetTechnicianWorkspaceEndpoint {
  method: 'GET';
  path: '/api/v1/technician/workspace';
  headers: { Authorization: 'Bearer <token>' };
  response: ApiResponse<TechnicianWorkspace>;
  description: 'Get technician workspace with active connections and assignments';
  auth: 'required';
  permissions: ['sessions:read'];
  audit: false;
}

/**
 * GET /api/v1/technician/workspace/customers
 * Get assigned customers
 */
export interface GetAssignedCustomersEndpoint {
  method: 'GET';
  path: '/api/v1/technician/workspace/customers';
  headers: { Authorization: 'Bearer <token>' };
  query?: {
    includeInactive?: boolean;
  };
  response: ApiResponse<Array<{
    customerOrgId: string;
    customerName: string;
    accessLevel: string;
    expiresAt?: string;
    activeSessions: number;
    lastAccessed?: string;
    status: string;
  }>>;
  description: 'Get customers assigned to current technician';
  auth: 'required';
  permissions: ['access:read'];
  audit: false;
}

// =============================================================================
// APPROVAL WORKFLOWS
// =============================================================================

/**
 * GET /api/v1/technician/approvals
 * Get pending approval requests
 */
export interface GetApprovalRequestsEndpoint {
  method: 'GET';
  path: '/api/v1/technician/approvals';
  headers: { Authorization: 'Bearer <token>' };
  query?: PaginationQuery & {
    type?: 'session_approval' | 'access_extension' | 'emergency_access';
    urgency?: 'low' | 'medium' | 'high' | 'emergency';
  };
  response: ApiResponse<ApprovalRequest[]>;
  description: 'Get pending approval requests for current user';
  auth: 'required';
  permissions: ['sessions:read'];
  audit: false;
}

/**
 * POST /api/v1/technician/approvals/:approvalId/respond
 * Respond to approval request
 */
export interface RespondToApprovalEndpoint {
  method: 'POST';
  path: '/api/v1/technician/approvals/:approvalId/respond';
  headers: { Authorization: 'Bearer <token>' };
  params: { approvalId: string };
  body: {
    approved: boolean;
    reason?: string;
    conditions?: Record<string, any>;
  };
  response: ApiResponse<void>;
  description: 'Approve or deny approval request';
  auth: 'required';
  permissions: ['access:grant'];
  audit: true;
}

// =============================================================================
// AUDIT & COMPLIANCE
// =============================================================================

/**
 * GET /api/v1/technician/:technicianId/audit
 * Get technician audit report
 */
export interface GetTechnicianAuditEndpoint {
  method: 'GET';
  path: '/api/v1/technician/:technicianId/audit';
  headers: { Authorization: 'Bearer <token>' };
  params: { technicianId: string };
  query?: {
    startDate: string;
    endDate: string;
    includeViolations?: boolean;
    includeAlerts?: boolean;
  };
  response: ApiResponse<TechnicianAuditReport>;
  description: 'Get comprehensive audit report for technician';
  auth: 'required';
  permissions: ['system:audit'];
  audit: true;
}

/**
 * GET /api/v1/technician/:technicianId/metrics
 * Get technician performance metrics
 */
export interface GetTechnicianMetricsEndpoint {
  method: 'GET';
  path: '/api/v1/technician/:technicianId/metrics';
  headers: { Authorization: 'Bearer <token>' };
  params: { technicianId: string };
  query?: {
    period?: 'week' | 'month' | 'quarter' | 'year';
    startDate?: string;
    endDate?: string;
  };
  response: ApiResponse<TechnicianMetrics>;
  description: 'Get performance metrics for technician';
  auth: 'required';
  permissions: ['system:audit'];
  audit: false;
}

// =============================================================================
// EMERGENCY ACCESS
// =============================================================================

/**
 * POST /api/v1/technician/emergency-access
 * Request emergency access
 */
export interface RequestEmergencyAccessEndpoint {
  method: 'POST';
  path: '/api/v1/technician/emergency-access';
  headers: { Authorization: 'Bearer <token>' };
  body: {
    customerOrgId: string;
    reason: string;
    urgency: 'high' | 'emergency';
    estimatedDuration: string; // ISO duration
    justification: string;
    approverIds?: string[]; // Preferred approvers
  };
  response: ApiResponse<{
    requestId: string;
    status: 'pending' | 'approved' | 'denied';
    expiresAt?: string;
    accessId?: string;
  }>;
  description: 'Request emergency access to customer systems';
  auth: 'required';
  permissions: ['sessions:create'];
  rateLimit: '5 requests per day per technician';
  audit: true;
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * POST /api/v1/technician/sessions/batch-terminate
 * Terminate multiple sessions
 */
export interface BatchTerminateSessionsEndpoint {
  method: 'POST';
  path: '/api/v1/technician/sessions/batch-terminate';
  headers: { Authorization: 'Bearer <token>' };
  body: {
    sessionIds: string[];
    reason: string;
    immediate?: boolean;
  };
  response: ApiResponse<{
    terminated: string[];
    failed: Array<{
      sessionId: string;
      error: string;
    }>;
  }>;
  description: 'Terminate multiple remote sessions';
  auth: 'required';
  permissions: ['sessions:terminate'];
  rateLimit: '10 requests per hour per user';
  audit: true;
}

// =============================================================================
// SESSION RECORDING & SCREENSHOTS
// =============================================================================

/**
 * GET /api/v1/technician/sessions/:sessionId/screenshots
 * Get session screenshots
 */
export interface GetSessionScreenshotsEndpoint {
  method: 'GET';
  path: '/api/v1/technician/sessions/:sessionId/screenshots';
  headers: { Authorization: 'Bearer <token>' };
  params: { sessionId: string };
  query?: PaginationQuery;
  response: ApiResponse<Array<{
    id: string;
    filename: string;
    timestamp: string;
    automated: boolean;
    url: string;
  }>>;
  description: 'Get screenshots taken during session';
  auth: 'required';
  permissions: ['sessions:read'];
  audit: true;
}

/**
 * POST /api/v1/technician/sessions/:sessionId/screenshot
 * Take manual screenshot
 */
export interface TakeScreenshotEndpoint {
  method: 'POST';
  path: '/api/v1/technician/sessions/:sessionId/screenshot';
  headers: { Authorization: 'Bearer <token>' };
  params: { sessionId: string };
  body?: { reason?: string };
  response: ApiResponse<{
    screenshotId: string;
    filename: string;
    url: string;
  }>;
  description: 'Take manual screenshot during session';
  auth: 'required';
  permissions: ['sessions:create'];
  rateLimit: '30 screenshots per hour per session';
  audit: true;
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