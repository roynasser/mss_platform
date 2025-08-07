import { Router } from 'express';
import { authMiddleware, requireRole, requireOrganization } from '@/middleware/auth';
import { AuthPayload } from '@/types/auth';
import { auditService } from '@/services/audit.service';

const router = Router();

/**
 * GET /api/audit/logs - Query audit logs with filters
 */
router.get('/logs', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user as AuthPayload;
    const {
      userId,
      organizationId,
      actionType,
      resourceType,
      riskLevel,
      complianceRelevant,
      startDate,
      endDate,
      ipAddress,
      page = 1,
      limit = 50
    } = req.query;

    // Authorization check
    const canViewAuditLogs = 
      user.orgType === 'mss_provider' && 
      ['super_admin', 'security_analyst', 'account_manager'].includes(user.role);

    if (!canViewAuditLogs) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to view audit logs'
      });
    }

    // Build filters
    const filters: any = {
      limit: Math.min(parseInt(limit as string), 100), // Cap at 100
      offset: (parseInt(page as string) - 1) * parseInt(limit as string)
    };

    if (userId) filters.userId = userId as string;
    if (organizationId) filters.organizationId = organizationId as string;
    if (actionType) filters.actionType = actionType as string;
    if (resourceType) filters.resourceType = resourceType as string;
    if (riskLevel) filters.riskLevel = riskLevel as string;
    if (complianceRelevant !== undefined) filters.complianceRelevant = complianceRelevant === 'true';
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (ipAddress) filters.ipAddress = ipAddress as string;

    const result = await auditService.queryAuditLogs(filters);

    res.json({
      success: true,
      data: {
        logs: result.logs,
        total: result.total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(result.total / parseInt(limit as string))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audit/stats - Get audit statistics
 */
router.get('/stats', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin', 'security_analyst']), async (req, res, next) => {
  try {
    const { organizationId, startDate, endDate } = req.query;

    const filters: any = {};
    if (organizationId) filters.organizationId = organizationId as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const stats = await auditService.getAuditStats(
      filters.organizationId,
      filters.startDate,
      filters.endDate
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audit/user/:userId/activity - Get user activity summary
 */
router.get('/user/:userId/activity', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user as AuthPayload;
    const { userId } = req.params;
    const { days = 30 } = req.query;

    // Authorization check - users can view their own activity, managers can view any
    const canViewActivity = 
      user.userId === userId ||
      (user.orgType === 'mss_provider' && ['super_admin', 'security_analyst', 'account_manager'].includes(user.role));

    if (!canViewActivity) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to view user activity'
      });
    }

    const activity = await auditService.getUserActivitySummary(
      userId, 
      parseInt(days as string)
    );

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audit/compliance/report - Generate compliance report
 */
router.get('/compliance/report', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin', 'security_analyst']), async (req, res, next) => {
  try {
    const { organizationId, startDate, endDate } = req.query;

    const filters: any = {};
    if (organizationId) filters.organizationId = organizationId as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const report = await auditService.generateComplianceReport(
      filters.organizationId,
      filters.startDate,
      filters.endDate
    );

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/audit/cleanup - Clean up old audit logs
 */
router.post('/cleanup', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin']), async (req, res, next) => {
  try {
    const user = req.user as AuthPayload;
    const { retentionDays = 2555 } = req.body; // ~7 years default

    const deletedCount = await auditService.cleanupOldLogs(retentionDays);

    // Log this cleanup action
    await auditService.log({
      userId: user.userId,
      organizationId: user.orgId,
      actionType: 'audit_cleanup',
      resourceType: 'audit_logs',
      actionDescription: 'Cleaned up old audit logs',
      actionData: { retentionDays, deletedCount },
      ipAddress: req.ip,
      riskLevel: 'medium',
      complianceRelevant: true
    });

    res.json({
      success: true,
      data: {
        deletedCount,
        retentionDays
      },
      message: `Deleted ${deletedCount} old audit log entries`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audit/export - Export audit logs (CSV format)
 */
router.get('/export', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin', 'security_analyst']), async (req, res, next) => {
  try {
    const user = req.user as AuthPayload;
    const {
      organizationId,
      actionType,
      resourceType,
      riskLevel,
      startDate,
      endDate,
      format = 'csv'
    } = req.query;

    // Build filters for export
    const filters: any = {
      limit: 10000 // Large limit for export
    };

    if (organizationId) filters.organizationId = organizationId as string;
    if (actionType) filters.actionType = actionType as string;
    if (resourceType) filters.resourceType = resourceType as string;
    if (riskLevel) filters.riskLevel = riskLevel as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const result = await auditService.queryAuditLogs(filters);

    // Log the export action
    await auditService.logDataAccess(
      user.userId,
      user.orgId,
      'audit_logs',
      'bulk_export',
      'export',
      req.ip,
      { filters, exportedCount: result.logs.length, format }
    );

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'Timestamp',
        'User',
        'Organization',
        'Action Type',
        'Resource Type',
        'Resource ID',
        'Description',
        'Risk Level',
        'IP Address'
      ];

      const csvRows = result.logs.map(log => [
        log.timestamp.toISOString(),
        log.userId || '',
        log.organizationId || '',
        log.actionType,
        log.resourceType,
        log.resourceId || '',
        log.actionDescription,
        log.riskLevel,
        log.ipAddress || ''
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      // Return JSON format
      res.json({
        success: true,
        data: {
          logs: result.logs,
          total: result.total,
          exportedAt: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audit/organizations/:orgId/recent - Get recent activity for an organization
 */
router.get('/organizations/:orgId/recent', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user as AuthPayload;
    const { orgId } = req.params;
    const { hours = 24, limit = 50 } = req.query;

    // Authorization check
    const canViewOrgActivity = 
      user.orgId === orgId ||
      (user.orgType === 'mss_provider' && ['super_admin', 'security_analyst', 'account_manager'].includes(user.role));

    if (!canViewOrgActivity) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to view organization activity'
      });
    }

    const startDate = new Date(Date.now() - parseInt(hours as string) * 60 * 60 * 1000);

    const result = await auditService.queryAuditLogs({
      organizationId: orgId,
      startDate,
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: {
        logs: result.logs,
        total: result.total,
        hours: parseInt(hours as string)
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;