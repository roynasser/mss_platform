// =============================================================================
// SECURITY REPORTS & DASHBOARD ENDPOINTS
// =============================================================================

import { ApiResponse, PaginationQuery } from '../types/common';
import {
  SecurityReport,
  CreateReportRequest,
  UpdateReportRequest,
  ReportQuery,
  ReportApprovalRequest,
  BulkReportAction,
  GenerateReportRequest,
  ReportTemplate,
  DashboardData,
  ExportReportRequest,
  ExportResponse,
} from '../types/reports';

/**
 * Security Reports & Dashboard Endpoints
 * Base URL: /api/v1/reports
 */

// =============================================================================
// SECURITY REPORTS CRUD
// =============================================================================

/**
 * GET /api/v1/reports
 * List security reports
 */
export interface ListReportsEndpoint {
  method: 'GET';
  path: '/api/v1/reports';
  headers: { Authorization: 'Bearer <token>' };
  query?: ReportQuery;
  response: ApiResponse<SecurityReport[]>;
  description: 'List security reports (filtered by user organization unless MSS Provider)';
  auth: 'required';
  permissions: ['reports:read'];
  audit: false;
}

/**
 * GET /api/v1/reports/:reportId
 * Get security report details
 */
export interface GetReportEndpoint {
  method: 'GET';
  path: '/api/v1/reports/:reportId';
  headers: { Authorization: 'Bearer <token>' };
  params: { reportId: string };
  response: ApiResponse<SecurityReport>;
  description: 'Get detailed security report';
  auth: 'required';
  permissions: ['reports:read'];
  audit: true; // Log report access for compliance
}

/**
 * POST /api/v1/reports
 * Create security report (MSS Provider only)
 */
export interface CreateReportEndpoint {
  method: 'POST';
  path: '/api/v1/reports';
  headers: { Authorization: 'Bearer <token>' };
  body: CreateReportRequest;
  response: ApiResponse<SecurityReport>;
  description: 'Create new security report';
  auth: 'required';
  permissions: ['reports:create'];
  audit: true;
}

/**
 * PUT /api/v1/reports/:reportId
 * Update security report
 */
export interface UpdateReportEndpoint {
  method: 'PUT';
  path: '/api/v1/reports/:reportId';
  headers: { Authorization: 'Bearer <token>' };
  params: { reportId: string };
  body: UpdateReportRequest;
  response: ApiResponse<SecurityReport>;
  description: 'Update security report';
  auth: 'required';
  permissions: ['reports:create'];
  audit: true;
}

/**
 * DELETE /api/v1/reports/:reportId
 * Delete security report
 */
export interface DeleteReportEndpoint {
  method: 'DELETE';
  path: '/api/v1/reports/:reportId';
  headers: { Authorization: 'Bearer <token>' };
  params: { reportId: string };
  response: ApiResponse<void>;
  description: 'Delete security report';
  auth: 'required';
  permissions: ['reports:create'];
  audit: true;
}

// =============================================================================
// REPORT WORKFLOW MANAGEMENT
// =============================================================================

/**
 * POST /api/v1/reports/:reportId/approve
 * Approve/reject security report
 */
export interface ApproveReportEndpoint {
  method: 'POST';
  path: '/api/v1/reports/:reportId/approve';
  headers: { Authorization: 'Bearer <token>' };
  params: { reportId: string };
  body: ReportApprovalRequest;
  response: ApiResponse<SecurityReport>;
  description: 'Approve or reject security report for publication';
  auth: 'required';
  permissions: ['reports:approve'];
  audit: true;
}

/**
 * POST /api/v1/reports/:reportId/publish
 * Publish approved report
 */
export interface PublishReportEndpoint {
  method: 'POST';
  path: '/api/v1/reports/:reportId/publish';
  headers: { Authorization: 'Bearer <token>' };
  params: { reportId: string };
  body?: { notifyCustomer?: boolean };
  response: ApiResponse<SecurityReport>;
  description: 'Publish approved security report';
  auth: 'required';
  permissions: ['reports:publish'];
  audit: true;
}

/**
 * POST /api/v1/reports/:reportId/archive
 * Archive published report
 */
export interface ArchiveReportEndpoint {
  method: 'POST';
  path: '/api/v1/reports/:reportId/archive';
  headers: { Authorization: 'Bearer <token>' };
  params: { reportId: string };
  body?: { reason?: string };
  response: ApiResponse<SecurityReport>;
  description: 'Archive security report';
  auth: 'required';
  permissions: ['reports:create'];
  audit: true;
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

/**
 * POST /api/v1/reports/generate
 * Generate security report
 */
export interface GenerateReportEndpoint {
  method: 'POST';
  path: '/api/v1/reports/generate';
  headers: { Authorization: 'Bearer <token>' };
  body: GenerateReportRequest;
  response: ApiResponse<{
    reportId: string;
    status: 'generating' | 'completed' | 'failed';
    estimatedCompletion?: string;
  }>;
  description: 'Generate security report from data sources';
  auth: 'required';
  permissions: ['reports:create'];
  rateLimit: '10 requests per hour per organization';
  audit: true;
}

/**
 * GET /api/v1/reports/generation/:jobId
 * Check report generation status
 */
export interface CheckGenerationStatusEndpoint {
  method: 'GET';
  path: '/api/v1/reports/generation/:jobId';
  headers: { Authorization: 'Bearer <token>' };
  params: { jobId: string };
  response: ApiResponse<{
    jobId: string;
    status: 'pending' | 'generating' | 'completed' | 'failed';
    progress?: number; // 0-100
    reportId?: string;
    error?: string;
    estimatedCompletion?: string;
  }>;
  description: 'Check status of report generation job';
  auth: 'required';
  permissions: ['reports:create'];
  audit: false;
}

// =============================================================================
// REPORT TEMPLATES
// =============================================================================

/**
 * GET /api/v1/reports/templates
 * List report templates
 */
export interface ListReportTemplatesEndpoint {
  method: 'GET';
  path: '/api/v1/reports/templates';
  headers: { Authorization: 'Bearer <token>' };
  query?: {
    reportType?: string;
    page?: number;
    limit?: number;
  };
  response: ApiResponse<ReportTemplate[]>;
  description: 'List available report templates';
  auth: 'required';
  permissions: ['reports:read'];
  audit: false;
}

/**
 * GET /api/v1/reports/templates/:templateId
 * Get report template
 */
export interface GetReportTemplateEndpoint {
  method: 'GET';
  path: '/api/v1/reports/templates/:templateId';
  headers: { Authorization: 'Bearer <token>' };
  params: { templateId: string };
  response: ApiResponse<ReportTemplate>;
  description: 'Get report template details';
  auth: 'required';
  permissions: ['reports:read'];
  audit: false;
}

/**
 * POST /api/v1/reports/templates
 * Create report template (MSS Provider only)
 */
export interface CreateReportTemplateEndpoint {
  method: 'POST';
  path: '/api/v1/reports/templates';
  headers: { Authorization: 'Bearer <token>' };
  body: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>;
  response: ApiResponse<ReportTemplate>;
  description: 'Create new report template';
  auth: 'required';
  permissions: ['system:configure'];
  audit: true;
}

// =============================================================================
// REPORT EXPORT & DOWNLOAD
// =============================================================================

/**
 * POST /api/v1/reports/:reportId/export
 * Export security report
 */
export interface ExportReportEndpoint {
  method: 'POST';
  path: '/api/v1/reports/:reportId/export';
  headers: { Authorization: 'Bearer <token>' };
  params: { reportId: string };
  body: ExportReportRequest;
  response: ApiResponse<ExportResponse>;
  description: 'Export security report in specified format';
  auth: 'required';
  permissions: ['reports:download'];
  rateLimit: '20 requests per hour per user';
  audit: true;
}

/**
 * GET /api/v1/reports/:reportId/download/:format
 * Quick download report in format
 */
export interface DownloadReportEndpoint {
  method: 'GET';
  path: '/api/v1/reports/:reportId/download/:format';
  headers: { Authorization: 'Bearer <token>' };
  params: { reportId: string; format: 'pdf' | 'excel' | 'csv' };
  response: 'File download (binary)';
  description: 'Download security report in specified format';
  auth: 'required';
  permissions: ['reports:download'];
  rateLimit: '30 requests per hour per user';
  audit: true;
}

// =============================================================================
// CUSTOMER DASHBOARD
// =============================================================================

/**
 * GET /api/v1/dashboard
 * Get customer dashboard data
 */
export interface GetDashboardEndpoint {
  method: 'GET';
  path: '/api/v1/dashboard';
  headers: { Authorization: 'Bearer <token>' };
  query?: {
    period?: 'week' | 'month' | 'quarter' | 'year';
    includeAlerts?: boolean;
    includeActivity?: boolean;
  };
  response: ApiResponse<DashboardData>;
  description: 'Get comprehensive dashboard data for customer';
  auth: 'required';
  permissions: ['dashboard:view'];
  audit: false;
}

/**
 * GET /api/v1/dashboard/metrics
 * Get dashboard metrics only
 */
export interface GetDashboardMetricsEndpoint {
  method: 'GET';
  path: '/api/v1/dashboard/metrics';
  headers: { Authorization: 'Bearer <token>' };
  query?: {
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    metrics?: string[]; // Specific metrics to fetch
  };
  response: ApiResponse<{
    securityMetrics: any;
    trends: any[];
    comparisonData?: any;
  }>;
  description: 'Get specific dashboard metrics';
  auth: 'required';
  permissions: ['dashboard:view'];
  audit: false;
}

/**
 * GET /api/v1/dashboard/alerts
 * Get security alerts
 */
export interface GetSecurityAlertsEndpoint {
  method: 'GET';
  path: '/api/v1/dashboard/alerts';
  headers: { Authorization: 'Bearer <token>' };
  query?: PaginationQuery & {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    type?: string;
    acknowledged?: boolean;
  };
  response: ApiResponse<SecurityAlert[]>;
  description: 'Get security alerts for organization';
  auth: 'required';
  permissions: ['dashboard:view'];
  audit: false;
}

/**
 * POST /api/v1/dashboard/alerts/:alertId/acknowledge
 * Acknowledge security alert
 */
export interface AcknowledgeAlertEndpoint {
  method: 'POST';
  path: '/api/v1/dashboard/alerts/:alertId/acknowledge';
  headers: { Authorization: 'Bearer <token>' };
  params: { alertId: string };
  body?: { notes?: string };
  response: ApiResponse<void>;
  description: 'Acknowledge a security alert';
  auth: 'required';
  permissions: ['dashboard:view'];
  audit: true;
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * POST /api/v1/reports/bulk
 * Bulk report operations
 */
export interface BulkReportOperationEndpoint {
  method: 'POST';
  path: '/api/v1/reports/bulk';
  headers: { Authorization: 'Bearer <token>' };
  body: BulkReportAction;
  response: ApiResponse<{
    success: string[]; // Report IDs
    failed: Array<{
      reportId: string;
      error: string;
    }>;
  }>;
  description: 'Perform bulk operations on security reports';
  auth: 'required';
  permissions: ['reports:create'];
  rateLimit: '5 requests per hour per user';
  audit: true;
}

// =============================================================================
// REPORT ANALYTICS
// =============================================================================

/**
 * GET /api/v1/reports/analytics
 * Get report analytics
 */
export interface GetReportAnalyticsEndpoint {
  method: 'GET';
  path: '/api/v1/reports/analytics';
  headers: { Authorization: 'Bearer <token>' };
  query?: {
    period?: 'month' | 'quarter' | 'year';
    customerOrgId?: string; // MSS Provider can specify customer
    reportType?: string;
  };
  response: ApiResponse<{
    totalReports: number;
    reportsByType: Record<string, number>;
    reportsBySeverity: Record<string, number>;
    reportsByStatus: Record<string, number>;
    averageResolutionTime: number;
    trends: Array<{
      period: string;
      reportsGenerated: number;
      averageSeverity: number;
    }>;
    topFindings: Array<{
      finding: string;
      count: number;
      trend: 'up' | 'down' | 'stable';
    }>;
  }>;
  description: 'Get analytics for security reports';
  auth: 'required';
  permissions: ['reports:read'];
  audit: false;
}

// =============================================================================
// REPORT COMMENTS & COLLABORATION
// =============================================================================

/**
 * GET /api/v1/reports/:reportId/comments
 * Get report comments
 */
export interface GetReportCommentsEndpoint {
  method: 'GET';
  path: '/api/v1/reports/:reportId/comments';
  headers: { Authorization: 'Bearer <token>' };
  params: { reportId: string };
  query?: PaginationQuery;
  response: ApiResponse<ReportComment[]>;
  description: 'Get comments on security report';
  auth: 'required';
  permissions: ['reports:read'];
  audit: false;
}

/**
 * POST /api/v1/reports/:reportId/comments
 * Add report comment
 */
export interface AddReportCommentEndpoint {
  method: 'POST';
  path: '/api/v1/reports/:reportId/comments';
  headers: { Authorization: 'Bearer <token>' };
  params: { reportId: string };
  body: {
    content: string;
    isInternal?: boolean; // Internal to MSS Provider
  };
  response: ApiResponse<ReportComment>;
  description: 'Add comment to security report';
  auth: 'required';
  permissions: ['reports:read'];
  audit: true;
}

export interface ReportComment {
  id: string;
  reportId: string;
  authorId: string;
  authorName: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}