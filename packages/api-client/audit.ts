// =============================================================================
// AUDIT & COMPLIANCE ENDPOINTS
// =============================================================================

import { ApiResponse, PaginationQuery } from '../types/common';
import { AuditLog, AuditLogQuery } from '../types/common';

/**
 * Audit & Compliance Endpoints
 * Base URL: /api/v1/audit
 */

// =============================================================================
// AUDIT LOG ENDPOINTS
// =============================================================================

/**
 * GET /api/v1/audit/logs
 * List audit logs
 */
export interface ListAuditLogsEndpoint {
  method: 'GET';
  path: '/api/v1/audit/logs';
  headers: { Authorization: 'Bearer <token>' };
  query?: AuditLogQuery;
  response: ApiResponse<AuditLog[]>;
  description: 'List audit logs (filtered by organization unless super admin)';
  auth: 'required';
  permissions: ['system:audit'];
  audit: false; // Audit log access is implicitly logged
}

/**
 * GET /api/v1/audit/logs/:logId
 * Get audit log details
 */
export interface GetAuditLogEndpoint {
  method: 'GET';
  path: '/api/v1/audit/logs/:logId';
  headers: { Authorization: 'Bearer <token>' };
  params: { logId: string };
  response: ApiResponse<AuditLog>;
  description: 'Get detailed audit log entry';
  auth: 'required';
  permissions: ['system:audit'];
  audit: true;
}

/**
 * POST /api/v1/audit/logs/search
 * Advanced audit log search
 */
export interface SearchAuditLogsEndpoint {
  method: 'POST';
  path: '/api/v1/audit/logs/search';
  headers: { Authorization: 'Bearer <token>' };
  body: {
    query: string; // Advanced search query
    filters: {
      actionTypes?: string[];
      resourceTypes?: string[];
      userIds?: string[];
      organizationIds?: string[];
      riskLevels?: string[];
      complianceRelevant?: boolean;
      dateRange: {
        startDate: string;
        endDate: string;
      };
    };
    aggregations?: {
      byActionType?: boolean;
      byResourceType?: boolean;
      byRiskLevel?: boolean;
      byHour?: boolean;
      byUser?: boolean;
    };
    pagination?: PaginationQuery;
  };
  response: ApiResponse<{
    logs: AuditLog[];
    aggregations?: Record<string, any>;
    totalMatches: number;
  }>;
  description: 'Advanced search and analytics for audit logs';
  auth: 'required';
  permissions: ['system:audit'];
  rateLimit: '100 requests per hour per user';
  audit: true;
}

/**
 * GET /api/v1/audit/logs/export
 * Export audit logs
 */
export interface ExportAuditLogsEndpoint {
  method: 'GET';
  path: '/api/v1/audit/logs/export';
  headers: { Authorization: 'Bearer <token>' };
  query: {
    format: 'csv' | 'json' | 'excel';
    startDate: string;
    endDate: string;
    organizationId?: string;
    actionTypes?: string;
    resourceTypes?: string;
    complianceOnly?: boolean;
  };
  response: 'File download (binary)';
  description: 'Export audit logs for compliance reporting';
  auth: 'required';
  permissions: ['system:audit'];
  rateLimit: '10 exports per day per user';
  audit: true;
}

// =============================================================================
// COMPLIANCE REPORTING
// =============================================================================

/**
 * GET /api/v1/audit/compliance/summary
 * Get compliance summary
 */
export interface GetComplianceSummaryEndpoint {
  method: 'GET';
  path: '/api/v1/audit/compliance/summary';
  headers: { Authorization: 'Bearer <token>' };
  query?: {
    organizationId?: string;
    framework?: 'SOC2' | 'ISO27001' | 'HIPAA' | 'PCI_DSS' | 'GDPR';
    period?: 'month' | 'quarter' | 'year';
    startDate?: string;
    endDate?: string;
  };
  response: ApiResponse<ComplianceSummary>;
  description: 'Get compliance summary and metrics';
  auth: 'required';
  permissions: ['system:audit'];
  audit: false;
}

/**
 * POST /api/v1/audit/compliance/report
 * Generate compliance report
 */
export interface GenerateComplianceReportEndpoint {
  method: 'POST';
  path: '/api/v1/audit/compliance/report';
  headers: { Authorization: 'Bearer <token>' };
  body: {
    organizationId?: string;
    framework: 'SOC2' | 'ISO27001' | 'HIPAA' | 'PCI_DSS' | 'GDPR';
    reportType: 'full' | 'summary' | 'violations' | 'access_review';
    period: {
      startDate: string;
      endDate: string;
    };
    includeSections: string[];
    format: 'pdf' | 'excel' | 'json';
  };
  response: ApiResponse<{
    reportId: string;
    status: 'generating' | 'completed' | 'failed';
    downloadUrl?: string;
    estimatedCompletion?: string;
  }>;
  description: 'Generate comprehensive compliance report';
  auth: 'required';
  permissions: ['system:audit'];
  rateLimit: '5 reports per day per user';
  audit: true;
}

/**
 * GET /api/v1/audit/compliance/violations
 * Get compliance violations
 */
export interface GetComplianceViolationsEndpoint {
  method: 'GET';
  path: '/api/v1/audit/compliance/violations';
  headers: { Authorization: 'Bearer <token>' };
  query?: PaginationQuery & {
    organizationId?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    status?: 'open' | 'resolved' | 'investigating';
    framework?: string;
    startDate?: string;
    endDate?: string;
  };
  response: ApiResponse<ComplianceViolation[]>;
  description: 'List compliance violations and findings';
  auth: 'required';
  permissions: ['system:audit'];
  audit: false;
}

// =============================================================================
// SECURITY INCIDENT TRACKING
// =============================================================================

/**
 * GET /api/v1/audit/incidents
 * List security incidents
 */
export interface ListSecurityIncidentsEndpoint {
  method: 'GET';
  path: '/api/v1/audit/incidents';
  headers: { Authorization: 'Bearer <token>' };
  query?: PaginationQuery & {
    organizationId?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    status?: 'open' | 'investigating' | 'contained' | 'resolved';
    category?: string;
    startDate?: string;
    endDate?: string;
  };
  response: ApiResponse<SecurityIncident[]>;
  description: 'List security incidents';
  auth: 'required';
  permissions: ['system:audit'];
  audit: false;
}

/**
 * GET /api/v1/audit/incidents/:incidentId
 * Get security incident details
 */
export interface GetSecurityIncidentEndpoint {
  method: 'GET';
  path: '/api/v1/audit/incidents/:incidentId';
  headers: { Authorization: 'Bearer <token>' };
  params: { incidentId: string };
  response: ApiResponse<SecurityIncident & {
    timeline: IncidentTimelineEntry[];
    relatedLogs: AuditLog[];
    impactAssessment: IncidentImpact;
  }>;
  description: 'Get detailed security incident information';
  auth: 'required';
  permissions: ['system:audit'];
  audit: true;
}

/**
 * POST /api/v1/audit/incidents
 * Create security incident
 */
export interface CreateSecurityIncidentEndpoint {
  method: 'POST';
  path: '/api/v1/audit/incidents';
  headers: { Authorization: 'Bearer <token>' };
  body: {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'data_breach' | 'unauthorized_access' | 'malware' | 'phishing' | 'policy_violation' | 'system_compromise' | 'other';
    organizationId: string;
    affectedSystems?: string[];
    discoveredBy?: string;
    discoveryMethod?: 'automated' | 'manual' | 'reported';
    initialAssessment?: string;
  };
  response: ApiResponse<SecurityIncident>;
  description: 'Create new security incident';
  auth: 'required';
  permissions: ['system:audit'];
  audit: true;
}

/**
 * PUT /api/v1/audit/incidents/:incidentId/status
 * Update incident status
 */
export interface UpdateIncidentStatusEndpoint {
  method: 'PUT';
  path: '/api/v1/audit/incidents/:incidentId/status';
  headers: { Authorization: 'Bearer <token>' };
  params: { incidentId: string };
  body: {
    status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
    notes?: string;
    resolution?: string;
  };
  response: ApiResponse<SecurityIncident>;
  description: 'Update security incident status';
  auth: 'required';
  permissions: ['system:audit'];
  audit: true;
}

// =============================================================================
// ACCESS REVIEWS
// =============================================================================

/**
 * GET /api/v1/audit/access-reviews
 * List access review campaigns
 */
export interface ListAccessReviewsEndpoint {
  method: 'GET';
  path: '/api/v1/audit/access-reviews';
  headers: { Authorization: 'Bearer <token>' };
  query?: PaginationQuery & {
    organizationId?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'overdue';
    reviewType?: 'quarterly' | 'annual' | 'ad_hoc';
  };
  response: ApiResponse<AccessReviewCampaign[]>;
  description: 'List access review campaigns';
  auth: 'required';
  permissions: ['system:audit'];
  audit: false;
}

/**
 * POST /api/v1/audit/access-reviews
 * Create access review campaign
 */
export interface CreateAccessReviewEndpoint {
  method: 'POST';
  path: '/api/v1/audit/access-reviews';
  headers: { Authorization: 'Bearer <token>' };
  body: {
    name: string;
    description?: string;
    organizationId?: string; // null for all organizations
    reviewType: 'quarterly' | 'annual' | 'ad_hoc';
    scope: {
      includeUsers?: boolean;
      includeTechnicianAccess?: boolean;
      includeOrganizationSettings?: boolean;
      includeSSO?: boolean;
    };
    reviewers: string[]; // User IDs
    dueDate: string;
    autoReminders?: boolean;
  };
  response: ApiResponse<AccessReviewCampaign>;
  description: 'Create new access review campaign';
  auth: 'required';
  permissions: ['system:audit'];
  audit: true;
}

/**
 * GET /api/v1/audit/access-reviews/:reviewId/items
 * Get access review items
 */
export interface GetAccessReviewItemsEndpoint {
  method: 'GET';
  path: '/api/v1/audit/access-reviews/:reviewId/items';
  headers: { Authorization: 'Bearer <token>' };
  params: { reviewId: string };
  query?: PaginationQuery & {
    status?: 'pending' | 'approved' | 'rejected' | 'needs_attention';
    itemType?: 'user_access' | 'technician_access' | 'organization_setting';
  };
  response: ApiResponse<AccessReviewItem[]>;
  description: 'Get items in access review campaign';
  auth: 'required';
  permissions: ['system:audit'];
  audit: false;
}

/**
 * POST /api/v1/audit/access-reviews/:reviewId/items/:itemId/decision
 * Make access review decision
 */
export interface MakeAccessReviewDecisionEndpoint {
  method: 'POST';
  path: '/api/v1/audit/access-reviews/:reviewId/items/:itemId/decision';
  headers: { Authorization: 'Bearer <token>' };
  params: { reviewId: string; itemId: string };
  body: {
    decision: 'approve' | 'reject' | 'modify' | 'needs_attention';
    notes?: string;
    modifications?: Record<string, any>;
    followUpRequired?: boolean;
  };
  response: ApiResponse<AccessReviewItem>;
  description: 'Make decision on access review item';
  auth: 'required';
  permissions: ['system:audit'];
  audit: true;
}

// =============================================================================
// ACTIVITY MONITORING
// =============================================================================

/**
 * GET /api/v1/audit/activity/real-time
 * Get real-time activity feed
 */
export interface GetRealTimeActivityEndpoint {
  method: 'GET';
  path: '/api/v1/audit/activity/real-time';
  headers: { Authorization: 'Bearer <token>' };
  query?: {
    organizationId?: string;
    riskLevel?: 'medium' | 'high' | 'critical'; // Only show above threshold
    limit?: number;
  };
  response: ApiResponse<{
    activities: AuditLog[];
    alerts: ActivityAlert[];
    summary: {
      totalActivities: number;
      highRiskActivities: number;
      activeUsers: number;
      activeSessions: number;
    };
  }>;
  description: 'Get real-time security activity feed';
  auth: 'required';
  permissions: ['system:monitor'];
  audit: false;
}

/**
 * GET /api/v1/audit/activity/anomalies
 * Detect activity anomalies
 */
export interface GetActivityAnomaliesEndpoint {
  method: 'GET';
  path: '/api/v1/audit/activity/anomalies';
  headers: { Authorization: 'Bearer <token>' };
  query?: {
    organizationId?: string;
    timeframe?: 'hour' | 'day' | 'week';
    severity?: 'medium' | 'high' | 'critical';
  };
  response: ApiResponse<ActivityAnomaly[]>;
  description: 'Detect and list activity anomalies using ML';
  auth: 'required';
  permissions: ['system:monitor'];
  audit: false;
}

// =============================================================================
// SYSTEM MONITORING
// =============================================================================

/**
 * GET /api/v1/audit/system/health
 * Get system health metrics
 */
export interface GetSystemHealthEndpoint {
  method: 'GET';
  path: '/api/v1/audit/system/health';
  headers: { Authorization: 'Bearer <token>' };
  response: ApiResponse<SystemHealthMetrics>;
  description: 'Get overall system health and security metrics';
  auth: 'required';
  permissions: ['system:monitor'];
  audit: false;
}

/**
 * GET /api/v1/audit/system/metrics
 * Get system performance metrics
 */
export interface GetSystemMetricsEndpoint {
  method: 'GET';
  path: '/api/v1/audit/system/metrics';
  headers: { Authorization: 'Bearer <token>' };
  query?: {
    metric?: 'api_response_time' | 'db_query_time' | 'login_rate' | 'error_rate';
    period?: 'hour' | 'day' | 'week' | 'month';
    organizationId?: string;
  };
  response: ApiResponse<SystemMetric[]>;
  description: 'Get system performance and usage metrics';
  auth: 'required';
  permissions: ['system:monitor'];
  audit: false;
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ComplianceSummary {
  organizationId?: string;
  framework?: string;
  period: {
    startDate: string;
    endDate: string;
  };
  overallScore: number; // 0-100
  requirements: {
    total: number;
    met: number;
    partial: number;
    notMet: number;
  };
  violations: {
    total: number;
    resolved: number;
    open: number;
    bySeverity: Record<string, number>;
  };
  trends: Array<{
    date: string;
    score: number;
    violations: number;
  }>;
  lastAuditDate?: string;
  nextAuditDue?: string;
}

export interface ComplianceViolation {
  id: string;
  organizationId: string;
  framework: string;
  requirement: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'resolved' | 'investigating';
  description: string;
  evidence: AuditLog[];
  discoveredAt: string;
  resolvedAt?: string;
  assignedTo?: string;
  remediation?: string;
}

export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  category: string;
  organizationId: string;
  reportedBy: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  affectedSystems: string[];
  discoveryMethod: 'automated' | 'manual' | 'reported';
}

export interface IncidentTimelineEntry {
  id: string;
  incidentId: string;
  timestamp: string;
  action: string;
  description: string;
  performedBy: string;
  metadata: Record<string, any>;
}

export interface IncidentImpact {
  affectedUsers: number;
  dataCompromised: boolean;
  systemsDown: string[];
  estimatedCost?: number;
  reputationImpact: 'none' | 'low' | 'medium' | 'high';
  regulatoryImplications: string[];
}

export interface AccessReviewCampaign {
  id: string;
  name: string;
  description?: string;
  organizationId?: string;
  reviewType: 'quarterly' | 'annual' | 'ad_hoc';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  scope: Record<string, boolean>;
  reviewers: string[];
  createdAt: string;
  dueDate: string;
  completedAt?: string;
  progress: {
    totalItems: number;
    reviewedItems: number;
    approvedItems: number;
    rejectedItems: number;
  };
}

export interface AccessReviewItem {
  id: string;
  reviewId: string;
  itemType: 'user_access' | 'technician_access' | 'organization_setting';
  resourceId: string;
  resourceDescription: string;
  currentState: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastUsed?: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_attention';
  reviewedBy?: string;
  reviewedAt?: string;
  decision?: string;
  notes?: string;
}

export interface ActivityAlert {
  id: string;
  type: 'suspicious_activity' | 'policy_violation' | 'security_risk' | 'compliance_issue';
  severity: 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  organizationId?: string;
  userId?: string;
  timestamp: string;
  acknowledged: boolean;
  relatedLogIds: string[];
}

export interface ActivityAnomaly {
  id: string;
  type: 'login_pattern' | 'access_pattern' | 'data_volume' | 'time_pattern' | 'location_pattern';
  description: string;
  severity: 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  organizationId?: string;
  userId?: string;
  detectedAt: string;
  evidence: {
    baseline: Record<string, any>;
    observed: Record<string, any>;
    deviation: number;
  };
  relatedActivities: string[]; // Audit log IDs
}

export interface SystemHealthMetrics {
  overall: 'healthy' | 'warning' | 'critical';
  uptime: number; // percentage
  responseTime: {
    average: number; // milliseconds
    p95: number;
    p99: number;
  };
  errorRate: number; // percentage
  activeUsers: number;
  activeSessions: number;
  securityAlerts: {
    open: number;
    critical: number;
  };
  systemLoad: {
    cpu: number; // percentage
    memory: number; // percentage
    storage: number; // percentage
  };
  lastUpdated: string;
}

export interface SystemMetric {
  timestamp: string;
  metric: string;
  value: number;
  unit: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}