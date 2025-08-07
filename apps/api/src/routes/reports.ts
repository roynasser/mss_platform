import { Router } from 'express';
import { getDB } from '@/database/connection';
import { requireRole } from '@/middleware/auth';
// TODO: Install these dependencies and uncomment when ready
// import PDFDocument from 'pdfkit';
// import { Parser } from 'json2csv';
// import { Readable } from 'stream';

const router = Router();

// Get security reports with enhanced filtering and pagination
router.get('/', async (req, res, next) => {
  try {
    const db = getDB();
    const { 
      page = 1, 
      limit = 10, 
      report_type, 
      severity, 
      status, 
      search,
      date_from,
      date_to,
      sort_by = 'generated_at',
      sort_order = 'desc'
    } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT r.*, o.name as customer_name,
             u1.first_name as generated_by_first_name,
             u1.last_name as generated_by_last_name,
             u2.first_name as approved_by_first_name,
             u2.last_name as approved_by_last_name
      FROM security_reports r
      LEFT JOIN organizations o ON r.customer_org_id = o.id
      LEFT JOIN users u1 ON r.generated_by = u1.id
      LEFT JOIN users u2 ON r.approved_by = u2.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    // Multi-tenant filtering
    if (req.user?.orgType === 'customer') {
      query += ` AND r.customer_org_id = $${++paramCount}`;
      params.push(req.user.orgId);
    }

    // Enhanced filters
    if (report_type) {
      query += ` AND r.report_type = $${++paramCount}`;
      params.push(report_type);
    }
    if (severity) {
      query += ` AND r.severity = $${++paramCount}`;
      params.push(severity);
    }
    if (status) {
      query += ` AND r.status = $${++paramCount}`;
      params.push(status);
    }
    if (search) {
      query += ` AND (r.title ILIKE $${++paramCount} OR r.description ILIKE $${++paramCount})`;
      params.push(`%${search}%`, `%${search}%`);
      paramCount++; // Account for second parameter
    }
    if (date_from) {
      query += ` AND r.generated_at >= $${++paramCount}`;
      params.push(date_from);
    }
    if (date_to) {
      query += ` AND r.generated_at <= $${++paramCount}`;
      params.push(date_to);
    }

    // Sorting
    const validSortColumns = ['generated_at', 'title', 'severity', 'status', 'report_type'];
    const sortColumn = validSortColumns.includes(sort_by as string) ? sort_by : 'generated_at';
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY r.${sortColumn} ${sortDirection} LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Count query with same filters
    let countQuery = `
      SELECT COUNT(*)
      FROM security_reports r
      WHERE 1=1
    `;
    const countParams: any[] = [];
    let countParamCount = 0;

    if (req.user?.orgType === 'customer') {
      countQuery += ` AND r.customer_org_id = $${++countParamCount}`;
      countParams.push(req.user.orgId);
    }
    if (report_type) {
      countQuery += ` AND r.report_type = $${++countParamCount}`;
      countParams.push(report_type);
    }
    if (severity) {
      countQuery += ` AND r.severity = $${++countParamCount}`;
      countParams.push(severity);
    }
    if (status) {
      countQuery += ` AND r.status = $${++countParamCount}`;
      countParams.push(status);
    }
    if (search) {
      countQuery += ` AND (r.title ILIKE $${++countParamCount} OR r.description ILIKE $${++countParamCount})`;
      countParams.push(`%${search}%`, `%${search}%`);
      countParamCount++;
    }
    if (date_from) {
      countQuery += ` AND r.generated_at >= $${++countParamCount}`;
      countParams.push(date_from);
    }
    if (date_to) {
      countQuery += ` AND r.generated_at <= $${++countParamCount}`;
      countParams.push(date_to);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        reports: result.rows.map(report => ({
          id: report.id,
          customerOrgId: report.customer_org_id,
          customerName: report.customer_name,
          title: report.title,
          reportType: report.report_type,
          severity: report.severity,
          status: report.status,
          description: report.description,
          reportData: report.report_data,
          fileAttachments: report.file_attachments,
          reportPeriodStart: report.report_period_start,
          reportPeriodEnd: report.report_period_end,
          generatedAt: report.generated_at,
          publishedAt: report.published_at,
          generatedBy: report.generated_by_first_name ? 
            `${report.generated_by_first_name} ${report.generated_by_last_name}` : null,
          approvedBy: report.approved_by_first_name ? 
            `${report.approved_by_first_name} ${report.approved_by_last_name}` : null,
          tags: report.tags,
          createdAt: report.created_at,
          updatedAt: report.updated_at,
        })),
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get specific report with full details and visualizations
router.get('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;

    let query = `
      SELECT r.*, o.name as customer_name,
             u1.first_name as generated_by_first_name,
             u1.last_name as generated_by_last_name,
             u1.email as generated_by_email,
             u2.first_name as approved_by_first_name,
             u2.last_name as approved_by_last_name,
             u2.email as approved_by_email
      FROM security_reports r
      LEFT JOIN organizations o ON r.customer_org_id = o.id
      LEFT JOIN users u1 ON r.generated_by = u1.id
      LEFT JOIN users u2 ON r.approved_by = u2.id
      WHERE r.id = $1
    `;
    const params = [id];

    // Multi-tenant access control
    if (req.user?.orgType === 'customer') {
      query += ' AND r.customer_org_id = $2';
      params.push(req.user.orgId);
    }

    const result = await db.query(query, params);
    const report = result.rows[0];

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    // Get related alerts for context
    const alertsQuery = `
      SELECT COUNT(*) as total_alerts,
             SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_alerts,
             SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_alerts
      FROM alerts 
      WHERE customer_org_id = $1 
      AND created_at BETWEEN $2 AND $3
    `;
    const alertsResult = await db.query(alertsQuery, [
      report.customer_org_id,
      report.report_period_start || report.created_at,
      report.report_period_end || report.updated_at
    ]);

    res.json({
      success: true,
      data: {
        id: report.id,
        customerOrgId: report.customer_org_id,
        customerName: report.customer_name,
        title: report.title,
        reportType: report.report_type,
        severity: report.severity,
        status: report.status,
        description: report.description,
        reportData: report.report_data,
        fileAttachments: report.file_attachments || [],
        reportPeriodStart: report.report_period_start,
        reportPeriodEnd: report.report_period_end,
        generatedAt: report.generated_at,
        publishedAt: report.published_at,
        generatedBy: {
          name: report.generated_by_first_name ? 
            `${report.generated_by_first_name} ${report.generated_by_last_name}` : null,
          email: report.generated_by_email
        },
        approvedBy: {
          name: report.approved_by_first_name ? 
            `${report.approved_by_first_name} ${report.approved_by_last_name}` : null,
          email: report.approved_by_email
        },
        tags: report.tags || [],
        contextualData: {
          totalAlerts: parseInt(alertsResult.rows[0]?.total_alerts || '0'),
          criticalAlerts: parseInt(alertsResult.rows[0]?.critical_alerts || '0'),
          highAlerts: parseInt(alertsResult.rows[0]?.high_alerts || '0')
        },
        createdAt: report.created_at,
        updatedAt: report.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Generate new report
router.post('/generate', requireRole(['technician', 'security_analyst', 'admin']), async (req, res, next) => {
  try {
    const db = getDB();
    const {
      customer_org_id,
      report_type,
      title,
      description,
      severity,
      report_period_start,
      report_period_end,
      tags
    } = req.body;

    // Validate required fields
    if (!customer_org_id || !report_type || !title) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customer_org_id, report_type, title'
      });
    }

    // Verify customer organization exists
    const orgCheck = await db.query(
      'SELECT id FROM organizations WHERE id = $1 AND type = $2',
      [customer_org_id, 'customer']
    );
    if (orgCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer organization not found' });
    }

    // Generate report data based on type
    let reportData = {};
    const periodStart = report_period_start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const periodEnd = report_period_end || new Date();

    // Gather data for the report
    const alertsData = await db.query(`
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
        COUNT(*) FILTER (WHERE severity = 'high') as high_alerts,
        COUNT(*) FILTER (WHERE severity = 'warning') as warning_alerts,
        COUNT(*) FILTER (WHERE severity = 'info') as info_alerts,
        COUNT(*) FILTER (WHERE is_resolved = true) as resolved_alerts
      FROM alerts 
      WHERE customer_org_id = $1 
      AND created_at BETWEEN $2 AND $3
    `, [customer_org_id, periodStart, periodEnd]);

    const interventionsData = await db.query(`
      SELECT 
        COUNT(*) as total_interventions,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_interventions,
        COUNT(*) FILTER (WHERE priority = 'emergency') as emergency_interventions
      FROM interventions 
      WHERE customer_org_id = $1 
      AND created_at BETWEEN $2 AND $3
    `, [customer_org_id, periodStart, periodEnd]);

    // Build comprehensive report data
    reportData = {
      summary: {
        reportPeriod: { start: periodStart, end: periodEnd },
        alerts: alertsData.rows[0],
        interventions: interventionsData.rows[0]
      },
      metrics: {
        securityScore: calculateSecurityScore(alertsData.rows[0], interventionsData.rows[0]),
        complianceStatus: 'compliant', // This would be calculated based on actual compliance rules
        trendAnalysis: await generateTrendAnalysis(db, customer_org_id, periodStart, periodEnd)
      },
      recommendations: generateRecommendations(alertsData.rows[0], interventionsData.rows[0])
    };

    // Insert the report
    const result = await db.query(`
      INSERT INTO security_reports (
        customer_org_id, report_type, title, description, severity, 
        status, report_data, report_period_start, report_period_end,
        generated_by, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      customer_org_id, report_type, title, description, severity || 'medium',
      'draft', JSON.stringify(reportData), periodStart, periodEnd,
      req.user?.userId, JSON.stringify(tags || [])
    ]);

    const newReport = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: newReport.id,
        customerOrgId: newReport.customer_org_id,
        reportType: newReport.report_type,
        title: newReport.title,
        status: newReport.status,
        generatedAt: newReport.generated_at,
        reportData: newReport.report_data
      }
    });
  } catch (error) {
    next(error);
  }
});

// Export report in various formats
router.get('/:id/export', async (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { format = 'json' } = req.query;

    // Get the report
    let query = `
      SELECT r.*, o.name as customer_name
      FROM security_reports r
      LEFT JOIN organizations o ON r.customer_org_id = o.id
      WHERE r.id = $1
    `;
    const params = [id];

    if (req.user?.orgType === 'customer') {
      query += ' AND r.customer_org_id = $2';
      params.push(req.user.orgId);
    }

    const result = await db.query(query, params);
    const report = result.rows[0];

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    const exportData = {
      id: report.id,
      customerName: report.customer_name,
      title: report.title,
      reportType: report.report_type,
      severity: report.severity,
      status: report.status,
      description: report.description,
      reportData: report.report_data,
      reportPeriodStart: report.report_period_start,
      reportPeriodEnd: report.report_period_end,
      generatedAt: report.generated_at,
      publishedAt: report.published_at
    };

    switch (format) {
      case 'json':
        res.json({
          success: true,
          data: exportData
        });
        break;
        
      case 'csv':
        // TODO: Implement CSV export when json2csv is installed
        res.status(501).json({
          success: false,
          error: 'CSV export not yet implemented - install json2csv package'
        });
        break;
        
      case 'pdf':
        // TODO: Implement PDF export when pdfkit is installed
        res.status(501).json({
          success: false,
          error: 'PDF export not yet implemented - install pdfkit package'
        });
        break;
        
      default:
        res.status(400).json({
          success: false,
          error: 'Unsupported format. Use: json, csv, or pdf'
        });
    }
  } catch (error) {
    next(error);
  }
});

// Approve report for publication
router.patch('/:id/approve', requireRole(['admin', 'security_analyst']), async (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be either "approve" or "reject"'
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'draft';
    const publishedAt = action === 'approve' ? new Date() : null;

    const result = await db.query(`
      UPDATE security_reports 
      SET status = $1, approved_by = $2, published_at = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [newStatus, req.user?.userId, publishedAt, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        publishedAt: result.rows[0].published_at,
        updatedAt: result.rows[0].updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions
function calculateSecurityScore(alertsData: any, interventionsData: any): number {
  const totalAlerts = parseInt(alertsData.total_alerts || '0');
  const criticalAlerts = parseInt(alertsData.critical_alerts || '0');
  const resolvedAlerts = parseInt(alertsData.resolved_alerts || '0');
  const completedInterventions = parseInt(interventionsData.completed_interventions || '0');
  const totalInterventions = parseInt(interventionsData.total_interventions || '0');

  // Basic scoring algorithm (0-100)
  let score = 100;
  
  // Deduct points for unresolved alerts
  const unresolvedAlerts = totalAlerts - resolvedAlerts;
  score -= unresolvedAlerts * 2;
  
  // Deduct extra points for critical alerts
  score -= criticalAlerts * 5;
  
  // Add points for completed interventions
  if (totalInterventions > 0) {
    const interventionRate = completedInterventions / totalInterventions;
    score += interventionRate * 10;
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function generateRecommendations(alertsData: any, interventionsData: any): string[] {
  const recommendations = [];
  
  const criticalAlerts = parseInt(alertsData.critical_alerts || '0');
  const unresolvedAlerts = parseInt(alertsData.total_alerts || '0') - parseInt(alertsData.resolved_alerts || '0');
  const emergencyInterventions = parseInt(interventionsData.emergency_interventions || '0');
  
  if (criticalAlerts > 0) {
    recommendations.push('Immediate attention required for critical security alerts');
  }
  
  if (unresolvedAlerts > 10) {
    recommendations.push('Review and resolve pending security alerts to improve security posture');
  }
  
  if (emergencyInterventions > 0) {
    recommendations.push('Consider implementing preventive measures to reduce emergency interventions');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Security posture appears stable. Continue monitoring and maintain current practices.');
  }
  
  return recommendations;
}

async function generateTrendAnalysis(db: any, customerOrgId: string, periodStart: Date, periodEnd: Date) {
  // Get historical data for trend analysis (previous 30 days for comparison)
  const prevPeriodStart = new Date(periodStart.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prevPeriodEnd = periodStart;

  const currentPeriodAlerts = await db.query(`
    SELECT COUNT(*) as total FROM alerts 
    WHERE customer_org_id = $1 AND created_at BETWEEN $2 AND $3
  `, [customerOrgId, periodStart, periodEnd]);

  const previousPeriodAlerts = await db.query(`
    SELECT COUNT(*) as total FROM alerts 
    WHERE customer_org_id = $1 AND created_at BETWEEN $2 AND $3
  `, [customerOrgId, prevPeriodStart, prevPeriodEnd]);

  const currentTotal = parseInt(currentPeriodAlerts.rows[0]?.total || '0');
  const previousTotal = parseInt(previousPeriodAlerts.rows[0]?.total || '0');
  
  let trend = 'stable';
  let changePercentage = 0;
  
  if (previousTotal > 0) {
    changePercentage = Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
    if (changePercentage > 10) trend = 'increasing';
    else if (changePercentage < -10) trend = 'decreasing';
  } else if (currentTotal > 0) {
    trend = 'new_activity';
  }

  return {
    alertTrend: trend,
    alertChangePercentage: changePercentage,
    currentPeriodAlerts: currentTotal,
    previousPeriodAlerts: previousTotal
  };
}

export default router;