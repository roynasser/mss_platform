import { Router } from 'express';
import { authMiddleware, requireRole, requireOrganization } from '@/middleware/auth';
import { AuthPayload } from '@/types/auth';
import { multiTenantService } from '@/services/multi-tenant.service';
import { auditService } from '@/services/audit.service';
import { getDB } from '@/database/connection';

const router = Router();

/**
 * GET /api/access-management/matrix - Get complete access matrix
 */
router.get('/matrix', authMiddleware, requireOrganization('mss_provider'), async (req, res, next) => {
  try {
    const user = req.user as AuthPayload;
    
    // Only managers and super admins can view the full matrix
    if (!['super_admin', 'account_manager', 'security_analyst'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to view access matrix'
      });
    }

    const matrixData = await multiTenantService.getAccessMatrix();

    res.json({
      success: true,
      data: matrixData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/access-management/grant - Grant technician access
 */
router.post('/grant', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin', 'account_manager']), async (req, res, next) => {
  try {
    const user = req.user as AuthPayload;
    const {
      technicianId,
      customerOrgId,
      accessLevel = 'read_only',
      expiresAt,
      allowedServices,
      ipRestrictions,
      timeRestrictions,
      notes
    } = req.body;

    // Validation
    if (!technicianId || !customerOrgId) {
      return res.status(400).json({
        success: false,
        error: 'Technician ID and Customer Organization ID are required'
      });
    }

    const validAccessLevels = ['read_only', 'full_access', 'emergency'];
    if (!validAccessLevels.includes(accessLevel)) {
      return res.status(400).json({
        success: false,
        error: `Invalid access level. Must be one of: ${validAccessLevels.join(', ')}`
      });
    }

    const accessData = {
      technicianId,
      customerOrgId,
      accessLevel,
      grantedBy: user.userId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      allowedServices,
      ipRestrictions,
      timeRestrictions,
      notes
    };

    const access = await multiTenantService.grantTechnicianAccess(accessData);

    res.status(201).json({
      success: true,
      data: access,
      message: 'Technician access granted successfully'
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
    }
    next(error);
  }
});

/**
 * PUT /api/access-management/access/:accessId - Update technician access
 */
router.put('/access/:accessId', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin', 'account_manager']), async (req, res, next) => {
  try {
    const { accessId } = req.params;
    const {
      accessLevel,
      expiresAt,
      allowedServices,
      ipRestrictions,
      timeRestrictions,
      notes
    } = req.body;

    const updates: any = {};
    if (accessLevel) updates.accessLevel = accessLevel;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (allowedServices) updates.allowedServices = allowedServices;
    if (ipRestrictions) updates.ipRestrictions = ipRestrictions;
    if (timeRestrictions) updates.timeRestrictions = timeRestrictions;
    if (notes !== undefined) updates.notes = notes;

    const updatedAccess = await multiTenantService.updateTechnicianAccess(accessId, updates);

    res.json({
      success: true,
      data: updatedAccess,
      message: 'Access updated successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
});

/**
 * DELETE /api/access-management/access/:accessId - Revoke technician access
 */
router.delete('/access/:accessId', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin', 'account_manager']), async (req, res, next) => {
  try {
    const user = req.user as AuthPayload;
    const { accessId } = req.params;
    const { reason = 'Administrative revocation' } = req.body;

    await multiTenantService.revokeTechnicianAccess(accessId, user.userId, reason);

    res.json({
      success: true,
      message: 'Access revoked successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
});

/**
 * POST /api/access-management/handoff - Transfer access between technicians
 */
router.post('/handoff', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin', 'account_manager']), async (req, res, next) => {
  try {
    const user = req.user as AuthPayload;
    const {
      fromTechnicianId,
      toTechnicianId,
      customerOrgIds,
      reason,
      maintainOriginalAccess = false
    } = req.body;

    if (!fromTechnicianId || !toTechnicianId) {
      return res.status(400).json({
        success: false,
        error: 'Both source and destination technician IDs are required'
      });
    }

    if (fromTechnicianId === toTechnicianId) {
      return res.status(400).json({
        success: false,
        error: 'Source and destination technicians cannot be the same'
      });
    }

    const handoffData = {
      fromTechnicianId,
      toTechnicianId,
      customerOrgIds,
      reason,
      maintainOriginalAccess
    };

    const result = await multiTenantService.handoffTechnicianAccess(handoffData);

    res.json({
      success: true,
      data: result,
      message: 'Access handoff completed successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
});

/**
 * GET /api/access-management/technician/:technicianId - Get access for specific technician
 */
router.get('/technician/:technicianId', authMiddleware, requireOrganization('mss_provider'), async (req, res, next) => {
  try {
    const user = req.user as AuthPayload;
    const { technicianId } = req.params;

    // Technicians can view their own access, managers can view any
    if (user.role === 'technician' && user.userId !== technicianId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - can only view own access'
      });
    }

    const accessRecords = await multiTenantService.getTechnicianAccess(technicianId);

    res.json({
      success: true,
      data: {
        technicianId,
        accessRecords
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/access-management/customer/:customerId/technicians - Get technicians with access to customer
 */
router.get('/customer/:customerId/technicians', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user as AuthPayload;
    const { customerId } = req.params;

    // Authorization check
    const canView = 
      (user.orgType === 'customer' && user.orgId === customerId) ||
      (user.orgType === 'mss_provider' && ['super_admin', 'account_manager', 'security_analyst'].includes(user.role));

    if (!canView) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const db = getDB();
    const result = await db.query(`
      SELECT 
        tca.*,
        t.first_name as technician_first_name,
        t.last_name as technician_last_name,
        t.email as technician_email,
        t.role as technician_role,
        gb.first_name as granted_by_first_name,
        gb.last_name as granted_by_last_name
      FROM technician_customer_access tca
      JOIN users t ON tca.technician_id = t.id
      LEFT JOIN users gb ON tca.granted_by = gb.id
      WHERE tca.customer_org_id = $1 AND tca.status = 'active'
      ORDER BY tca.granted_at DESC
    `, [customerId]);

    const technicians = result.rows.map(row => ({
      access: {
        id: row.id,
        accessLevel: row.access_level,
        grantedAt: row.granted_at,
        grantedBy: row.granted_by,
        expiresAt: row.expires_at,
        allowedServices: row.allowed_services,
        ipRestrictions: row.ip_restrictions,
        timeRestrictions: typeof row.time_restrictions === 'string' 
          ? JSON.parse(row.time_restrictions || '{}') 
          : row.time_restrictions,
        notes: row.notes
      },
      technician: {
        id: row.technician_id,
        firstName: row.technician_first_name,
        lastName: row.technician_last_name,
        email: row.technician_email,
        role: row.technician_role
      },
      grantedBy: row.granted_by_first_name && row.granted_by_last_name
        ? `${row.granted_by_first_name} ${row.granted_by_last_name}`
        : null
    }));

    res.json({
      success: true,
      data: {
        customerId,
        technicians
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/access-management/summary - Get access management summary statistics
 */
router.get('/summary', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin', 'account_manager', 'security_analyst']), async (req, res, next) => {
  try {
    const db = getDB();
    
    // Get summary statistics
    const summaryResult = await db.query(`
      SELECT 
        COUNT(CASE WHEN tca.status = 'active' THEN 1 END) as active_access_grants,
        COUNT(CASE WHEN tca.status = 'revoked' THEN 1 END) as revoked_access_grants,
        COUNT(CASE WHEN tca.expires_at IS NOT NULL AND tca.expires_at < NOW() THEN 1 END) as expired_access_grants,
        COUNT(CASE WHEN tca.access_level = 'emergency' THEN 1 END) as emergency_access_grants,
        COUNT(DISTINCT tca.technician_id) as technicians_with_access,
        COUNT(DISTINCT tca.customer_org_id) as customers_with_access,
        COUNT(CASE WHEN tca.granted_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_grants,
        COUNT(CASE WHEN tca.revoked_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_revocations
      FROM technician_customer_access tca
    `);

    const summary = summaryResult.rows[0];

    // Get access level distribution
    const levelResult = await db.query(`
      SELECT access_level, COUNT(*) as count
      FROM technician_customer_access
      WHERE status = 'active'
      GROUP BY access_level
      ORDER BY count DESC
    `);

    const accessLevelDistribution = levelResult.rows.reduce((acc, row) => {
      acc[row.access_level] = parseInt(row.count);
      return acc;
    }, {});

    // Get top technicians by access count
    const topTechniciansResult = await db.query(`
      SELECT 
        t.id,
        t.first_name,
        t.last_name,
        t.email,
        COUNT(tca.id) as access_count
      FROM users t
      LEFT JOIN technician_customer_access tca ON t.id = tca.technician_id AND tca.status = 'active'
      WHERE t.role IN ('technician', 'security_analyst', 'super_admin')
      GROUP BY t.id, t.first_name, t.last_name, t.email
      ORDER BY access_count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        summary: {
          activeAccessGrants: parseInt(summary.active_access_grants),
          revokedAccessGrants: parseInt(summary.revoked_access_grants),
          expiredAccessGrants: parseInt(summary.expired_access_grants),
          emergencyAccessGrants: parseInt(summary.emergency_access_grants),
          techniciansWithAccess: parseInt(summary.technicians_with_access),
          customersWithAccess: parseInt(summary.customers_with_access),
          recentGrants: parseInt(summary.recent_grants),
          recentRevocations: parseInt(summary.recent_revocations)
        },
        accessLevelDistribution,
        topTechnicians: topTechniciansResult.rows.map(row => ({
          id: row.id,
          name: `${row.first_name} ${row.last_name}`,
          email: row.email,
          accessCount: parseInt(row.access_count)
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/access-management/bulk-revoke - Bulk revoke access (emergency function)
 */
router.post('/bulk-revoke', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin']), async (req, res, next) => {
  try {
    const user = req.user as AuthPayload;
    const { accessIds, reason = 'Bulk administrative revocation' } = req.body;

    if (!Array.isArray(accessIds) || accessIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Access IDs array is required and cannot be empty'
      });
    }

    const db = getDB();
    const results = [];

    // Begin transaction
    await db.query('BEGIN');

    try {
      for (const accessId of accessIds) {
        try {
          await multiTenantService.revokeTechnicianAccess(accessId, user.userId, reason);
          results.push({ accessId, status: 'revoked' });
        } catch (error) {
          results.push({ 
            accessId, 
            status: 'failed', 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      await db.query('COMMIT');

      // Log bulk revocation
      await auditService.log({
        userId: user.userId,
        organizationId: user.orgId,
        actionType: 'bulk_access_revoke',
        resourceType: 'technician_access',
        actionDescription: 'Bulk access revocation performed',
        actionData: { 
          totalRequested: accessIds.length, 
          successful: results.filter(r => r.status === 'revoked').length,
          failed: results.filter(r => r.status === 'failed').length,
          reason 
        },
        ipAddress: req.ip,
        riskLevel: 'high',
        complianceRelevant: true
      });

      res.json({
        success: true,
        data: {
          results,
          summary: {
            totalRequested: accessIds.length,
            successful: results.filter(r => r.status === 'revoked').length,
            failed: results.filter(r => r.status === 'failed').length
          }
        },
        message: 'Bulk revocation completed'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

export default router;