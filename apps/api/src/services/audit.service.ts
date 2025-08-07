import { getDB } from '@/database/connection';
import { AuditLog } from '@/types/auth';

export interface AuditLogEntry {
  userId?: string;
  sessionId?: string;
  organizationId?: string;
  actionType: string;
  resourceType: string;
  resourceId?: string;
  actionDescription: string;
  actionData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  complianceRelevant?: boolean;
  metadata?: Record<string, any>;
}

export interface AuditQueryFilters {
  userId?: string;
  organizationId?: string;
  actionType?: string;
  resourceType?: string;
  riskLevel?: string;
  complianceRelevant?: boolean;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalLogs: number;
  riskDistribution: Record<string, number>;
  actionTypeDistribution: Record<string, number>;
  resourceTypeDistribution: Record<string, number>;
  complianceLogs: number;
  recentActivity: number; // Last 24 hours
}

export class AuditService {
  private get db() {
    return getDB();
  }

  // ============================================================================
  // AUDIT LOGGING
  // ============================================================================

  async log(entry: AuditLogEntry): Promise<string> {
    const result = await this.db.query(`
      INSERT INTO audit_logs (
        user_id, session_id, organization_id, action_type, resource_type, resource_id,
        action_description, action_data, ip_address, user_agent, risk_level,
        compliance_relevant, metadata, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      entry.userId || null,
      entry.sessionId || null,
      entry.organizationId || null,
      entry.actionType,
      entry.resourceType,
      entry.resourceId || null,
      entry.actionDescription,
      JSON.stringify(entry.actionData || {}),
      entry.ipAddress || null,
      entry.userAgent || null,
      entry.riskLevel || 'low',
      entry.complianceRelevant !== false, // Default to true
      JSON.stringify(entry.metadata || {}),
    ]);

    return result.rows[0].id;
  }

  // ============================================================================
  // CONVENIENCE LOGGING METHODS
  // ============================================================================

  async logLogin(userId: string, orgId: string, success: boolean, ipAddress?: string, userAgent?: string, failureReason?: string): Promise<void> {
    await this.log({
      userId,
      organizationId: orgId,
      actionType: success ? 'login_success' : 'login_failed',
      resourceType: 'user_session',
      actionDescription: success ? 'User logged in successfully' : 'User login failed',
      actionData: success ? {} : { failureReason },
      ipAddress,
      userAgent,
      riskLevel: success ? 'low' : 'medium',
      complianceRelevant: true
    });
  }

  async logLogout(userId: string, orgId: string, ipAddress?: string): Promise<void> {
    await this.log({
      userId,
      organizationId: orgId,
      actionType: 'logout',
      resourceType: 'user_session',
      actionDescription: 'User logged out',
      ipAddress,
      riskLevel: 'low',
      complianceRelevant: true
    });
  }

  async logOrganizationAction(
    userId: string, 
    orgId: string, 
    action: 'create' | 'update' | 'delete',
    targetOrgId: string,
    targetOrgName: string,
    changes?: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId,
      organizationId: orgId,
      actionType: `organization_${action}`,
      resourceType: 'organization',
      resourceId: targetOrgId,
      actionDescription: `${action} organization: ${targetOrgName}`,
      actionData: { targetOrganization: targetOrgName, changes },
      ipAddress,
      riskLevel: action === 'delete' ? 'high' : 'medium',
      complianceRelevant: true
    });
  }

  async logUserAction(
    userId: string,
    orgId: string,
    action: 'create' | 'update' | 'delete' | 'invite',
    targetUserId: string,
    targetUserEmail: string,
    changes?: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId,
      organizationId: orgId,
      actionType: `user_${action}`,
      resourceType: 'user',
      resourceId: targetUserId,
      actionDescription: `${action} user: ${targetUserEmail}`,
      actionData: { targetUser: targetUserEmail, changes },
      ipAddress,
      riskLevel: action === 'delete' ? 'high' : 'low',
      complianceRelevant: true
    });
  }

  async logTechnicianAccessAction(
    userId: string,
    orgId: string,
    action: 'grant' | 'revoke' | 'update' | 'handoff',
    accessId: string,
    technicianEmail: string,
    customerOrgName: string,
    details?: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId,
      organizationId: orgId,
      actionType: `technician_access_${action}`,
      resourceType: 'technician_access',
      resourceId: accessId,
      actionDescription: `${action} technician access: ${technicianEmail} -> ${customerOrgName}`,
      actionData: { technician: technicianEmail, customer: customerOrgName, ...details },
      ipAddress,
      riskLevel: action === 'grant' ? 'medium' : 'low',
      complianceRelevant: true
    });
  }

  async logMfaAction(
    userId: string,
    orgId: string,
    action: 'enable' | 'disable' | 'verify' | 'backup_code_used',
    ipAddress?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      organizationId: orgId,
      actionType: `mfa_${action}`,
      resourceType: 'user_security',
      resourceId: userId,
      actionDescription: `MFA ${action}`,
      actionData: details,
      ipAddress,
      riskLevel: action === 'disable' ? 'medium' : 'low',
      complianceRelevant: true
    });
  }

  async logPasswordAction(
    userId: string,
    orgId: string,
    action: 'change' | 'reset' | 'reset_request',
    ipAddress?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      organizationId: orgId,
      actionType: `password_${action}`,
      resourceType: 'user_security',
      resourceId: userId,
      actionDescription: `Password ${action}`,
      actionData: details,
      ipAddress,
      riskLevel: 'medium',
      complianceRelevant: true
    });
  }

  async logDataAccess(
    userId: string,
    orgId: string,
    resourceType: string,
    resourceId: string,
    action: 'view' | 'download' | 'export',
    ipAddress?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      organizationId: orgId,
      actionType: `data_${action}`,
      resourceType,
      resourceId,
      actionDescription: `${action} ${resourceType}`,
      actionData: details,
      ipAddress,
      riskLevel: action === 'export' ? 'medium' : 'low',
      complianceRelevant: true
    });
  }

  async logSecurityEvent(
    userId: string,
    orgId: string,
    eventType: string,
    description: string,
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    ipAddress?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      organizationId: orgId,
      actionType: `security_event_${eventType}`,
      resourceType: 'security',
      actionDescription: description,
      actionData: details,
      ipAddress,
      riskLevel,
      complianceRelevant: true
    });
  }

  // ============================================================================
  // AUDIT QUERYING
  // ============================================================================

  async queryAuditLogs(filters: AuditQueryFilters): Promise<{
    logs: AuditLog[];
    total: number;
  }> {
    let query = `
      SELECT 
        al.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        o.name as organization_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN organizations o ON al.organization_id = o.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.userId) {
      query += ` AND al.user_id = $${paramIndex}`;
      params.push(filters.userId);
      paramIndex++;
    }

    if (filters.organizationId) {
      query += ` AND al.organization_id = $${paramIndex}`;
      params.push(filters.organizationId);
      paramIndex++;
    }

    if (filters.actionType) {
      query += ` AND al.action_type = $${paramIndex}`;
      params.push(filters.actionType);
      paramIndex++;
    }

    if (filters.resourceType) {
      query += ` AND al.resource_type = $${paramIndex}`;
      params.push(filters.resourceType);
      paramIndex++;
    }

    if (filters.riskLevel) {
      query += ` AND al.risk_level = $${paramIndex}`;
      params.push(filters.riskLevel);
      paramIndex++;
    }

    if (filters.complianceRelevant !== undefined) {
      query += ` AND al.compliance_relevant = $${paramIndex}`;
      params.push(filters.complianceRelevant);
      paramIndex++;
    }

    if (filters.startDate) {
      query += ` AND al.timestamp >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND al.timestamp <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    if (filters.ipAddress) {
      query += ` AND al.ip_address = $${paramIndex}`;
      params.push(filters.ipAddress);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT[\s\S]*?FROM/,
      'SELECT COUNT(*) FROM'
    );
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add ordering and pagination
    query += ` ORDER BY al.timestamp DESC`;
    
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    const result = await this.db.query(query, params);
    const logs = result.rows.map(row => this.mapAuditLogRow(row));

    return { logs, total };
  }

  async getAuditStats(organizationId?: string, startDate?: Date, endDate?: Date): Promise<AuditStats> {
    let query = `
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN compliance_relevant = true THEN 1 END) as compliance_logs,
        COUNT(CASE WHEN timestamp > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_activity,
        COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as risk_low,
        COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as risk_medium,
        COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as risk_high,
        COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as risk_critical
      FROM audit_logs
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (organizationId) {
      query += ` AND organization_id = $${paramIndex}`;
      params.push(organizationId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      params.push(endDate);
    }

    const result = await this.db.query(query, params);
    const stats = result.rows[0];

    // Get action type distribution
    let actionQuery = `
      SELECT action_type, COUNT(*) as count
      FROM audit_logs
      WHERE 1=1
    `;
    const actionParams = [...params];
    
    if (organizationId) actionQuery += ` AND organization_id = $1`;
    if (startDate) actionQuery += organizationId ? ` AND timestamp >= $2` : ` AND timestamp >= $1`;
    if (endDate) {
      const dateParamIndex = organizationId && startDate ? 3 : (organizationId || startDate ? 2 : 1);
      actionQuery += ` AND timestamp <= $${dateParamIndex}`;
    }
    
    actionQuery += ` GROUP BY action_type ORDER BY count DESC LIMIT 10`;

    const actionResult = await this.db.query(actionQuery, actionParams);
    const actionTypeDistribution = actionResult.rows.reduce((acc, row) => {
      acc[row.action_type] = parseInt(row.count);
      return acc;
    }, {});

    // Get resource type distribution
    let resourceQuery = `
      SELECT resource_type, COUNT(*) as count
      FROM audit_logs
      WHERE 1=1
    `;
    
    if (organizationId) resourceQuery += ` AND organization_id = $1`;
    if (startDate) resourceQuery += organizationId ? ` AND timestamp >= $2` : ` AND timestamp >= $1`;
    if (endDate) {
      const dateParamIndex = organizationId && startDate ? 3 : (organizationId || startDate ? 2 : 1);
      resourceQuery += ` AND timestamp <= $${dateParamIndex}`;
    }
    
    resourceQuery += ` GROUP BY resource_type ORDER BY count DESC LIMIT 10`;

    const resourceResult = await this.db.query(resourceQuery, actionParams);
    const resourceTypeDistribution = resourceResult.rows.reduce((acc, row) => {
      acc[row.resource_type] = parseInt(row.count);
      return acc;
    }, {});

    return {
      totalLogs: parseInt(stats.total_logs),
      complianceLogs: parseInt(stats.compliance_logs),
      recentActivity: parseInt(stats.recent_activity),
      riskDistribution: {
        low: parseInt(stats.risk_low),
        medium: parseInt(stats.risk_medium),
        high: parseInt(stats.risk_high),
        critical: parseInt(stats.risk_critical)
      },
      actionTypeDistribution,
      resourceTypeDistribution
    };
  }

  async getUserActivitySummary(userId: string, days = 30): Promise<{
    totalActions: number;
    riskySessions: number;
    lastActivity: Date | null;
    topActions: Array<{ action: string; count: number }>;
  }> {
    const result = await this.db.query(`
      SELECT 
        COUNT(*) as total_actions,
        COUNT(CASE WHEN risk_level IN ('high', 'critical') THEN 1 END) as risky_sessions,
        MAX(timestamp) as last_activity,
        array_agg(DISTINCT action_type ORDER BY action_type) as action_types
      FROM audit_logs
      WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '${days} days'
    `, [userId]);

    const stats = result.rows[0];

    // Get top actions
    const topActionsResult = await this.db.query(`
      SELECT action_type, COUNT(*) as count
      FROM audit_logs
      WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '${days} days'
      GROUP BY action_type
      ORDER BY count DESC
      LIMIT 5
    `, [userId]);

    return {
      totalActions: parseInt(stats.total_actions),
      riskySessions: parseInt(stats.risky_sessions),
      lastActivity: stats.last_activity,
      topActions: topActionsResult.rows.map(row => ({
        action: row.action_type,
        count: parseInt(row.count)
      }))
    };
  }

  // ============================================================================
  // COMPLIANCE REPORTING
  // ============================================================================

  async generateComplianceReport(
    organizationId?: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<{
    period: { start?: Date; end?: Date };
    summary: {
      totalComplianceLogs: number;
      highRiskEvents: number;
      userAccounts: number;
      accessGrants: number;
      dataAccess: number;
      securityEvents: number;
    };
    details: {
      userManagement: any[];
      accessManagement: any[];
      dataAccess: any[];
      securityEvents: any[];
    };
  }> {
    let baseQuery = `
      FROM audit_logs 
      WHERE compliance_relevant = true
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (organizationId) {
      baseQuery += ` AND organization_id = $${paramIndex}`;
      params.push(organizationId);
      paramIndex++;
    }

    if (startDate) {
      baseQuery += ` AND timestamp >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      baseQuery += ` AND timestamp <= $${paramIndex}`;
      params.push(endDate);
    }

    // Summary stats
    const summaryResult = await this.db.query(`
      SELECT 
        COUNT(*) as total_compliance_logs,
        COUNT(CASE WHEN risk_level IN ('high', 'critical') THEN 1 END) as high_risk_events,
        COUNT(CASE WHEN action_type LIKE 'user_%' THEN 1 END) as user_accounts,
        COUNT(CASE WHEN action_type LIKE 'technician_access_%' THEN 1 END) as access_grants,
        COUNT(CASE WHEN action_type LIKE 'data_%' THEN 1 END) as data_access,
        COUNT(CASE WHEN action_type LIKE 'security_%' THEN 1 END) as security_events
      ${baseQuery}
    `, params);

    const summary = summaryResult.rows[0];

    // Detailed sections
    const userManagementResult = await this.db.query(`
      SELECT * ${baseQuery} AND action_type LIKE 'user_%'
      ORDER BY timestamp DESC LIMIT 100
    `, params);

    const accessManagementResult = await this.db.query(`
      SELECT * ${baseQuery} AND action_type LIKE 'technician_access_%'
      ORDER BY timestamp DESC LIMIT 100
    `, params);

    const dataAccessResult = await this.db.query(`
      SELECT * ${baseQuery} AND action_type LIKE 'data_%'
      ORDER BY timestamp DESC LIMIT 100
    `, params);

    const securityEventsResult = await this.db.query(`
      SELECT * ${baseQuery} AND action_type LIKE 'security_%'
      ORDER BY timestamp DESC LIMIT 100
    `, params);

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalComplianceLogs: parseInt(summary.total_compliance_logs),
        highRiskEvents: parseInt(summary.high_risk_events),
        userAccounts: parseInt(summary.user_accounts),
        accessGrants: parseInt(summary.access_grants),
        dataAccess: parseInt(summary.data_access),
        securityEvents: parseInt(summary.security_events)
      },
      details: {
        userManagement: userManagementResult.rows.map(row => this.mapAuditLogRow(row)),
        accessManagement: accessManagementResult.rows.map(row => this.mapAuditLogRow(row)),
        dataAccess: dataAccessResult.rows.map(row => this.mapAuditLogRow(row)),
        securityEvents: securityEventsResult.rows.map(row => this.mapAuditLogRow(row))
      }
    };
  }

  // ============================================================================
  // CLEANUP UTILITIES
  // ============================================================================

  async cleanupOldLogs(retentionDays = 2555): Promise<number> { // ~7 years default
    const result = await this.db.query(`
      DELETE FROM audit_logs 
      WHERE timestamp < NOW() - INTERVAL '${retentionDays} days'
      AND compliance_relevant = false
    `);

    return result.rowCount || 0;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private mapAuditLogRow(row: any): AuditLog {
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      actionType: row.action_type,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      actionDescription: row.action_description,
      actionData: typeof row.action_data === 'string' ? JSON.parse(row.action_data) : row.action_data,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      organizationId: row.organization_id,
      riskLevel: row.risk_level,
      complianceRelevant: row.compliance_relevant,
      timestamp: row.timestamp,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
    };
  }
}

export const auditService = new AuditService();