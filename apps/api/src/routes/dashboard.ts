import { Router } from 'express';
import { getDB } from '@/database/connection';
import { requireRole } from '@/middleware/auth';

const router = Router();

// Get comprehensive dashboard overview
router.get('/overview', async (req, res, next) => {
  try {
    const db = getDB();
    const { period_days = 30 } = req.query;
    const periodStart = new Date(Date.now() - Number(period_days) * 24 * 60 * 60 * 1000);
    
    let customerOrgId = null;
    if (req.user?.orgType === 'customer') {
      customerOrgId = req.user.orgId;
    }

    // Get security score and metrics
    const securityMetrics = await getSecurityMetrics(db, customerOrgId, periodStart);
    
    // Get alert statistics
    const alertStats = await getAlertStatistics(db, customerOrgId, periodStart);
    
    // Get intervention statistics
    const interventionStats = await getInterventionStatistics(db, customerOrgId, periodStart);
    
    // Get compliance status
    const complianceStatus = await getComplianceStatus(db, customerOrgId);
    
    // Get trend data for charts
    const trendData = await getTrendData(db, customerOrgId, periodStart);

    res.json({
      success: true,
      data: {
        period: {
          days: Number(period_days),
          startDate: periodStart,
          endDate: new Date()
        },
        securityScore: securityMetrics.score,
        securityMetrics,
        alertStats,
        interventionStats,
        complianceStatus,
        trendData,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get security score with detailed breakdown
router.get('/security-score', async (req, res, next) => {
  try {
    const db = getDB();
    const { period_days = 30 } = req.query;
    const periodStart = new Date(Date.now() - Number(period_days) * 24 * 60 * 60 * 1000);
    
    let customerOrgId = null;
    if (req.user?.orgType === 'customer') {
      customerOrgId = req.user.orgId;
    }

    const metrics = await getSecurityMetrics(db, customerOrgId, periodStart);
    
    res.json({
      success: true,
      data: {
        currentScore: metrics.score,
        scoreBreakdown: metrics.breakdown,
        factors: metrics.factors,
        recommendations: metrics.recommendations,
        historicalScores: await getHistoricalScores(db, customerOrgId, 90), // 90 days
        benchmarkComparison: await getBenchmarkComparison(db, customerOrgId)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get real-time security status
router.get('/security-status', async (req, res, next) => {
  try {
    const db = getDB();
    
    let customerOrgId = null;
    if (req.user?.orgType === 'customer') {
      customerOrgId = req.user.orgId;
    }

    // Get current alerts
    let alertQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE severity = 'high') as high,
        COUNT(*) FILTER (WHERE severity = 'warning') as warning,
        COUNT(*) FILTER (WHERE is_resolved = false) as unresolved
      FROM alerts 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `;
    const alertParams: any[] = [];
    if (customerOrgId) {
      alertQuery += ' AND customer_org_id = $1';
      alertParams.push(customerOrgId);
    }
    
    const alertResult = await db.query(alertQuery, alertParams);
    const alerts = alertResult.rows[0];

    // Get active interventions
    let interventionQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE priority = 'emergency') as emergency,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE estimated_completion < NOW() AND status NOT IN ('completed', 'cancelled')) as overdue
      FROM interventions 
      WHERE status NOT IN ('completed', 'cancelled')
    `;
    const interventionParams: any[] = [];
    if (customerOrgId) {
      interventionQuery += ' AND customer_org_id = $1';
      interventionParams.push(customerOrgId);
    }
    
    const interventionResult = await db.query(interventionQuery, interventionParams);
    const interventions = interventionResult.rows[0];

    // Calculate overall status
    let overallStatus = 'healthy';
    if (parseInt(alerts.critical) > 0 || parseInt(interventions.emergency) > 0) {
      overallStatus = 'critical';
    } else if (parseInt(alerts.high) > 5 || parseInt(interventions.overdue) > 0) {
      overallStatus = 'warning';
    } else if (parseInt(alerts.unresolved) > 10) {
      overallStatus = 'attention';
    }

    res.json({
      success: true,
      data: {
        overallStatus,
        alerts: {
          total: parseInt(alerts.total || '0'),
          critical: parseInt(alerts.critical || '0'),
          high: parseInt(alerts.high || '0'),
          warning: parseInt(alerts.warning || '0'),
          unresolved: parseInt(alerts.unresolved || '0')
        },
        interventions: {
          active: parseInt(interventions.total || '0'),
          emergency: parseInt(interventions.emergency || '0'),
          inProgress: parseInt(interventions.in_progress || '0'),
          overdue: parseInt(interventions.overdue || '0')
        },
        lastChecked: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get vulnerability distribution and trends
router.get('/vulnerabilities', async (req, res, next) => {
  try {
    const db = getDB();
    const { period_days = 30 } = req.query;
    const periodStart = new Date(Date.now() - Number(period_days) * 24 * 60 * 60 * 1000);
    
    let customerOrgId = null;
    if (req.user?.orgType === 'customer') {
      customerOrgId = req.user.orgId;
    }

    // Get vulnerability data from reports
    let query = `
      SELECT 
        report_data,
        severity,
        generated_at,
        status
      FROM security_reports 
      WHERE report_type = 'vulnerability_assessment' 
      AND generated_at >= $1
      AND status IN ('approved', 'published')
    `;
    const params = [periodStart];
    
    if (customerOrgId) {
      query += ' AND customer_org_id = $2';
      params.push(customerOrgId);
    }
    
    query += ' ORDER BY generated_at DESC';
    
    const result = await db.query(query, params);
    
    // Process vulnerability data
    const vulnerabilities = {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      resolved: 0,
      categories: {} as any,
      trends: [] as any[]
    };

    result.rows.forEach(report => {
      if (report.report_data && report.report_data.vulnerabilities) {
        const vulns = report.report_data.vulnerabilities;
        vulnerabilities.total += vulns.length;
        
        vulns.forEach((vuln: any) => {
          // Count by severity
          switch (vuln.severity) {
            case 'critical': vulnerabilities.critical++; break;
            case 'high': vulnerabilities.high++; break;
            case 'medium': vulnerabilities.medium++; break;
            case 'low': vulnerabilities.low++; break;
          }
          
          // Count by category
          const category = vuln.category || 'other';
          vulnerabilities.categories[category] = (vulnerabilities.categories[category] || 0) + 1;
          
          // Count resolved
          if (vuln.status === 'resolved') {
            vulnerabilities.resolved++;
          }
        });
        
        // Add to trends
        vulnerabilities.trends.push({
          date: report.generated_at,
          total: vulns.length,
          critical: vulns.filter((v: any) => v.severity === 'critical').length,
          high: vulns.filter((v: any) => v.severity === 'high').length
        });
      }
    });

    res.json({
      success: true,
      data: vulnerabilities
    });
  } catch (error) {
    next(error);
  }
});

// Get compliance dashboard data
router.get('/compliance', async (req, res, next) => {
  try {
    const db = getDB();
    
    let customerOrgId = null;
    if (req.user?.orgType === 'customer') {
      customerOrgId = req.user.orgId;
    }

    const complianceData = await getComplianceStatus(db, customerOrgId);
    
    res.json({
      success: true,
      data: complianceData
    });
  } catch (error) {
    next(error);
  }
});

// Get KPI metrics for performance tracking
router.get('/kpis', requireRole(['admin', 'account_manager', 'security_analyst']), async (req, res, next) => {
  try {
    const db = getDB();
    const { period_days = 30, customer_org_id } = req.query;
    const periodStart = new Date(Date.now() - Number(period_days) * 24 * 60 * 60 * 1000);
    
    // MSS provider can view all customers, customers only see their own
    const targetOrgId = req.user?.orgType === 'customer' ? req.user.orgId : customer_org_id;

    const kpis = await calculateKPIs(db, targetOrgId as string, periodStart);
    
    res.json({
      success: true,
      data: {
        period: {
          days: Number(period_days),
          startDate: periodStart,
          endDate: new Date()
        },
        kpis,
        benchmarks: await getBenchmarkComparison(db, targetOrgId as string)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions
async function getSecurityMetrics(db: any, customerOrgId: string | null, periodStart: Date) {
  let query = `
    SELECT 
      COUNT(*) FILTER (WHERE severity = 'critical' AND is_resolved = false) as critical_alerts,
      COUNT(*) FILTER (WHERE severity = 'high' AND is_resolved = false) as high_alerts,
      COUNT(*) FILTER (WHERE is_resolved = true) as resolved_alerts,
      COUNT(*) as total_alerts
    FROM alerts 
    WHERE created_at >= $1
  `;
  const params = [periodStart];
  
  if (customerOrgId) {
    query += ' AND customer_org_id = $2';
    params.push(customerOrgId);
  }
  
  const alertResult = await db.query(query, params);
  const alerts = alertResult.rows[0];

  // Calculate security score (0-100)
  const criticalAlerts = parseInt(alerts.critical_alerts || '0');
  const highAlerts = parseInt(alerts.high_alerts || '0');
  const totalAlerts = parseInt(alerts.total_alerts || '0');
  const resolvedAlerts = parseInt(alerts.resolved_alerts || '0');
  
  let score = 100;
  
  // Deduct for unresolved critical and high alerts
  score -= criticalAlerts * 15;  // 15 points per critical
  score -= highAlerts * 5;       // 5 points per high
  
  // Add back for good resolution rate
  if (totalAlerts > 0) {
    const resolutionRate = resolvedAlerts / totalAlerts;
    score += resolutionRate * 10;
  }
  
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    breakdown: {
      criticalAlerts,
      highAlerts,
      totalAlerts,
      resolvedAlerts,
      resolutionRate: totalAlerts > 0 ? Math.round((resolvedAlerts / totalAlerts) * 100) : 100
    },
    factors: [
      { name: 'Critical Alerts', impact: criticalAlerts * -15, count: criticalAlerts },
      { name: 'High Priority Alerts', impact: highAlerts * -5, count: highAlerts },
      { name: 'Alert Resolution', impact: totalAlerts > 0 ? Math.round((resolvedAlerts / totalAlerts) * 10) : 0, rate: `${totalAlerts > 0 ? Math.round((resolvedAlerts / totalAlerts) * 100) : 100}%` }
    ],
    recommendations: generateSecurityRecommendations(criticalAlerts, highAlerts, resolvedAlerts, totalAlerts)
  };
}

async function getAlertStatistics(db: any, customerOrgId: string | null, periodStart: Date) {
  let query = `
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE severity = 'critical') as critical,
      COUNT(*) FILTER (WHERE severity = 'high') as high,
      COUNT(*) FILTER (WHERE severity = 'warning') as warning,
      COUNT(*) FILTER (WHERE severity = 'info') as info,
      COUNT(*) FILTER (WHERE is_resolved = true) as resolved,
      COUNT(*) FILTER (WHERE is_read = false) as unread,
      AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - created_at))/3600) FILTER (WHERE is_resolved = true) as avg_resolution_hours
    FROM alerts 
    WHERE created_at >= $1
  `;
  const params = [periodStart];
  
  if (customerOrgId) {
    query += ' AND customer_org_id = $2';
    params.push(customerOrgId);
  }
  
  const result = await db.query(query, params);
  const stats = result.rows[0];
  
  return {
    total: parseInt(stats.total || '0'),
    bySeverity: {
      critical: parseInt(stats.critical || '0'),
      high: parseInt(stats.high || '0'),
      warning: parseInt(stats.warning || '0'),
      info: parseInt(stats.info || '0')
    },
    resolved: parseInt(stats.resolved || '0'),
    unread: parseInt(stats.unread || '0'),
    averageResolutionHours: parseFloat(stats.avg_resolution_hours || '0').toFixed(2)
  };
}

async function getInterventionStatistics(db: any, customerOrgId: string | null, periodStart: Date) {
  let query = `
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE priority = 'emergency') as emergency,
      COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
      COUNT(*) FILTER (WHERE completed_at <= estimated_completion AND status = 'completed') as on_time,
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) FILTER (WHERE status = 'completed') as avg_completion_hours
    FROM interventions 
    WHERE created_at >= $1
  `;
  const params = [periodStart];
  
  if (customerOrgId) {
    query += ' AND customer_org_id = $2';
    params.push(customerOrgId);
  }
  
  const result = await db.query(query, params);
  const stats = result.rows[0];
  
  const total = parseInt(stats.total || '0');
  const completed = parseInt(stats.completed || '0');
  const onTime = parseInt(stats.on_time || '0');
  
  return {
    total,
    completed,
    inProgress: parseInt(stats.in_progress || '0'),
    emergency: parseInt(stats.emergency || '0'),
    highPriority: parseInt(stats.high_priority || '0'),
    onTime,
    slaCompliance: completed > 0 ? Math.round((onTime / completed) * 100) : 100,
    averageCompletionHours: parseFloat(stats.avg_completion_hours || '0').toFixed(2)
  };
}

async function getComplianceStatus(db: any, customerOrgId: string | null) {
  // This would integrate with actual compliance frameworks
  // For now, return simulated data
  const frameworks = [
    {
      name: 'SOC 2 Type II',
      status: 'compliant',
      score: 95,
      lastAssessment: '2024-01-15',
      nextDue: '2024-07-15',
      controls: {
        total: 25,
        implemented: 24,
        exceptions: 1
      }
    },
    {
      name: 'ISO 27001',
      status: 'in_progress',
      score: 87,
      lastAssessment: '2024-02-01',
      nextDue: '2024-08-01',
      controls: {
        total: 114,
        implemented: 99,
        exceptions: 15
      }
    },
    {
      name: 'GDPR',
      status: 'compliant',
      score: 92,
      lastAssessment: '2024-01-30',
      nextDue: '2024-07-30',
      controls: {
        total: 32,
        implemented: 30,
        exceptions: 2
      }
    }
  ];

  const overallScore = Math.round(frameworks.reduce((sum, f) => sum + f.score, 0) / frameworks.length);
  
  return {
    overallScore,
    frameworks,
    summary: {
      compliant: frameworks.filter(f => f.status === 'compliant').length,
      inProgress: frameworks.filter(f => f.status === 'in_progress').length,
      nonCompliant: frameworks.filter(f => f.status === 'non_compliant').length
    }
  };
}

async function getTrendData(db: any, customerOrgId: string | null, periodStart: Date) {
  const days = Math.floor((Date.now() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
  const trends = [];
  
  for (let i = days; i >= 0; i--) {
    const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    let alertQuery = `
      SELECT COUNT(*) as count, 
             COUNT(*) FILTER (WHERE severity IN ('critical', 'high')) as high_severity
      FROM alerts 
      WHERE created_at BETWEEN $1 AND $2
    `;
    const alertParams = [dayStart, dayEnd];
    
    if (customerOrgId) {
      alertQuery += ' AND customer_org_id = $3';
      alertParams.push(customerOrgId);
    }
    
    const alertResult = await db.query(alertQuery, alertParams);
    
    trends.push({
      date: dayStart.toISOString().split('T')[0],
      alerts: parseInt(alertResult.rows[0]?.count || '0'),
      highSeverityAlerts: parseInt(alertResult.rows[0]?.high_severity || '0')
    });
  }
  
  return trends;
}

async function getHistoricalScores(db: any, customerOrgId: string | null, days: number) {
  // This would calculate historical security scores
  // For now, return simulated trend data
  const scores = [];
  for (let i = days; i >= 0; i -= 7) { // Weekly data points
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    scores.push({
      date: date.toISOString().split('T')[0],
      score: Math.floor(Math.random() * 20) + 80 // Simulated score between 80-100
    });
  }
  return scores;
}

async function getBenchmarkComparison(db: any, customerOrgId: string | null) {
  // This would compare against industry benchmarks
  return {
    industry: 'Technology',
    yourScore: 92,
    industryAverage: 78,
    topQuartile: 88,
    benchmarks: [
      { metric: 'Alert Resolution Time', yourValue: '4.2 hours', industryAverage: '8.1 hours', status: 'above_average' },
      { metric: 'Critical Alert Response', yourValue: '15 minutes', industryAverage: '45 minutes', status: 'above_average' },
      { metric: 'SLA Compliance', yourValue: '96%', industryAverage: '89%', status: 'above_average' }
    ]
  };
}

async function calculateKPIs(db: any, customerOrgId: string, periodStart: Date) {
  // Mean Time to Detect (MTTD)
  // Mean Time to Respond (MTTR)
  // Mean Time to Resolve (MTR)
  // Security Incident Rate
  // Compliance Score
  
  let alertQuery = `
    SELECT 
      AVG(EXTRACT(EPOCH FROM (created_at - created_at))/60) as mttd_minutes,
      AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - created_at))/60) FILTER (WHERE is_resolved = true) as mttr_minutes,
      COUNT(*) as total_incidents,
      COUNT(*) FILTER (WHERE severity IN ('critical', 'high')) as high_severity_incidents
    FROM alerts 
    WHERE created_at >= $1
  `;
  const params = [periodStart];
  
  if (customerOrgId) {
    alertQuery += ' AND customer_org_id = $2';
    params.push(customerOrgId);
  }
  
  const alertResult = await db.query(alertQuery, params);
  const metrics = alertResult.rows[0];
  
  return {
    mttd: `${parseFloat(metrics.mttd_minutes || '0').toFixed(1)} minutes`,
    mttr: `${parseFloat(metrics.mttr_minutes || '0').toFixed(1)} minutes`,
    incidentRate: parseInt(metrics.total_incidents || '0'),
    highSeverityIncidents: parseInt(metrics.high_severity_incidents || '0'),
    securityPosture: 'Strong', // This would be calculated based on multiple factors
    complianceScore: '92%'
  };
}

function generateSecurityRecommendations(critical: number, high: number, resolved: number, total: number): string[] {
  const recommendations = [];
  
  if (critical > 0) {
    recommendations.push(`Address ${critical} critical security alert${critical > 1 ? 's' : ''} immediately`);
  }
  
  if (high > 5) {
    recommendations.push('High number of high-priority alerts detected - consider security posture review');
  }
  
  if (total > 0 && resolved / total < 0.8) {
    recommendations.push('Alert resolution rate is below target - review incident response procedures');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Security posture is strong - maintain current monitoring and response practices');
  }
  
  return recommendations;
}

export default router;