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

// Dashboard and Analytics Types
export interface DashboardOverview {
  period: {
    days: number;
    startDate: Date;
    endDate: Date;
  };
  securityScore: number;
  securityMetrics: SecurityMetrics;
  alertStats: AlertStatistics;
  interventionStats: InterventionStatistics;
  complianceStatus: ComplianceStatus;
  trendData: TrendData[];
  lastUpdated: string;
}

export interface SecurityMetrics {
  score: number;
  breakdown: {
    criticalAlerts: number;
    highAlerts: number;
    totalAlerts: number;
    resolvedAlerts: number;
    resolutionRate: number;
  };
  factors: SecurityFactor[];
  recommendations: string[];
}

export interface SecurityFactor {
  name: string;
  impact: number;
  count?: number;
  rate?: string;
}

export interface AlertStatistics {
  total: number;
  bySeverity: {
    critical: number;
    high: number;
    warning: number;
    info: number;
  };
  resolved: number;
  unread: number;
  averageResolutionHours: string;
}

export interface InterventionStatistics {
  total: number;
  completed: number;
  inProgress: number;
  emergency: number;
  highPriority: number;
  onTime: number;
  slaCompliance: number;
  averageCompletionHours: string;
}

export interface ComplianceStatus {
  overallScore: number;
  frameworks: ComplianceFramework[];
  summary: {
    compliant: number;
    inProgress: number;
    nonCompliant: number;
  };
}

export interface ComplianceFramework {
  name: string;
  status: 'compliant' | 'in_progress' | 'non_compliant';
  score: number;
  lastAssessment: string;
  nextDue: string;
  controls: {
    total: number;
    implemented: number;
    exceptions: number;
  };
}

export interface TrendData {
  date: string;
  alerts: number;
  highSeverityAlerts: number;
}

// Enhanced Report Types
export interface DetailedSecurityReport extends SecurityReport {
  customerOrgId: string;
  customerName: string;
  reportData: any;
  fileAttachments: string[];
  reportPeriodStart?: Date;
  reportPeriodEnd?: Date;
  generatedAt: Date;
  publishedAt?: Date;
  generatedBy?: {
    name: string;
    email: string;
  };
  approvedBy?: {
    name: string;
    email: string;
  };
  tags: string[];
  contextualData?: {
    totalAlerts: number;
    criticalAlerts: number;
    highAlerts: number;
  };
}

// Enhanced Intervention Types
export interface DetailedIntervention extends Intervention {
  customerOrgId: string;
  customerName: string;
  requestedBy: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  assignedBy?: {
    name: string;
  };
  slaStatus: 'on_track' | 'at_risk' | 'overdue' | 'met';
  requestData: any;
  attachments: string[];
  internalNotes?: string;
  customerNotes?: string;
  assignedAt?: Date;
}

// Analytics Types
export interface AnalyticsOverview {
  period: {
    days: number;
    startDate: Date;
    endDate: Date;
  };
  securityTrends: any;
  alertAnalytics: AlertAnalytics;
  interventionAnalytics: InterventionAnalytics;
  complianceAnalytics: any;
  performanceMetrics: PerformanceMetrics;
  predictions?: PredictiveAnalytics;
  generatedAt: string;
}

export interface AlertAnalytics {
  byType: Record<string, { count: number; resolved: number }>;
  bySeverity: Record<string, { count: number; resolved: number }>;
  bySource: Record<string, { count: number; resolved: number }>;
  patterns: any[];
  resolutionMetrics: {
    averageResolutionTime: string;
    totalResolved: number;
    resolutionRate: number;
  };
}

export interface InterventionAnalytics {
  byType: Record<string, { count: number; completed: number }>;
  byPriority: Record<string, { count: number; completed: number }>;
  byStatus: Record<string, { count: number }>;
  slaMetrics: {
    totalCompleted: number;
    onTimeCompletions: number;
    slaCompliance: number;
    averageCompletionTime: string;
  };
}

export interface PerformanceMetrics {
  meanTimeToDetect: string;
  meanTimeToRespond: string;
  totalIncidents: number;
  criticalIncidents: number;
  incidentRate: string;
}

export interface PredictiveAnalytics {
  predictions: PredictionPoint[];
  confidence: 'low' | 'medium' | 'high';
  methodology: string;
  baselinePeriod?: string;
  factors?: string[];
  message?: string;
}

export interface PredictionPoint {
  date: string;
  predictedAlerts: number;
  predictedCritical: number;
  confidence: number;
}

// Export format types
export type ExportFormat = 'json' | 'csv' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  customFields?: string[];
}