import express from 'express';
import { getDB } from '@/database/connection';
import { authMiddleware, requireRole, requireOrganization } from '@/middleware/auth';
import { AuthPayload } from '@/types/auth';
import { multiTenantService } from '@/services/multi-tenant.service';
import { auditService } from '@/services/audit.service';

const router = express.Router();

/**
 * GET /api/organizations - List all organizations (MSS provider only)
 */
router.get('/', authMiddleware, requireOrganization('mss_provider'), async (req, res) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    
    // Build query based on user role
    let query = `
      SELECT 
        o.id,
        o.name,
        o.type,
        o.domain,
        o.sso_enabled,
        o.status,
        o.settings,
        o.created_at,
        o.updated_at,
        COUNT(u.id) as user_count,
        COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_users
      FROM organizations o
      LEFT JOIN users u ON o.id = u.org_id
    `;
    
    const params: any[] = [];
    
    // Super admin sees all, others see limited scope
    if (user.role !== 'super_admin') {
      query += ` WHERE o.type = 'customer'`;
    }
    
    query += `
      GROUP BY o.id, o.name, o.type, o.domain, o.sso_enabled, o.status, o.settings, o.created_at, o.updated_at
      ORDER BY o.created_at DESC
    `;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: {
        organizations: result.rows,
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organizations'
    });
  }
});

/**
 * GET /api/organizations/:id - Get specific organization details
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { id } = req.params;
    
    // Check authorization
    if (user.orgType === 'customer' && user.orgId !== id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - can only view own organization'
      });
    }
    
    const result = await db.query(`
      SELECT 
        o.*,
        COUNT(u.id) as user_count,
        COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin_count,
        MAX(u.last_login_at) as last_user_activity
      FROM organizations o
      LEFT JOIN users u ON o.id = u.org_id
      WHERE o.id = $1
      GROUP BY o.id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organization'
    });
  }
});

/**
 * POST /api/organizations - Create new customer organization (MSS provider only)
 */
router.post('/', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin', 'account_manager']), async (req, res) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { name, domain, settings = {} } = req.body;
    
    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Organization name is required'
      });
    }
    
    // Check for duplicate names
    const existingOrg = await db.query(
      'SELECT id FROM organizations WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    
    if (existingOrg.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Organization name already exists'
      });
    }
    
    // Create organization
    const result = await db.query(`
      INSERT INTO organizations (name, type, domain, settings, created_by)
      VALUES ($1, 'customer', $2, $3, $4)
      RETURNING *
    `, [name, domain, JSON.stringify(settings), user.userId]);
    
    const newOrg = result.rows[0];
    
    // Log audit event
    await auditService.logOrganizationAction(
      user.userId,
      user.orgId,
      'create',
      newOrg.id,
      name,
      { domain, settings },
      req.ip
    );
    
    res.status(201).json({
      success: true,
      data: newOrg,
      message: 'Organization created successfully'
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create organization'
    });
  }
});

/**
 * PUT /api/organizations/:id - Update organization
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { id } = req.params;
    const { name, domain, sso_enabled, settings, status } = req.body;
    
    // Check authorization
    const canUpdate = 
      (user.orgType === 'customer' && user.orgId === id && user.role === 'admin') ||
      (user.orgType === 'mss_provider' && ['super_admin', 'account_manager'].includes(user.role));
    
    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update organization'
      });
    }
    
    // Get current organization
    const orgCheck = await db.query('SELECT * FROM organizations WHERE id = $1', [id]);
    if (orgCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }
    
    const currentOrg = orgCheck.rows[0];
    
    // Prevent customers from changing critical settings
    const updates: any = {};
    if (name && (user.orgType === 'mss_provider' || user.role === 'admin')) updates.name = name;
    if (domain && user.orgType === 'mss_provider') updates.domain = domain;
    if (typeof sso_enabled === 'boolean' && user.orgType === 'mss_provider') updates.sso_enabled = sso_enabled;
    if (settings && typeof settings === 'object') {
      // Merge settings safely
      updates.settings = JSON.stringify({
        ...JSON.parse(currentOrg.settings || '{}'),
        ...settings
      });
    }
    if (status && user.orgType === 'mss_provider') updates.status = status;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid updates provided'
      });
    }
    
    // Build update query
    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    
    const result = await db.query(`
      UPDATE organizations 
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `, values);
    
    // Log audit event
    await auditService.logOrganizationAction(
      user.userId,
      user.orgId,
      'update',
      id,
      currentOrg.name,
      updates,
      req.ip
    );
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Organization updated successfully'
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update organization'
    });
  }
});

/**
 * DELETE /api/organizations/:id - Soft delete organization (MSS provider only)
 */
router.delete('/:id', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin']), async (req, res) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { id } = req.params;
    
    // Check if organization exists and is not MSS provider
    const orgCheck = await db.query(
      'SELECT * FROM organizations WHERE id = $1 AND type = $2',
      [id, 'customer']
    );
    
    if (orgCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer organization not found'
      });
    }
    
    // Soft delete by updating status
    await db.query(`
      UPDATE organizations 
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
    
    // Also soft delete all users in the organization
    await db.query(`
      UPDATE users 
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE org_id = $1
    `, [id]);
    
    // Log audit event
    await auditService.logOrganizationAction(
      user.userId,
      user.orgId,
      'delete',
      id,
      orgCheck.rows[0].name,
      { reason: 'Administrative deletion' },
      req.ip
    );
    
    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete organization'
    });
  }
});

/**
 * GET /api/organizations/:id/users - Get organization users
 */
router.get('/:id/users', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { id } = req.params;
    const { status, role, limit = 50, offset = 0 } = req.query;
    
    // Check authorization
    const canView = 
      (user.orgType === 'customer' && user.orgId === id) ||
      (user.orgType === 'mss_provider' && ['super_admin', 'account_manager'].includes(user.role));
    
    if (!canView) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Build query
    let query = `
      SELECT 
        u.id,
        u.email,
        u.email_verified,
        u.first_name,
        u.last_name,
        u.role,
        u.status,
        u.mfa_enabled,
        u.last_login_at,
        u.last_login_ip,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.org_id = $1
    `;
    
    const params: any[] = [id];
    let paramIndex = 2;
    
    if (status) {
      query += ` AND u.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (role) {
      query += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }
    
    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await db.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM users u WHERE u.org_id = $1';
    const countParams: any[] = [id];
    let countParamIndex = 2;
    
    if (status) {
      countQuery += ` AND u.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }
    
    if (role) {
      countQuery += ` AND u.role = $${countParamIndex}`;
      countParams.push(role);
    }
    
    const countResult = await db.query(countQuery, countParams);
    
    res.json({
      success: true,
      data: {
        users: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    console.error('Error fetching organization users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

/**
 * GET /api/organizations/:id/stats - Get organization statistics
 */
router.get('/:id/stats', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { id } = req.params;
    
    // Check authorization
    const canView = 
      (user.orgType === 'customer' && user.orgId === id) ||
      (user.orgType === 'mss_provider');
    
    if (!canView) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Get comprehensive stats
    const statsQuery = `
      SELECT 
        -- User stats
        COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN u.status = 'suspended' THEN 1 END) as suspended_users,
        COUNT(CASE WHEN u.mfa_enabled = true THEN 1 END) as mfa_enabled_users,
        COUNT(CASE WHEN u.last_login_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_logins,
        
        -- Role distribution
        COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN u.role = 'report_viewer' THEN 1 END) as report_viewer_count,
        COUNT(CASE WHEN u.role = 'request_user' THEN 1 END) as request_user_count,
        COUNT(CASE WHEN u.role = 'basic_user' THEN 1 END) as basic_user_count,
        
        -- Activity stats
        COUNT(CASE WHEN sr.id IS NOT NULL THEN 1 END) as total_reports,
        COUNT(CASE WHEN sr.status = 'published' THEN 1 END) as published_reports,
        COUNT(CASE WHEN a.id IS NOT NULL THEN 1 END) as total_alerts,
        COUNT(CASE WHEN a.is_resolved = false THEN 1 END) as active_alerts,
        COUNT(CASE WHEN i.id IS NOT NULL THEN 1 END) as total_interventions,
        COUNT(CASE WHEN i.status IN ('pending', 'assigned', 'in_progress') THEN 1 END) as active_interventions
        
      FROM organizations o
      LEFT JOIN users u ON o.id = u.org_id
      LEFT JOIN security_reports sr ON o.id = sr.customer_org_id
      LEFT JOIN alerts a ON o.id = a.customer_org_id
      LEFT JOIN interventions i ON o.id = i.customer_org_id
      WHERE o.id = $1
      GROUP BY o.id
    `;
    
    const result = await db.query(statsQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }
    
    const stats = result.rows[0];
    
    res.json({
      success: true,
      data: {
        users: {
          total: parseInt(stats.active_users) + parseInt(stats.suspended_users),
          active: parseInt(stats.active_users),
          suspended: parseInt(stats.suspended_users),
          mfaEnabled: parseInt(stats.mfa_enabled_users),
          recentLogins: parseInt(stats.recent_logins)
        },
        roles: {
          admin: parseInt(stats.admin_count),
          reportViewer: parseInt(stats.report_viewer_count),
          requestUser: parseInt(stats.request_user_count),
          basicUser: parseInt(stats.basic_user_count)
        },
        activity: {
          reports: {
            total: parseInt(stats.total_reports),
            published: parseInt(stats.published_reports)
          },
          alerts: {
            total: parseInt(stats.total_alerts),
            active: parseInt(stats.active_alerts)
          },
          interventions: {
            total: parseInt(stats.total_interventions),
            active: parseInt(stats.active_interventions)
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching organization stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

export default router;