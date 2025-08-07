// =============================================================================
// SECURITY REPORTS TYPES
// =============================================================================

import { PaginationQuery, DateRangeFilter } from './common';

export type ReportType = 
  | 'vulnerability_assessment'
  | 'incident_report'
  | 'compliance_dashboard'
  | 'threat_analysis'
  | 'custom';

export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ReportStatus = 
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'published'
  | 'archived';

export interface SecurityReport {
  id: string;
  customerOrgId: string;
  reportType: ReportType;
  title: string;
  description?: string;
  severity?: ReportSeverity;
  status: ReportStatus;
  reportData: ReportData;
  fileAttachments: string[];
  reportPeriodStart?: string;
  reportPeriodEnd?: string;
  generatedAt: string;
  publishedAt?: string;
  generatedBy?: string;
  approvedBy?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportData {
  // Common report structure
  summary: ReportSummary;
  sections: ReportSection[];
  metrics: ReportMetric[];
  recommendations?: Recommendation[];
  attachments?: Attachment[];
  metadata?: Record<string, any>;
}

export interface ReportSummary {
  totalFindings: number;
  criticalIssues: number;
  highRiskIssues: number;
  mediumRiskIssues: number;
  lowRiskIssues: number;
  resolvedIssues: number;
  overallRiskScore: number;
  executiveSummary: string;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
  type: 'text' | 'chart' | 'table' | 'list';
  data?: any; // Section-specific data
}

export interface ReportMetric {
  name: string;
  value: number;
  unit: string;
  category: string;
  trend?: 'up' | 'down' | 'stable';
  previousValue?: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: ReportSeverity;
  category: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  dueDate?: string;
}

export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
  description?: string;
}

// =============================================================================
// REQUEST & RESPONSE TYPES
// =============================================================================

export interface CreateReportRequest {
  customerOrgId: string;
  reportType: ReportType;
  title: string;
  description?: string;
  severity?: ReportSeverity;
  reportData: Partial<ReportData>;
  reportPeriodStart?: string;
  reportPeriodEnd?: string;
  tags?: string[];
}

export interface UpdateReportRequest {
  title?: string;
  description?: string;
  severity?: ReportSeverity;
  reportData?: Partial<ReportData>;
  status?: ReportStatus;
  reportPeriodStart?: string;
  reportPeriodEnd?: string;
  tags?: string[];
}

export interface ReportQuery extends PaginationQuery {
  customerOrgId?: string;
  reportType?: ReportType;
  severity?: ReportSeverity;
  status?: ReportStatus;
  generatedBy?: string;
  tags?: string[];
  dateRange?: DateRangeFilter;
  search?: string;
}

export interface ReportApprovalRequest {
  approved: boolean;
  notes?: string;
}

export interface BulkReportAction {
  reportIds: string[];
  action: 'approve' | 'publish' | 'archive' | 'delete';
  notes?: string;
}

// =============================================================================
// REPORT GENERATION TYPES
// =============================================================================

export interface GenerateReportRequest {
  customerOrgId: string;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  includeRecommendations: boolean;
  includeMetrics: boolean;
  customSections?: string[];
  templateId?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  reportType: ReportType;
  description: string;
  sections: TemplateSectionConfig[];
  defaultMetrics: string[];
  customizable: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateSectionConfig {
  sectionType: string;
  title: string;
  required: boolean;
  order: number;
  configuration: Record<string, any>;
}

// =============================================================================
// DASHBOARD ANALYTICS TYPES
// =============================================================================

export interface DashboardData {
  organization: OrganizationSummary;
  securityMetrics: SecurityMetrics;
  recentReports: SecurityReport[];
  recentActivity: ActivityItem[];
  alerts: SecurityAlert[];
  trends: TrendData[];
}

export interface OrganizationSummary {
  id: string;
  name: string;
  totalUsers: number;
  activeUsers: number;
  lastReportDate?: string;
  complianceScore: number;
  riskLevel: ReportSeverity;
}

export interface SecurityMetrics {
  overallRiskScore: number;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  incidents: {
    open: number;
    resolved: number;
    total: number;
  };
  compliance: {
    score: number;
    frameworks: FrameworkCompliance[];
  };
  trends: {
    riskTrend: 'improving' | 'declining' | 'stable';
    vulnerabilityTrend: 'improving' | 'declining' | 'stable';
  };
}

export interface FrameworkCompliance {
  framework: string;
  score: number;
  requirements: {
    total: number;
    met: number;
    partial: number;
    notMet: number;
  };
}

export interface ActivityItem {
  id: string;
  type: 'report_generated' | 'incident_reported' | 'vulnerability_found' | 'compliance_check';
  title: string;
  description: string;
  severity?: ReportSeverity;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SecurityAlert {
  id: string;
  type: 'vulnerability' | 'incident' | 'compliance' | 'system';
  severity: ReportSeverity;
  title: string;
  description: string;
  actionRequired: boolean;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface TrendData {
  metric: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  data: TrendDataPoint[];
}

export interface TrendDataPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json';

export interface ExportReportRequest {
  reportId: string;
  format: ExportFormat;
  includeSections?: string[];
  includeAttachments?: boolean;
  customization?: ExportCustomization;
}

export interface ExportCustomization {
  includeCharts: boolean;
  includeRawData: boolean;
  watermark?: string;
  headerFooter?: {
    header?: string;
    footer?: string;
  };
}

export interface ExportResponse {
  downloadUrl: string;
  filename: string;
  contentType: string;
  size: number;
  expiresAt: string;
}