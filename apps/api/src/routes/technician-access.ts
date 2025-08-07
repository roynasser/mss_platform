import express from 'express';
import { getDB } from '@/database/connection';
import { authMiddleware, requireRole, requireOrganization } from '@/middleware/auth';
import { AuthPayload } from '@/types/auth';
import { multiTenantService } from '@/services/multi-tenant.service';
import { auditService } from '@/services/audit.service';

const router = express.Router();

/**
 * GET /api/technician-access/matrix - Get technician-customer access matrix
 */
router.get('/matrix', authMiddleware, requireOrganization('mss_provider'), async (req, res) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    
    // Get all technicians and customers with their access relationships
    const result = await db.query(`
      SELECT 
        t.id as technician_id,
        t.first_name as technician_first_name,
        t.last_name as technician_last_name,
        t.email as technician_email,
        t.role as technician_role,
        t.status as technician_status,
        
        c.id as customer_org_id,
        c.name as customer_org_name,
        c.domain as customer_domain,
        c.status as customer_status,
        
        tca.id as access_id,
        tca.access_level,
        tca.allowed_services,
        tca.ip_restrictions,
        tca.time_restrictions,
        tca.granted_at,
        tca.granted_by,
        tca.expires_at,
        tca.status as access_status,
        tca.notes,
        
        gb.first_name as granted_by_first_name,
        gb.last_name as granted_by_last_name
        
      FROM users t
      CROSS JOIN organizations c
      LEFT JOIN technician_customer_access tca ON (
        t.id = tca.technician_id AND 
        c.id = tca.customer_org_id AND 
        tca.status = 'active'
      )
      LEFT JOIN users gb ON tca.granted_by = gb.id
      WHERE 
        t.org_id = (SELECT id FROM organizations WHERE type = 'mss_provider')
        AND t.role IN ('technician', 'security_analyst', 'super_admin')
        AND t.status = 'active'
        AND c.type = 'customer'
        AND c.status = 'active'
      ORDER BY t.last_name, t.first_name, c.name
    `);
    
    // Transform the result into a matrix format
    const matrix: any = {};
    const technicians: any = {};
    const customers: any = {};
    
    result.rows.forEach(row => {
      // Track technicians
      if (!technicians[row.technician_id]) {
        technicians[row.technician_id] = {
          id: row.technician_id,
          firstName: row.technician_first_name,
          lastName: row.technician_last_name,
          email: row.technician_email,
          role: row.technician_role,
          status: row.technician_status
        };
      }
      
      // Track customers
      if (!customers[row.customer_org_id]) {
        customers[row.customer_org_id] = {
          id: row.customer_org_id,
          name: row.customer_org_name,
          domain: row.customer_domain,
          status: row.customer_status
        };
      }
      
      // Track access relationships
      const key = `${row.technician_id}_${row.customer_org_id}`;
      matrix[key] = {
        technicianId: row.technician_id,
        customerOrgId: row.customer_org_id,
        hasAccess: !!row.access_id,
        access: row.access_id ? {
          id: row.access_id,
          accessLevel: row.access_level,
          allowedServices: row.allowed_services,
          ipRestrictions: row.ip_restrictions,
          timeRestrictions: typeof row.time_restrictions === 'string' ? JSON.parse(row.time_restrictions || '{}') : row.time_restrictions,
          grantedAt: row.granted_at,
          grantedBy: row.granted_by,
          grantedByName: row.granted_by_first_name && row.granted_by_last_name 
            ? `${row.granted_by_first_name} ${row.granted_by_last_name}`
            : null,
          expiresAt: row.expires_at,
          status: row.access_status,
          notes: row.notes
        } : null
      };
    });
    
    res.json({
      success: true,
      data: {
        matrix,
        technicians: Object.values(technicians),
        customers: Object.values(customers)
      }
    });
  } catch (error) {
    console.error('Error fetching technician access matrix:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch access matrix'
    });
  }
});

/**
 * POST /api/technician-access/grant - Grant technician access to customer
 */
router.post('/grant', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin', 'account_manager']), async (req, res) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const {
      technicianId,
      customerOrgId,
      accessLevel = 'standard',
      permissions = {},
      restrictions = {},
      expiresAt,
      isEmergency = false,
      reason
    } = req.body;
    
    // Validation
    if (!technicianId || !customerOrgId) {
      return res.status(400).json({
        success: false,
        error: 'Technician ID and Customer Organization ID are required'
      });
    }
    
    // Verify technician exists and is from MSS provider
    const techResult = await db.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.role
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.id = $1 AND o.type = 'mss_provider' AND u.role IN ('technician', 'security_analyst', 'super_admin')
    `, [technicianId]);
    
    if (techResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Technician not found or invalid'
      });
    }
    
    // Verify customer organization exists
    const customerResult = await db.query(`
      SELECT id, name FROM organizations WHERE id = $1 AND type = 'customer'
    `, [customerOrgId]);
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer organization not found'
      });
    }
    
    const technician = techResult.rows[0];
    const customer = customerResult.rows[0];
    
    // Check if access already exists and is active
    const existingAccess = await db.query(`
      SELECT id FROM technician_customer_access 
      WHERE technician_id = $1 AND customer_org_id = $2 AND status = 'active'
    `, [technicianId, customerOrgId]);
    
    if (existingAccess.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Active access already exists for this technician-customer pair'
      });
    }
    
    // Validate access level
    const validAccessLevels = ['read_only', 'standard', 'elevated', 'emergency'];
    if (!validAccessLevels.includes(accessLevel)) {
      return res.status(400).json({
        success: false,
        error: `Invalid access level. Must be one of: ${validAccessLevels.join(', ')}`
      });
    }
    
    // Set default services based on access level
    const defaultServices = {
      read_only: ['reports', 'alerts'],
      full_access: ['reports', 'alerts', 'interventions', 'configurations'],
      emergency: ['reports', 'alerts', 'interventions', 'configurations', 'emergency_access']
    };
    
    const finalServices = permissions?.allowedServices || defaultServices[accessLevel] || defaultServices.read_only;
    
    // Create access record
    const accessResult = await db.query(`
      INSERT INTO technician_customer_access (
        technician_id,
        customer_org_id,
        access_level,
        granted_by,
        granted_at,
        expires_at,
        allowed_services,
        ip_restrictions,
        time_restrictions,
        status,
        notes
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, 'active', $9)
      RETURNING *
    `, [
      technicianId,
      customerOrgId,
      accessLevel,
      user.userId,
      expiresAt,
      finalServices,
      restrictions?.ipRestrictions || null,
      JSON.stringify(restrictions?.timeRestrictions || {}),
      reason
    ]);
    
    const newAccess = accessResult.rows[0];
    
    // Log audit event
    await auditService.logTechnicianAccessAction(
      user.userId,
      user.orgId,
      'grant',
      newAccess.id,
      technician.email,
      customer.name,
      {
        accessLevel,
        allowedServices: finalServices,
        restrictions,
        expiresAt,
        reason
      },
      req.ip
    );
    
    // Send notification to technician (would integrate with notification service)
    // For now, just log it
    console.log(`Access granted: ${technician.email} -> ${customer.name} (${accessLevel})`);
    
    res.status(201).json({
      success: true,
      data: {
        ...newAccess,
        technician: {
          id: technician.id,
          name: `${technician.first_name} ${technician.last_name}`,
          email: technician.email,
          role: technician.role
        },
        customer: {
          id: customer.id,
          name: customer.name
        }
      },
      message: 'Technician access granted successfully'
    });
  } catch (error) {
    console.error('Error granting technician access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to grant access'
    });
  }
});

/**
 * PUT /api/technician-access/:accessId - Update technician access
 */
router.put('/:accessId', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin', 'account_manager']), async (req, res) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { accessId } = req.params;
    const { accessLevel, permissions, restrictions, expiresAt, reason } = req.body;
    
    // Get current access record
    const currentAccess = await db.query(`
      SELECT 
        tca.*,
        t.first_name as tech_first_name,
        t.last_name as tech_last_name,
        t.email as tech_email,
        o.name as customer_name
      FROM technician_customer_access tca
      JOIN users t ON tca.technician_id = t.id
      JOIN organizations o ON tca.customer_org_id = o.id
      WHERE tca.id = $1
    `, [accessId]);
    
    if (currentAccess.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Access record not found'
      });
    }
    
    const current = currentAccess.rows[0];
    
    // Build updates
    const updates: any = {};
    if (accessLevel) updates.access_level = accessLevel;
    if (permissions?.allowedServices) updates.allowed_services = permissions.allowedServices;
    if (restrictions?.ipRestrictions) updates.ip_restrictions = restrictions.ipRestrictions;
    if (restrictions?.timeRestrictions) updates.time_restrictions = JSON.stringify(restrictions.timeRestrictions);
    if (expiresAt !== undefined) updates.expires_at = expiresAt;
    if (reason) updates.notes = reason;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No updates provided'
      });
    }
    
    // Build update query
    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [accessId, ...Object.values(updates)];
    
    const result = await db.query(`
      UPDATE technician_customer_access 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, values);
    
    // Log audit event
    await auditService.logTechnicianAccessAction(
      user.userId,
      user.orgId,
      'update',
      accessId,
      current.tech_email,
      current.customer_name,
      {
        changes: updates,
        reason
      },
      req.ip
    );
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Access updated successfully'
    });
  } catch (error) {
    console.error('Error updating technician access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update access'
    });
  }
});

/**
 * DELETE /api/technician-access/:accessId - Revoke technician access
 */
router.delete('/:accessId', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin', 'account_manager']), async (req, res) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { accessId } = req.params;
    const { reason = 'Administrative revocation' } = req.body;
    
    // Get current access record
    const currentAccess = await db.query(`
      SELECT 
        tca.*,
        t.first_name as tech_first_name,
        t.last_name as tech_last_name,
        t.email as tech_email,
        o.name as customer_name
      FROM technician_customer_access tca
      JOIN users t ON tca.technician_id = t.id
      JOIN organizations o ON tca.customer_org_id = o.id
      WHERE tca.id = $1 AND tca.status = 'active'
    `, [accessId]);
    
    if (currentAccess.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Active access record not found'
      });
    }
    
    const current = currentAccess.rows[0];
    
    // Revoke access
    await db.query(`
      UPDATE technician_customer_access 
      SET 
        status = 'revoked',
        revoked_at = CURRENT_TIMESTAMP,
        revoked_by = $1,
        revoked_reason = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [user.userId, reason, accessId]);
    
    // Log audit event
    await auditService.logTechnicianAccessAction(
      user.userId,
      user.orgId,
      'revoke',
      accessId,
      current.tech_email,
      current.customer_name,
      {
        accessLevel: current.access_level,
        reason
      },
      req.ip
    );
    
    res.json({
      success: true,
      message: 'Access revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking technician access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke access'
    });
  }
});

/**
 * POST /api/technician-access/handoff - Transfer all customer access from one technician to another
 */
router.post('/handoff', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin', 'account_manager']), async (req, res) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { fromTechnicianId, toTechnicianId, customerOrgIds, reason, maintainOriginalAccess = false } = req.body;
    
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
    
    // Verify both technicians exist
    const techniciansCheck = await db.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.role
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.id IN ($1, $2) AND o.type = 'mss_provider' 
        AND u.role IN ('technician', 'security_analyst', 'super_admin')
        AND u.status = 'active'
    `, [fromTechnicianId, toTechnicianId]);
    
    if (techniciansCheck.rows.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'One or both technicians not found or invalid'
      });
    }
    
    const fromTech = techniciansCheck.rows.find(t => t.id === fromTechnicianId);
    const toTech = techniciansCheck.rows.find(t => t.id === toTechnicianId);
    
    // Get access records to transfer
    let accessQuery = `
      SELECT ta.*, o.name as customer_name
      FROM technician_access ta
      JOIN organizations o ON ta.customer_org_id = o.id
      WHERE ta.technician_id = $1 AND ta.status = 'active'
    `;
    const queryParams = [fromTechnicianId];
    
    if (customerOrgIds && Array.isArray(customerOrgIds) && customerOrgIds.length > 0) {
      accessQuery += ` AND ta.customer_org_id = ANY($2)`;
      queryParams.push(customerOrgIds);
    }
    
    const accessRecords = await db.query(accessQuery, queryParams);
    
    if (accessRecords.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active access records found to transfer'
      });
    }
    
    const transferResults = [];
    
    // Begin transaction
    await db.query('BEGIN');
    
    try {
      for (const access of accessRecords.rows) {
        // Check if destination technician already has access
        const existingAccess = await db.query(`
          SELECT id FROM technician_customer_access 
          WHERE technician_id = $1 AND customer_org_id = $2 AND status = 'active'
        `, [toTechnicianId, access.customer_org_id]);
        
        if (existingAccess.rows.length > 0) {
          // Skip if already has access
          transferResults.push({
            customerOrgId: access.customer_org_id,
            customerName: access.customer_name,
            status: 'skipped',
            reason: 'Destination technician already has active access'
          });
          continue;
        }
        
        // Create new access for destination technician
        const newAccessResult = await db.query(`
          INSERT INTO technician_customer_access (
            technician_id,
            customer_org_id,
            access_level,
            allowed_services,
            ip_restrictions,
            time_restrictions,
            granted_by,
            granted_at,
            expires_at,
            status,
            notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, 'active', $9)
          RETURNING id
        `, [
          toTechnicianId,
          access.customer_org_id,
          access.access_level,
          access.allowed_services,
          access.ip_restrictions,
          access.time_restrictions,
          user.userId,
          access.expires_at,
          `Transferred from ${fromTech.first_name} ${fromTech.last_name}. ${reason || ''}`
        ]);
        
        // Revoke original access (we don't maintain dual access in this implementation)
        await db.query(`
          UPDATE technician_customer_access 
          SET 
            status = 'revoked',
            revoked_at = CURRENT_TIMESTAMP,
            revoked_by = $1,
            revoked_reason = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [user.userId, `Access transferred to ${toTech.first_name} ${toTech.last_name}`, access.id]);
        
        transferResults.push({
          customerOrgId: access.customer_org_id,
          customerName: access.customer_name,
          status: 'transferred',
          newAccessId: newAccessResult.rows[0].id
        });
      }
      
      // Log audit event
      await auditService.logTechnicianAccessAction(
        user.userId,
        user.orgId,
        'handoff',
        'bulk_operation',
        `${fromTech.first_name} ${fromTech.last_name}`,
        'multiple customers',
        {
          toTechnician: `${toTech.first_name} ${toTech.last_name}`,
          transferredCount: transferResults.filter(r => r.status === 'transferred').length,
          reason,
          results: transferResults
        },
        req.ip
      );
      
      await db.query('COMMIT');
      
      res.json({
        success: true,
        data: {
          fromTechnician: {
            id: fromTech.id,
            name: `${fromTech.first_name} ${fromTech.last_name}`,
            email: fromTech.email
          },
          toTechnician: {
            id: toTech.id,
            name: `${toTech.first_name} ${toTech.last_name}`,
            email: toTech.email
          },
          results: transferResults,
          summary: {
            total: transferResults.length,
            transferred: transferResults.filter(r => r.status === 'transferred').length,
            skipped: transferResults.filter(r => r.status === 'skipped').length
          }
        },
        message: 'Access handoff completed successfully'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error performing access handoff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform access handoff'
    });
  }
});

/**
 * GET /api/technician-access/technician/:technicianId - Get access for specific technician
 */
router.get('/technician/:technicianId', authMiddleware, requireOrganization('mss_provider'), async (req, res) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { technicianId } = req.params;
    
    // Authorization check - technicians can view their own access, managers can view any
    if (user.role === 'technician' && user.userId !== technicianId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - can only view own access'
      });
    }
    
    const result = await db.query(`
      SELECT 
        tca.*,
        o.name as customer_name,
        o.domain as customer_domain,
        o.status as customer_status,
        gb.first_name as granted_by_first_name,
        gb.last_name as granted_by_last_name
      FROM technician_customer_access tca
      JOIN organizations o ON tca.customer_org_id = o.id
      LEFT JOIN users gb ON tca.granted_by = gb.id
      WHERE tca.technician_id = $1 AND tca.status = 'active'
      ORDER BY tca.granted_at DESC
    `, [technicianId]);
    
    res.json({
      success: true,
      data: {
        technicianId,
        accessRecords: result.rows.map(row => ({
          id: row.id,
          customerOrg: {
            id: row.customer_org_id,
            name: row.customer_name,
            domain: row.customer_domain,
            status: row.customer_status
          },
          accessLevel: row.access_level,
          allowedServices: row.allowed_services,
          ipRestrictions: row.ip_restrictions,
          timeRestrictions: typeof row.time_restrictions === 'string' ? JSON.parse(row.time_restrictions || '{}') : row.time_restrictions,
          grantedAt: row.granted_at,
          grantedBy: row.granted_by_first_name && row.granted_by_last_name 
            ? `${row.granted_by_first_name} ${row.granted_by_last_name}`
            : null,
          expiresAt: row.expires_at,
          notes: row.notes
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching technician access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch technician access'
    });
  }
});

/**
 * POST /api/technician-access/:accessId/record-access - Record access usage
 */
router.post('/:accessId/record-access', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { accessId } = req.params;
    const { action, metadata = {} } = req.body;
    
    // Verify access exists and user is the technician
    const accessCheck = await db.query(`
      SELECT tca.* FROM technician_customer_access tca
      WHERE tca.id = $1 AND tca.technician_id = $2 AND tca.status = 'active'
    `, [accessId, user.userId]);
    
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied or access record not found'
      });
    }
    
    const access = accessCheck.rows[0];
    
    // Check if access has expired
    if (access.expires_at && new Date() > new Date(access.expires_at)) {
      return res.status(403).json({
        success: false,
        error: 'Access has expired'
      });
    }
    
    // Update last accessed timestamp by updating the record
    await db.query(`
      UPDATE technician_customer_access 
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [accessId]);
    
    // Log the access usage in audit logs
    await auditService.log({
      userId: user.userId,
      organizationId: user.orgId,
      actionType: 'access_used',
      resourceType: 'technician_access',
      resourceId: accessId,
      actionDescription: `Technician access used: ${action}`,
      actionData: { action, metadata },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      riskLevel: 'low'
    });
    
    res.json({
      success: true,
      message: 'Access recorded successfully'
    });
  } catch (error) {
    console.error('Error recording access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record access'
    });
  }
});

export default router;