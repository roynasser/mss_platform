import express from 'express';
import { getDB } from '@/database/connection';
import { authMiddleware, requireRole, requireOrganization } from '@/middleware/auth';
import { AuthPayload } from '@/types/auth';

const router = express.Router();

/**
 * POST /api/emergency-access/request - Request emergency access
 */
router.post('/request', authMiddleware, requireOrganization('mss_provider'), requireRole(['technician', 'security_analyst']), async (req, res) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { customerOrgId, accessLevel, justification, urgency = 'high' } = req.body;
    
    // Validation
    if (!customerOrgId || !justification) {
      return res.status(400).json({
        success: false,
        error: 'Customer organization ID and justification are required'
      });
    }
    
    if (!['elevated', 'emergency'].includes(accessLevel)) {
      return res.status(400).json({
        success: false,
        error: 'Access level must be "elevated" or "emergency"'
      });
    }
    
    if (justification.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Justification must be at least 20 characters'
      });
    }
    
    // Verify customer organization exists
    const customerResult = await db.query(
      'SELECT id, name FROM organizations WHERE id = $1 AND type = $2',
      [customerOrgId, 'customer']
    );
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer organization not found'
      });
    }
    
    const customer = customerResult.rows[0];
    
    // Check if technician already has active access
    const existingAccess = await db.query(`
      SELECT id FROM technician_access 
      WHERE technician_id = $1 AND customer_org_id = $2 AND status = 'active'
    `, [user.userId, customerOrgId]);
    
    if (existingAccess.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'You already have active access to this customer organization'
      });
    }
    
    // Check for pending requests
    const pendingRequest = await db.query(`
      SELECT id FROM emergency_access_requests 
      WHERE technician_id = $1 AND customer_org_id = $2 AND status = 'pending'
    `, [user.userId, customerOrgId]);
    
    if (pendingRequest.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'You already have a pending emergency access request for this customer'
      });
    }
    
    // Get customer access preferences
    const preferencesResult = await db.query(`
      SELECT * FROM customer_access_preferences WHERE customer_org_id = $1
    `, [customerOrgId]);
    
    const preferences = preferencesResult.rows[0] || {
      require_approval_for_elevated: true,
      require_approval_for_emergency: true
    };
    
    // Determine if approval is required
    const requiresApproval = 
      (accessLevel === 'elevated' && preferences.require_approval_for_elevated) ||
      (accessLevel === 'emergency' && preferences.require_approval_for_emergency);
    
    // Create emergency access request
    const requestResult = await db.query(`
      INSERT INTO emergency_access_requests (
        technician_id,
        customer_org_id,
        requested_access_level,
        justification,
        urgency,
        status,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      user.userId,
      customerOrgId,
      accessLevel,
      justification,
      urgency,
      requiresApproval ? 'pending' : 'approved',
      new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    ]);
    
    const request = requestResult.rows[0];
    
    // If auto-approval, create the access immediately
    if (!requiresApproval) {
      const permissions = {
        viewReports: true,
        viewAlerts: true,
        viewInterventions: true,
        createInterventions: true,
        modifyCustomerData: accessLevel === 'emergency',
        accessSensitiveData: accessLevel === 'emergency',
        emergencyOverride: accessLevel === 'emergency'
      };
      
      await db.query(`
        INSERT INTO technician_access (
          technician_id,
          customer_org_id,
          access_level,
          permissions,
          granted_by,
          granted_at,
          expires_at,
          is_emergency,
          reason,
          status
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, true, $7, 'active')
      `, [
        user.userId,
        customerOrgId,
        accessLevel,
        JSON.stringify(permissions),
        user.userId, // Self-granted for emergency
        new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours emergency access
        `Emergency access: ${justification}`
      ]);
      
      // Update request status
      await db.query(`
        UPDATE emergency_access_requests
        SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = $1
        WHERE id = $2
      `, [user.userId, request.id]);
    }
    
    // Log audit event
    await db.query(`
      INSERT INTO audit_logs (
        user_id,
        org_id,
        action,
        resource_type,
        resource_id,
        details,
        ip_address
      ) VALUES ($1, $2, 'request_emergency_access', 'emergency_access_request', $3, $4, $5)
    `, [
      user.userId,
      user.orgId,
      request.id,
      JSON.stringify({
        customer: customer.name,
        accessLevel,
        justification,
        urgency,
        requiresApproval,
        autoApproved: !requiresApproval
      }),
      req.ip
    ]);
    
    // Notify approvers if approval is required
    if (requiresApproval) {
      // TODO: Send notification to super_admins and account_managers
      console.log(`Emergency access request created: ${user.userId} -> ${customer.name} (${accessLevel})`);
    }
    
    res.status(201).json({
      success: true,
      data: {
        id: request.id,
        status: request.status,
        customer: {
          id: customer.id,
          name: customer.name
        },
        accessLevel,
        justification,
        urgency,
        requiresApproval,
        autoApproved: !requiresApproval,
        expiresAt: request.expires_at,
        createdAt: request.created_at
      },
      message: requiresApproval 
        ? 'Emergency access request submitted for approval' 
        : 'Emergency access granted automatically'\n    });\n  } catch (error) {\n    console.error('Error creating emergency access request:', error);\n    res.status(500).json({\n      success: false,\n      error: 'Failed to create emergency access request'\n    });\n  }\n});\n\n/**\n * GET /api/emergency-access/requests - Get emergency access requests\n */\nrouter.get('/requests', authMiddleware, requireOrganization('mss_provider'), async (req, res) => {\n  try {\n    const db = getDB();\n    const user = req.user as AuthPayload;\n    const { status, urgency, limit = 20, offset = 0 } = req.query;\n    \n    let query = `\n      SELECT \n        ear.*,\n        t.first_name as technician_first_name,\n        t.last_name as technician_last_name,\n        t.email as technician_email,\n        o.name as customer_name,\n        approver.first_name as approved_by_first_name,\n        approver.last_name as approved_by_last_name,\n        rejecter.first_name as rejected_by_first_name,\n        rejecter.last_name as rejected_by_last_name\n      FROM emergency_access_requests ear\n      JOIN users t ON ear.technician_id = t.id\n      JOIN organizations o ON ear.customer_org_id = o.id\n      LEFT JOIN users approver ON ear.approved_by = approver.id\n      LEFT JOIN users rejecter ON ear.rejected_by = rejecter.id\n      WHERE 1=1\n    `;\n    \n    const params: any[] = [];\n    let paramIndex = 1;\n    \n    // Role-based filtering\n    if (user.role === 'technician' || user.role === 'security_analyst') {\n      // Technicians can only see their own requests\n      query += ` AND ear.technician_id = $${paramIndex}`;\n      params.push(user.userId);\n      paramIndex++;\n    }\n    \n    // Status filter\n    if (status) {\n      query += ` AND ear.status = $${paramIndex}`;\n      params.push(status);\n      paramIndex++;\n    }\n    \n    // Urgency filter\n    if (urgency) {\n      query += ` AND ear.urgency = $${paramIndex}`;\n      params.push(urgency);\n      paramIndex++;\n    }\n    \n    query += ` ORDER BY ear.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;\n    params.push(parseInt(limit as string), parseInt(offset as string));\n    \n    const result = await db.query(query, params);\n    \n    // Get total count\n    let countQuery = query.substring(0, query.indexOf('ORDER BY')).replace(\n      /SELECT[\\s\\S]*?FROM/,\n      'SELECT COUNT(*) FROM'\n    );\n    const countParams = params.slice(0, -2);\n    \n    const countResult = await db.query(countQuery, countParams);\n    const total = parseInt(countResult.rows[0].count);\n    \n    res.json({\n      success: true,\n      data: {\n        requests: result.rows.map(row => ({\n          id: row.id,\n          technician: {\n            id: row.technician_id,\n            name: `${row.technician_first_name} ${row.technician_last_name}`,\n            email: row.technician_email\n          },\n          customer: {\n            id: row.customer_org_id,\n            name: row.customer_name\n          },\n          accessLevel: row.requested_access_level,\n          justification: row.justification,\n          urgency: row.urgency,\n          status: row.status,\n          approvedBy: row.approved_by_first_name && row.approved_by_last_name\n            ? `${row.approved_by_first_name} ${row.approved_by_last_name}`\n            : null,\n          approvedAt: row.approved_at,\n          rejectedBy: row.rejected_by_first_name && row.rejected_by_last_name\n            ? `${row.rejected_by_first_name} ${row.rejected_by_last_name}`\n            : null,\n          rejectedAt: row.rejected_at,\n          rejectionReason: row.rejection_reason,\n          expiresAt: row.expires_at,\n          createdAt: row.created_at\n        })),\n        total,\n        limit: parseInt(limit as string),\n        offset: parseInt(offset as string)\n      }\n    });\n  } catch (error) {\n    console.error('Error fetching emergency access requests:', error);\n    res.status(500).json({\n      success: false,\n      error: 'Failed to fetch requests'\n    });\n  }\n});\n\n/**\n * PUT /api/emergency-access/requests/:requestId/approve - Approve emergency access request\n */\nrouter.put('/requests/:requestId/approve', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin', 'account_manager']), async (req, res) => {\n  try {\n    const db = getDB();\n    const user = req.user as AuthPayload;\n    const { requestId } = req.params;\n    const { accessDuration = 8, conditions = {} } = req.body; // Default 8 hours\n    \n    // Get request details\n    const requestResult = await db.query(`\n      SELECT \n        ear.*,\n        t.first_name as tech_first_name,\n        t.last_name as tech_last_name,\n        o.name as customer_name\n      FROM emergency_access_requests ear\n      JOIN users t ON ear.technician_id = t.id\n      JOIN organizations o ON ear.customer_org_id = o.id\n      WHERE ear.id = $1 AND ear.status = 'pending'\n    `, [requestId]);\n    \n    if (requestResult.rows.length === 0) {\n      return res.status(404).json({\n        success: false,\n        error: 'Pending request not found'\n      });\n    }\n    \n    const request = requestResult.rows[0];\n    \n    // Check if request has expired\n    if (new Date() > new Date(request.expires_at)) {\n      await db.query(`\n        UPDATE emergency_access_requests\n        SET status = 'expired', updated_at = CURRENT_TIMESTAMP\n        WHERE id = $1\n      `, [requestId]);\n      \n      return res.status(410).json({\n        success: false,\n        error: 'Request has expired'\n      });\n    }\n    \n    // Create technician access\n    const permissions = {\n      viewReports: true,\n      viewAlerts: true,\n      viewInterventions: true,\n      createInterventions: true,\n      modifyCustomerData: request.requested_access_level === 'emergency',\n      accessSensitiveData: request.requested_access_level === 'emergency',\n      emergencyOverride: request.requested_access_level === 'emergency',\n      ...conditions.permissions // Additional conditions from approver\n    };\n    \n    const accessResult = await db.query(`\n      INSERT INTO technician_access (\n        technician_id,\n        customer_org_id,\n        access_level,\n        permissions,\n        restrictions,\n        granted_by,\n        granted_at,\n        expires_at,\n        is_emergency,\n        reason,\n        status\n      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, true, $8, 'active')\n      RETURNING id\n    `, [\n      request.technician_id,\n      request.customer_org_id,\n      request.requested_access_level,\n      JSON.stringify(permissions),\n      JSON.stringify(conditions.restrictions || {}),\n      user.userId,\n      new Date(Date.now() + accessDuration * 60 * 60 * 1000), // Convert hours to milliseconds\n      `Emergency access approved: ${request.justification}`\n    ]);\n    \n    // Update request status\n    await db.query(`\n      UPDATE emergency_access_requests\n      SET \n        status = 'approved',\n        approved_by = $1,\n        approved_at = CURRENT_TIMESTAMP,\n        metadata = $2,\n        updated_at = CURRENT_TIMESTAMP\n      WHERE id = $3\n    `, [user.userId, JSON.stringify({ accessDuration, conditions }), requestId]);\n    \n    // Log audit event\n    await db.query(`\n      INSERT INTO audit_logs (\n        user_id,\n        org_id,\n        action,\n        resource_type,\n        resource_id,\n        details,\n        ip_address\n      ) VALUES ($1, $2, 'approve_emergency_access', 'emergency_access_request', $3, $4, $5)\n    `, [\n      user.userId,\n      user.orgId,\n      requestId,\n      JSON.stringify({\n        technician: `${request.tech_first_name} ${request.tech_last_name}`,\n        customer: request.customer_name,\n        accessLevel: request.requested_access_level,\n        accessDuration,\n        justification: request.justification,\n        accessId: accessResult.rows[0].id\n      }),\n      req.ip\n    ]);\n    \n    // TODO: Send notification to technician\n    console.log(`Emergency access approved for ${request.tech_first_name} ${request.tech_last_name} -> ${request.customer_name}`);\n    \n    res.json({\n      success: true,\n      data: {\n        requestId,\n        accessId: accessResult.rows[0].id,\n        accessDuration,\n        expiresAt: new Date(Date.now() + accessDuration * 60 * 60 * 1000)\n      },\n      message: 'Emergency access approved and granted'\n    });\n  } catch (error) {\n    console.error('Error approving emergency access request:', error);\n    res.status(500).json({\n      success: false,\n      error: 'Failed to approve request'\n    });\n  }\n});\n\n/**\n * PUT /api/emergency-access/requests/:requestId/reject - Reject emergency access request\n */\nrouter.put('/requests/:requestId/reject', authMiddleware, requireOrganization('mss_provider'), requireRole(['super_admin', 'account_manager']), async (req, res) => {\n  try {\n    const db = getDB();\n    const user = req.user as AuthPayload;\n    const { requestId } = req.params;\n    const { reason } = req.body;\n    \n    if (!reason) {\n      return res.status(400).json({\n        success: false,\n        error: 'Rejection reason is required'\n      });\n    }\n    \n    // Get request details\n    const requestResult = await db.query(`\n      SELECT \n        ear.*,\n        t.first_name as tech_first_name,\n        t.last_name as tech_last_name,\n        o.name as customer_name\n      FROM emergency_access_requests ear\n      JOIN users t ON ear.technician_id = t.id\n      JOIN organizations o ON ear.customer_org_id = o.id\n      WHERE ear.id = $1 AND ear.status = 'pending'\n    `, [requestId]);\n    \n    if (requestResult.rows.length === 0) {\n      return res.status(404).json({\n        success: false,\n        error: 'Pending request not found'\n      });\n    }\n    \n    const request = requestResult.rows[0];\n    \n    // Update request status\n    await db.query(`\n      UPDATE emergency_access_requests\n      SET \n        status = 'rejected',\n        rejected_by = $1,\n        rejected_at = CURRENT_TIMESTAMP,\n        rejection_reason = $2,\n        updated_at = CURRENT_TIMESTAMP\n      WHERE id = $3\n    `, [user.userId, reason, requestId]);\n    \n    // Log audit event\n    await db.query(`\n      INSERT INTO audit_logs (\n        user_id,\n        org_id,\n        action,\n        resource_type,\n        resource_id,\n        details,\n        ip_address\n      ) VALUES ($1, $2, 'reject_emergency_access', 'emergency_access_request', $3, $4, $5)\n    `, [\n      user.userId,\n      user.orgId,\n      requestId,\n      JSON.stringify({\n        technician: `${request.tech_first_name} ${request.tech_last_name}`,\n        customer: request.customer_name,\n        accessLevel: request.requested_access_level,\n        justification: request.justification,\n        rejectionReason: reason\n      }),\n      req.ip\n    ]);\n    \n    // TODO: Send notification to technician\n    console.log(`Emergency access rejected for ${request.tech_first_name} ${request.tech_last_name} -> ${request.customer_name}: ${reason}`);\n    \n    res.json({\n      success: true,\n      message: 'Emergency access request rejected'\n    });\n  } catch (error) {\n    console.error('Error rejecting emergency access request:', error);\n    res.status(500).json({\n      success: false,\n      error: 'Failed to reject request'\n    });\n  }\n});\n\n/**\n * DELETE /api/emergency-access/requests/:requestId - Cancel emergency access request\n */\nrouter.delete('/requests/:requestId', authMiddleware, requireOrganization('mss_provider'), async (req, res) => {\n  try {\n    const db = getDB();\n    const user = req.user as AuthPayload;\n    const { requestId } = req.params;\n    \n    // Get request details\n    const requestResult = await db.query(`\n      SELECT * FROM emergency_access_requests\n      WHERE id = $1 AND status = 'pending'\n    `, [requestId]);\n    \n    if (requestResult.rows.length === 0) {\n      return res.status(404).json({\n        success: false,\n        error: 'Pending request not found'\n      });\n    }\n    \n    const request = requestResult.rows[0];\n    \n    // Authorization check - only the requester or admins can cancel\n    if (user.userId !== request.technician_id && !['super_admin', 'account_manager'].includes(user.role)) {\n      return res.status(403).json({\n        success: false,\n        error: 'Only the requester or administrators can cancel this request'\n      });\n    }\n    \n    // Cancel request\n    await db.query(`\n      UPDATE emergency_access_requests\n      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP\n      WHERE id = $1\n    `, [requestId]);\n    \n    // Log audit event\n    await db.query(`\n      INSERT INTO audit_logs (\n        user_id,\n        org_id,\n        action,\n        resource_type,\n        resource_id,\n        details,\n        ip_address\n      ) VALUES ($1, $2, 'cancel_emergency_access', 'emergency_access_request', $3, $4, $5)\n    `, [\n      user.userId,\n      user.orgId,\n      requestId,\n      JSON.stringify({\n        cancelledBy: user.userId === request.technician_id ? 'requester' : 'administrator'\n      }),\n      req.ip\n    ]);\n    \n    res.json({\n      success: true,\n      message: 'Emergency access request cancelled'\n    });\n  } catch (error) {\n    console.error('Error cancelling emergency access request:', error);\n    res.status(500).json({\n      success: false,\n      error: 'Failed to cancel request'\n    });\n  }\n});\n\nexport default router;