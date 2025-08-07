// =============================================================================
// INTERVENTION REQUESTS TYPES
// =============================================================================

import { PaginationQuery, DateRangeFilter } from './common';

export type InterventionRequestType = 
  | 'incident_response'
  | 'vulnerability_remediation'
  | 'security_assessment'
  | 'configuration_review'
  | 'custom';

export type InterventionPriority = 'low' | 'medium' | 'high' | 'emergency';

export type InterventionStatus = 
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export interface InterventionRequest {
  id: string;
  customerOrgId: string;
  requestedBy: string;
  title: string;
  description: string;
  requestType: InterventionRequestType;
  priority: InterventionPriority;
  assignedTo?: string;
  assignedAt?: string;
  assignedBy?: string;
  status: InterventionStatus;
  estimatedCompletion?: string;
  completedAt?: string;
  requestData: InterventionRequestData;
  attachments: string[];
  internalNotes?: string;
  customerNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterventionRequestData {
  affectedSystems?: string[];
  urgencyReason?: string;
  businessImpact?: string;
  technicalDetails?: Record<string, any>;
  requirementsChecklist?: RequirementItem[];
  customFields?: Record<string, any>;
}

export interface RequirementItem {
  id: string;
  description: string;
  required: boolean;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

// =============================================================================
// REQUEST & RESPONSE TYPES
// =============================================================================

export interface CreateInterventionRequest {
  title: string;
  description: string;
  requestType: InterventionRequestType;
  priority: InterventionPriority;
  requestData?: Partial<InterventionRequestData>;
  attachments?: string[];
}

export interface UpdateInterventionRequest {
  title?: string;
  description?: string;
  priority?: InterventionPriority;
  requestData?: Partial<InterventionRequestData>;
  attachments?: string[];
  customerNotes?: string;
}

export interface AssignInterventionRequest {
  assignedTo: string;
  estimatedCompletion?: string;
  notes?: string;
}

export interface UpdateInterventionStatus {
  status: InterventionStatus;
  notes?: string;
  estimatedCompletion?: string;
  internalNotes?: string;
}

export interface InterventionQuery extends PaginationQuery {
  customerOrgId?: string;
  requestedBy?: string;
  assignedTo?: string;
  requestType?: InterventionRequestType;
  priority?: InterventionPriority;
  status?: InterventionStatus;
  dateRange?: DateRangeFilter;
  search?: string;
}

// =============================================================================
// INTERVENTION TRACKING TYPES
// =============================================================================

export interface InterventionProgress {
  requestId: string;
  milestones: ProgressMilestone[];
  timeSpent: number; // minutes
  estimatedTimeRemaining?: number; // minutes
  completionPercentage: number;
  lastUpdate: string;
  nextUpdate?: string;
}

export interface ProgressMilestone {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  completedAt?: string;
  order: number;
  required: boolean;
  blockedReason?: string;
}

export interface TimeEntry {
  id: string;
  interventionId: string;
  technicianId: string;
  startTime: string;
  endTime?: string;
  duration?: number; // minutes
  description: string;
  billable: boolean;
  category: 'analysis' | 'implementation' | 'testing' | 'documentation' | 'communication';
}

export interface CreateTimeEntryRequest {
  startTime: string;
  endTime?: string;
  description: string;
  category: TimeEntry['category'];
  billable?: boolean;
}

// =============================================================================
// COMMUNICATION TYPES
// =============================================================================

export interface InterventionComment {
  id: string;
  interventionId: string;
  authorId: string;
  content: string;
  isInternal: boolean; // Internal notes vs customer-visible
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  content: string;
  isInternal: boolean;
  attachments?: string[];
}

export interface InterventionStatusUpdate {
  id: string;
  interventionId: string;
  previousStatus: InterventionStatus;
  newStatus: InterventionStatus;
  reason?: string;
  updatedBy: string;
  timestamp: string;
  notifyCustomer: boolean;
}

// =============================================================================
// ESCALATION TYPES
// =============================================================================

export interface EscalationRule {
  id: string;
  customerOrgId: string;
  priority: InterventionPriority;
  escalationTimeHours: number;
  escalateTo: string[];
  notificationMethods: ('email' | 'sms' | 'webhook')[];
  conditions?: Record<string, any>;
  active: boolean;
}

export interface EscalationEvent {
  id: string;
  interventionId: string;
  ruleId: string;
  triggeredAt: string;
  escalatedTo: string[];
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedAt?: string;
}

// =============================================================================
// SLA TYPES
// =============================================================================

export interface SLAMetrics {
  interventionId: string;
  responseTime: number; // minutes from creation to assignment
  resolutionTime?: number; // minutes from creation to completion
  firstResponseSLA: number; // SLA target in minutes
  resolutionSLA: number; // SLA target in minutes
  responseTimeMet: boolean;
  resolutionTimeMet?: boolean;
  breachReason?: string;
}

export interface SLATarget {
  priority: InterventionPriority;
  responseTimeMinutes: number;
  resolutionTimeHours: number;
  businessHoursOnly: boolean;
}

// =============================================================================
// BULK OPERATIONS TYPES
// =============================================================================

export interface BulkInterventionAction {
  interventionIds: string[];
  action: 'assign' | 'update_priority' | 'update_status' | 'add_comment';
  actionData: Record<string, any>;
}

export interface BulkActionResult {
  success: string[]; // IDs of successfully processed interventions
  failed: BulkActionError[]; // Failed interventions with error details
}

export interface BulkActionError {
  interventionId: string;
  error: string;
  details?: Record<string, any>;
}

// =============================================================================
// REPORTING TYPES
// =============================================================================

export interface InterventionReport {
  organizationId: string;
  period: {
    start: string;
    end: string;
  };
  metrics: InterventionMetrics;
  trends: InterventionTrend[];
  topIssues: IssueCategory[];
}

export interface InterventionMetrics {
  totalRequests: number;
  completedRequests: number;
  averageResponseTime: number; // minutes
  averageResolutionTime: number; // minutes
  slaCompliance: {
    response: number; // percentage
    resolution: number; // percentage
  };
  byPriority: Record<InterventionPriority, number>;
  byStatus: Record<InterventionStatus, number>;
  byType: Record<InterventionRequestType, number>;
}

export interface InterventionTrend {
  period: string;
  totalRequests: number;
  completedRequests: number;
  averageResolutionTime: number;
  slaCompliance: number;
}

export interface IssueCategory {
  category: string;
  count: number;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}