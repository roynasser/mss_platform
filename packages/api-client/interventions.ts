// =============================================================================
// INTERVENTION REQUESTS ENDPOINTS
// =============================================================================

import { ApiResponse, PaginationQuery } from '../types/common';
import {
  InterventionRequest,
  CreateInterventionRequest,
  UpdateInterventionRequest,
  AssignInterventionRequest,
  UpdateInterventionStatus,
  InterventionQuery,
  InterventionProgress,
  TimeEntry,
  CreateTimeEntryRequest,
  InterventionComment,
  CreateCommentRequest,
  BulkInterventionAction,
  BulkActionResult,
  InterventionReport,
} from '../types/interventions';

/**
 * Intervention Requests Endpoints
 * Base URL: /api/v1/interventions
 */

// =============================================================================
// INTERVENTION REQUESTS CRUD
// =============================================================================

/**
 * GET /api/v1/interventions
 * List intervention requests
 */
export interface ListInterventionsEndpoint {
  method: 'GET';
  path: '/api/v1/interventions';
  headers: { Authorization: 'Bearer <token>' };
  query?: InterventionQuery;
  response: ApiResponse<InterventionRequest[]>;
  description: 'List intervention requests (filtered by organization)';
  auth: 'required';
  permissions: ['requests:read'];
  audit: false;
}

/**
 * GET /api/v1/interventions/:interventionId
 * Get intervention request details
 */
export interface GetInterventionEndpoint {
  method: 'GET';
  path: '/api/v1/interventions/:interventionId';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string };
  response: ApiResponse<InterventionRequest>;
  description: 'Get detailed intervention request';
  auth: 'required';
  permissions: ['requests:read'];
  audit: true;
}

/**
 * POST /api/v1/interventions
 * Create intervention request
 */
export interface CreateInterventionEndpoint {
  method: 'POST';
  path: '/api/v1/interventions';
  headers: { Authorization: 'Bearer <token>' };
  body: CreateInterventionRequest;
  response: ApiResponse<InterventionRequest>;
  description: 'Create new intervention request';
  auth: 'required';
  permissions: ['requests:create'];
  audit: true;
}

/**
 * PUT /api/v1/interventions/:interventionId
 * Update intervention request
 */
export interface UpdateInterventionEndpoint {
  method: 'PUT';
  path: '/api/v1/interventions/:interventionId';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string };
  body: UpdateInterventionRequest;
  response: ApiResponse<InterventionRequest>;
  description: 'Update intervention request (customer can update own requests)';
  auth: 'required';
  permissions: ['requests:update'];
  audit: true;
}

/**
 * DELETE /api/v1/interventions/:interventionId
 * Cancel intervention request
 */
export interface CancelInterventionEndpoint {
  method: 'DELETE';
  path: '/api/v1/interventions/:interventionId';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string };
  body?: { reason?: string };
  response: ApiResponse<void>;
  description: 'Cancel intervention request';
  auth: 'required';
  permissions: ['requests:update'];
  audit: true;
}

// =============================================================================
// INTERVENTION ASSIGNMENT & STATUS MANAGEMENT
// =============================================================================

/**
 * POST /api/v1/interventions/:interventionId/assign
 * Assign intervention to technician
 */
export interface AssignInterventionEndpoint {
  method: 'POST';
  path: '/api/v1/interventions/:interventionId/assign';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string };
  body: AssignInterventionRequest;
  response: ApiResponse<InterventionRequest>;
  description: 'Assign intervention request to technician';
  auth: 'required';
  permissions: ['requests:assign'];
  audit: true;
}

/**
 * POST /api/v1/interventions/:interventionId/status
 * Update intervention status
 */
export interface UpdateInterventionStatusEndpoint {
  method: 'POST';
  path: '/api/v1/interventions/:interventionId/status';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string };
  body: UpdateInterventionStatus;
  response: ApiResponse<InterventionRequest>;
  description: 'Update intervention request status';
  auth: 'required';
  permissions: ['requests:manage'];
  audit: true;
}

/**
 * POST /api/v1/interventions/:interventionId/priority
 * Update intervention priority
 */
export interface UpdateInterventionPriorityEndpoint {
  method: 'POST';
  path: '/api/v1/interventions/:interventionId/priority';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string };
  body: {
    priority: 'low' | 'medium' | 'high' | 'emergency';
    reason?: string;
  };
  response: ApiResponse<InterventionRequest>;
  description: 'Update intervention request priority';
  auth: 'required';
  permissions: ['requests:manage'];
  audit: true;
}

// =============================================================================
// INTERVENTION PROGRESS TRACKING
// =============================================================================

/**
 * GET /api/v1/interventions/:interventionId/progress
 * Get intervention progress
 */
export interface GetInterventionProgressEndpoint {
  method: 'GET';
  path: '/api/v1/interventions/:interventionId/progress';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string };
  response: ApiResponse<InterventionProgress>;
  description: 'Get intervention progress and milestones';
  auth: 'required';
  permissions: ['requests:read'];
  audit: false;
}

/**
 * PUT /api/v1/interventions/:interventionId/progress
 * Update intervention progress
 */
export interface UpdateInterventionProgressEndpoint {
  method: 'PUT';
  path: '/api/v1/interventions/:interventionId/progress';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string };
  body: {
    completionPercentage?: number;
    milestones?: Array<{
      id: string;
      status: 'pending' | 'in_progress' | 'completed' | 'blocked';
      blockedReason?: string;
    }>;
    nextUpdate?: string;
    notes?: string;
  };
  response: ApiResponse<InterventionProgress>;
  description: 'Update intervention progress';
  auth: 'required';
  permissions: ['requests:manage'];
  audit: true;
}

// =============================================================================
// TIME TRACKING
// =============================================================================

/**
 * GET /api/v1/interventions/:interventionId/time-entries
 * Get time entries for intervention
 */
export interface GetTimeEntriesEndpoint {
  method: 'GET';
  path: '/api/v1/interventions/:interventionId/time-entries';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string };
  query?: PaginationQuery;
  response: ApiResponse<TimeEntry[]>;
  description: 'Get time entries for intervention';
  auth: 'required';
  permissions: ['requests:read'];
  audit: false;
}

/**
 * POST /api/v1/interventions/:interventionId/time-entries
 * Create time entry
 */
export interface CreateTimeEntryEndpoint {
  method: 'POST';
  path: '/api/v1/interventions/:interventionId/time-entries';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string };
  body: CreateTimeEntryRequest;
  response: ApiResponse<TimeEntry>;
  description: 'Log time spent on intervention';
  auth: 'required';
  permissions: ['requests:manage'];
  audit: true;
}

/**
 * PUT /api/v1/interventions/:interventionId/time-entries/:entryId
 * Update time entry
 */
export interface UpdateTimeEntryEndpoint {
  method: 'PUT';
  path: '/api/v1/interventions/:interventionId/time-entries/:entryId';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string; entryId: string };
  body: Partial<CreateTimeEntryRequest>;
  response: ApiResponse<TimeEntry>;
  description: 'Update time entry';
  auth: 'required';
  permissions: ['requests:manage'];
  audit: true;
}

/**
 * DELETE /api/v1/interventions/:interventionId/time-entries/:entryId
 * Delete time entry
 */
export interface DeleteTimeEntryEndpoint {
  method: 'DELETE';
  path: '/api/v1/interventions/:interventionId/time-entries/:entryId';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string; entryId: string };
  response: ApiResponse<void>;
  description: 'Delete time entry';
  auth: 'required';
  permissions: ['requests:manage'];
  audit: true;
}

// =============================================================================
// COMMENTS & COMMUNICATION
// =============================================================================

/**
 * GET /api/v1/interventions/:interventionId/comments
 * Get intervention comments
 */
export interface GetInterventionCommentsEndpoint {
  method: 'GET';
  path: '/api/v1/interventions/:interventionId/comments';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string };
  query?: PaginationQuery & {
    includeInternal?: boolean; // MSS Provider only
  };
  response: ApiResponse<InterventionComment[]>;
  description: 'Get comments on intervention request';
  auth: 'required';
  permissions: ['requests:read'];
  audit: false;
}

/**
 * POST /api/v1/interventions/:interventionId/comments
 * Add intervention comment
 */
export interface AddInterventionCommentEndpoint {
  method: 'POST';
  path: '/api/v1/interventions/:interventionId/comments';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string };
  body: CreateCommentRequest;
  response: ApiResponse<InterventionComment>;
  description: 'Add comment to intervention request';
  auth: 'required';
  permissions: ['requests:read'];
  audit: true;
}

/**
 * PUT /api/v1/interventions/:interventionId/comments/:commentId
 * Update intervention comment
 */
export interface UpdateInterventionCommentEndpoint {
  method: 'PUT';
  path: '/api/v1/interventions/:interventionId/comments/:commentId';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string; commentId: string };
  body: { content: string };
  response: ApiResponse<InterventionComment>;
  description: 'Update intervention comment (author only)';
  auth: 'required';
  permissions: ['requests:read'];
  audit: true;
}

/**
 * DELETE /api/v1/interventions/:interventionId/comments/:commentId
 * Delete intervention comment
 */
export interface DeleteInterventionCommentEndpoint {
  method: 'DELETE';
  path: '/api/v1/interventions/:interventionId/comments/:commentId';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string; commentId: string };
  response: ApiResponse<void>;
  description: 'Delete intervention comment (author only)';
  auth: 'required';
  permissions: ['requests:read'];
  audit: true;
}

// =============================================================================
// ATTACHMENTS & FILES
// =============================================================================

/**
 * POST /api/v1/interventions/:interventionId/attachments
 * Upload attachment
 */
export interface UploadAttachmentEndpoint {
  method: 'POST';
  path: '/api/v1/interventions/:interventionId/attachments';
  headers: { 
    Authorization: 'Bearer <token>';
    'Content-Type': 'multipart/form-data';
  };
  params: { interventionId: string };
  body: FormData; // File upload
  response: ApiResponse<{
    filename: string;
    size: number;
    contentType: string;
    url: string;
  }>;
  description: 'Upload file attachment to intervention';
  auth: 'required';
  permissions: ['requests:update'];
  rateLimit: '20 files per hour per user';
  audit: true;
}

/**
 * GET /api/v1/interventions/:interventionId/attachments/:filename
 * Download attachment
 */
export interface DownloadAttachmentEndpoint {
  method: 'GET';
  path: '/api/v1/interventions/:interventionId/attachments/:filename';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string; filename: string };
  response: 'File download (binary)';
  description: 'Download intervention attachment';
  auth: 'required';
  permissions: ['requests:read'];
  audit: true;
}

/**
 * DELETE /api/v1/interventions/:interventionId/attachments/:filename
 * Delete attachment
 */
export interface DeleteAttachmentEndpoint {
  method: 'DELETE';
  path: '/api/v1/interventions/:interventionId/attachments/:filename';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string; filename: string };
  response: ApiResponse<void>;
  description: 'Delete intervention attachment';
  auth: 'required';
  permissions: ['requests:update'];
  audit: true;
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * POST /api/v1/interventions/bulk
 * Bulk intervention operations
 */
export interface BulkInterventionOperationEndpoint {
  method: 'POST';
  path: '/api/v1/interventions/bulk';
  headers: { Authorization: 'Bearer <token>' };
  body: BulkInterventionAction;
  response: ApiResponse<BulkActionResult>;
  description: 'Perform bulk operations on intervention requests';
  auth: 'required';
  permissions: ['requests:manage'];
  rateLimit: '5 requests per hour per user';
  audit: true;
}

// =============================================================================
// INTERVENTION ANALYTICS & REPORTING
// =============================================================================

/**
 * GET /api/v1/interventions/analytics
 * Get intervention analytics
 */
export interface GetInterventionAnalyticsEndpoint {
  method: 'GET';
  path: '/api/v1/interventions/analytics';
  headers: { Authorization: 'Bearer <token>' };
  query?: {
    period?: 'month' | 'quarter' | 'year';
    customerOrgId?: string; // MSS Provider can specify customer
    assignedTo?: string;
    requestType?: string;
  };
  response: ApiResponse<InterventionReport>;
  description: 'Get analytics for intervention requests';
  auth: 'required';
  permissions: ['requests:read'];
  audit: false;
}

/**
 * GET /api/v1/interventions/sla-metrics
 * Get SLA compliance metrics
 */
export interface GetSLAMetricsEndpoint {
  method: 'GET';
  path: '/api/v1/interventions/sla-metrics';
  headers: { Authorization: 'Bearer <token>' };
  query?: {
    period?: 'week' | 'month' | 'quarter' | 'year';
    customerOrgId?: string;
    priority?: string;
  };
  response: ApiResponse<{
    overallCompliance: number; // percentage
    responseTimeCompliance: number; // percentage
    resolutionTimeCompliance: number; // percentage
    breachedSLAs: number;
    averageResponseTime: number; // minutes
    averageResolutionTime: number; // hours
    byPriority: Record<string, {
      compliance: number;
      averageResponseTime: number;
      averageResolutionTime: number;
    }>;
    trends: Array<{
      period: string;
      compliance: number;
      averageResponseTime: number;
    }>;
  }>;
  description: 'Get SLA compliance metrics';
  auth: 'required';
  permissions: ['requests:read'];
  audit: false;
}

// =============================================================================
// CUSTOMER-SPECIFIC ENDPOINTS
// =============================================================================

/**
 * GET /api/v1/interventions/my-requests
 * Get current user's intervention requests
 */
export interface GetMyRequestsEndpoint {
  method: 'GET';
  path: '/api/v1/interventions/my-requests';
  headers: { Authorization: 'Bearer <token>' };
  query?: PaginationQuery & {
    status?: string;
    priority?: string;
  };
  response: ApiResponse<InterventionRequest[]>;
  description: 'Get intervention requests created by current user';
  auth: 'required';
  permissions: ['requests:read'];
  audit: false;
}

/**
 * GET /api/v1/interventions/assigned-to-me
 * Get interventions assigned to current technician
 */
export interface GetAssignedRequestsEndpoint {
  method: 'GET';
  path: '/api/v1/interventions/assigned-to-me';
  headers: { Authorization: 'Bearer <token>' };
  query?: PaginationQuery & {
    status?: string;
    priority?: string;
  };
  response: ApiResponse<InterventionRequest[]>;
  description: 'Get intervention requests assigned to current technician';
  auth: 'required';
  permissions: ['requests:manage'];
  audit: false;
}

// =============================================================================
// NOTIFICATIONS & ESCALATIONS
// =============================================================================

/**
 * POST /api/v1/interventions/:interventionId/notify
 * Send notification about intervention
 */
export interface NotifyInterventionEndpoint {
  method: 'POST';
  path: '/api/v1/interventions/:interventionId/notify';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string };
  body: {
    recipients: string[]; // User IDs
    message: string;
    notificationTypes: ('email' | 'sms' | 'push')[];
  };
  response: ApiResponse<void>;
  description: 'Send notification about intervention to specified users';
  auth: 'required';
  permissions: ['requests:manage'];
  rateLimit: '10 requests per hour per user';
  audit: true;
}

/**
 * POST /api/v1/interventions/:interventionId/escalate
 * Escalate intervention
 */
export interface EscalateInterventionEndpoint {
  method: 'POST';
  path: '/api/v1/interventions/:interventionId/escalate';
  headers: { Authorization: 'Bearer <token>' };
  params: { interventionId: string };
  body: {
    reason: string;
    escalateTo?: string[]; // User IDs, if not provided uses default escalation rules
    priority?: 'high' | 'emergency';
  };
  response: ApiResponse<InterventionRequest>;
  description: 'Escalate intervention request';
  auth: 'required';
  permissions: ['requests:manage'];
  audit: true;
}