import { Router } from 'express';
import { getDB } from '@/database/connection';
import { authMiddleware, requireRole, requireOrganization } from '@/middleware/auth';
import { AuthPayload, CUSTOMER_ROLES, MSS_ROLES } from '@/types/auth';
import { passwordService } from '@/services/password.service';
import { auditService } from '@/services/audit.service';

const router = Router();

// Get current user profile
router.get('/profile', authMiddleware, async (req, res, next) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    
    const result = await db.query(`
      SELECT 
        u.id, u.email, u.email_verified, u.first_name, u.last_name, u.role, u.status,
        u.mfa_enabled, u.last_login_at, u.created_at, u.updated_at,
        o.id as org_id, o.name as org_name, o.type as org_type, o.domain as org_domain
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.id = $1
    `, [user.userId]);

    const userData = result.rows[0];
    if (!userData) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        id: userData.id,
        email: userData.email,
        emailVerified: userData.email_verified,
        firstName: userData.first_name,
        lastName: userData.last_name,
        role: userData.role,
        status: userData.status,
        mfaEnabled: userData.mfa_enabled,
        lastLoginAt: userData.last_login_at,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at,
        organization: {
          id: userData.org_id,
          name: userData.org_name,
          type: userData.org_type,
          domain: userData.org_domain
        }
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get users - scope based on organization and role
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { page = 1, limit = 20, orgId, role, status, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build query based on user permissions
    let query = `
      SELECT 
        u.id, u.email, u.email_verified, u.first_name, u.last_name, u.role, u.status,
        u.mfa_enabled, u.last_login_at, u.last_login_ip, u.created_at, u.updated_at,
        o.id as org_id, o.name as org_name, o.type as org_type
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    // Authorization-based filtering
    if (user.orgType === 'customer') {
      // Customers can only see users in their own organization
      if (!['admin'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view users'
        });
      }
      query += ` AND u.org_id = $${paramIndex}`;
      params.push(user.orgId);
      paramIndex++;
    } else {
      // MSS provider users - super_admin sees all, others see limited scope
      if (!['super_admin', 'account_manager', 'security_analyst'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view users'
        });
      }
      
      if (user.role !== 'super_admin') {
        // Non-super admins only see customer users or their own org
        query += ` AND (o.type = 'customer' OR u.org_id = $${paramIndex})`;
        params.push(user.orgId);
        paramIndex++;
      }
    }
    
    // Additional filters
    if (orgId) {
      query += ` AND u.org_id = $${paramIndex}`;
      params.push(orgId);
      paramIndex++;
    }
    
    if (role) {
      query += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND u.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Exclude deleted users by default
    query += ` AND u.status != 'deleted'`;
    
    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), offset);
    
    const result = await db.query(query, params);
    
    // Count query with same filters
    let countQuery = query.substring(0, query.indexOf('ORDER BY')).replace(
      /SELECT[\s\S]*?FROM/,
      'SELECT COUNT(*) FROM'
    );
    const countParams = params.slice(0, -2); // Remove limit and offset
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        users: result.rows.map(userData => ({
          id: userData.id,
          email: userData.email,
          emailVerified: userData.email_verified,
          firstName: userData.first_name,
          lastName: userData.last_name,
          role: userData.role,
          status: userData.status,
          mfaEnabled: userData.mfa_enabled,
          lastLoginAt: userData.last_login_at,
          lastLoginIp: userData.last_login_ip,
          createdAt: userData.created_at,
          updatedAt: userData.updated_at,
          organization: {
            id: userData.org_id,
            name: userData.org_name,
            type: userData.org_type
          }
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

// Create new user
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { email, firstName, lastName, role, orgId, password, sendInvitation = true } = req.body;
    
    // Authorization check
    const canCreateUsers = 
      (user.orgType === 'customer' && user.role === 'admin' && (!orgId || orgId === user.orgId)) ||
      (user.orgType === 'mss_provider' && ['super_admin', 'account_manager'].includes(user.role));
    
    if (!canCreateUsers) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to create users'
      });
    }
    
    // Validation
    if (!email || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        error: 'Email, first name, last name, and role are required'
      });
    }
    
    // Determine target organization
    const targetOrgId = orgId || user.orgId;
    
    // Verify organization exists and user has access
    const orgResult = await db.query(
      'SELECT id, name, type FROM organizations WHERE id = $1',
      [targetOrgId]
    );
    
    if (orgResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }
    
    const targetOrg = orgResult.rows[0];
    
    // Validate role for organization type
    const customerRoles = [...CUSTOMER_ROLES];
    const mssRoles = [...MSS_ROLES];
    
    if (targetOrg.type === 'customer' && !customerRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role for customer organization. Must be one of: ${customerRoles.join(', ')}`
      });
    }
    
    if (targetOrg.type === 'mss_provider' && !mssRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role for MSS provider organization. Must be one of: ${mssRoles.join(', ')}`
      });
    }
    
    // Check for duplicate email within organization
    const existingUser = await db.query(
      'SELECT id FROM users WHERE org_id = $1 AND LOWER(email) = LOWER($2)',
      [targetOrgId, email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists in the organization'
      });
    }
    
    // Hash password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await passwordService.hashPassword(password);
    }
    
    // Create user
    const newUserResult = await db.query(`
      INSERT INTO users (
        org_id, email, first_name, last_name, role, password_hash, 
        email_verified, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      targetOrgId,
      email.toLowerCase(),
      firstName,
      lastName,
      role,
      passwordHash,
      !sendInvitation, // If not sending invitation, mark as verified
      user.userId
    ]);
    
    const newUser = newUserResult.rows[0];
    
    // Generate email verification token if sending invitation
    if (sendInvitation) {
      const tokenResult = await db.query(`
        INSERT INTO email_verification_tokens (user_id, email, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)
        RETURNING token_hash
      `, [
        newUser.id,
        email,
        require('crypto').randomBytes(32).toString('hex'),
        new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      ]);
      
      // TODO: Send invitation email with verification token
      console.log(`Invitation email would be sent to ${email} with token ${tokenResult.rows[0].token_hash}`);
    }
    
    // Log audit event
    await auditService.logUserAction(
      user.userId,
      user.orgId,
      sendInvitation ? 'invite' : 'create',
      newUser.id,
      email,
      {
        firstName,
        lastName,
        role,
        targetOrganization: targetOrg.name,
        sendInvitation
      },
      req.ip
    );
    
    // Return user data without sensitive information
    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        emailVerified: newUser.email_verified,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.created_at,
        organization: {
          id: targetOrg.id,
          name: targetOrg.name,
          type: targetOrg.type
        }
      },
      message: sendInvitation ? 'User created and invitation sent' : 'User created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get specific user
router.get('/:userId', authMiddleware, async (req, res, next) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { userId } = req.params;
    
    // Get user data
    const result = await db.query(`
      SELECT 
        u.id, u.email, u.email_verified, u.first_name, u.last_name, u.role, u.status,
        u.mfa_enabled, u.last_login_at, u.last_login_ip, u.failed_login_attempts,
        u.created_at, u.updated_at, u.created_by,
        o.id as org_id, o.name as org_name, o.type as org_type, o.domain as org_domain,
        creator.first_name as creator_first_name, creator.last_name as creator_last_name
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      LEFT JOIN users creator ON u.created_by = creator.id
      WHERE u.id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userData = result.rows[0];
    
    // Authorization check
    const canView = 
      user.userId === userId || // Own profile
      (user.orgType === 'customer' && user.role === 'admin' && userData.org_id === user.orgId) || // Customer admin viewing their org users
      (user.orgType === 'mss_provider' && ['super_admin', 'account_manager'].includes(user.role)); // MSS managers
    
    if (!canView) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: userData.id,
        email: userData.email,
        emailVerified: userData.email_verified,
        firstName: userData.first_name,
        lastName: userData.last_name,
        role: userData.role,
        status: userData.status,
        mfaEnabled: userData.mfa_enabled,
        lastLoginAt: userData.last_login_at,
        lastLoginIp: userData.last_login_ip,
        failedLoginAttempts: userData.failed_login_attempts,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at,
        createdBy: userData.creator_first_name && userData.creator_last_name 
          ? `${userData.creator_first_name} ${userData.creator_last_name}`
          : null,
        organization: {
          id: userData.org_id,
          name: userData.org_name,
          type: userData.org_type,
          domain: userData.org_domain
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:userId', authMiddleware, async (req, res, next) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { userId } = req.params;
    const { firstName, lastName, role, status, email } = req.body;
    
    // Get current user data
    const currentUserResult = await db.query(`
      SELECT u.*, o.type as org_type FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.id = $1
    `, [userId]);
    
    if (currentUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const currentUser = currentUserResult.rows[0];
    
    // Authorization check
    const canUpdate = 
      (user.userId === userId && !role && !status) || // Own profile (limited)
      (user.orgType === 'customer' && user.role === 'admin' && currentUser.org_id === user.orgId) || // Customer admin
      (user.orgType === 'mss_provider' && ['super_admin', 'account_manager'].includes(user.role)); // MSS managers
    
    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update user'
      });
    }
    
    // Build updates
    const updates: any = {};
    if (firstName) updates.first_name = firstName;
    if (lastName) updates.last_name = lastName;
    if (email && user.orgType === 'mss_provider') {
      updates.email = email.toLowerCase();
      updates.email_verified = false; // Re-verification required
    }
    
    // Role updates - restricted permissions
    if (role && user.userId !== userId) { // Can't change own role
      const customerRoles = [...CUSTOMER_ROLES];
      const mssRoles = [...MSS_ROLES];
      
      if (currentUser.org_type === 'customer' && !customerRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role for customer organization. Must be one of: ${customerRoles.join(', ')}`
        });
      }
      
      if (currentUser.org_type === 'mss_provider' && !mssRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role for MSS provider organization. Must be one of: ${mssRoles.join(', ')}`
        });
      }
      
      updates.role = role;
    }
    
    // Status updates - restricted permissions
    if (status && user.userId !== userId && ['super_admin', 'admin', 'account_manager'].includes(user.role)) {
      const validStatuses = ['active', 'suspended', 'locked'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      updates.status = status;
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid updates provided'
      });
    }
    
    // Build update query
    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [userId, ...Object.values(updates)];
    
    const result = await db.query(`
      UPDATE users 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, values);
    
    // Log audit event
    await auditService.logUserAction(
      user.userId,
      user.orgId,
      'update',
      userId,
      currentUser.email,
      {
        changes: updates,
        targetUser: `${currentUser.first_name} ${currentUser.last_name}`
      },
      req.ip
    );
    
    const updatedUser = result.rows[0];
    
    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        emailVerified: updatedUser.email_verified,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        status: updatedUser.status,
        updatedAt: updatedUser.updated_at
      },
      message: 'User updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Soft delete user
router.delete('/:userId', authMiddleware, async (req, res, next) => {
  try {
    const db = getDB();
    const user = req.user as AuthPayload;
    const { userId } = req.params;
    
    // Prevent self-deletion
    if (user.userId === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }
    
    // Get target user
    const targetUserResult = await db.query(`
      SELECT u.*, o.type as org_type FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.id = $1
    `, [userId]);
    
    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const targetUser = targetUserResult.rows[0];
    
    // Authorization check
    const canDelete = 
      (user.orgType === 'customer' && user.role === 'admin' && targetUser.org_id === user.orgId) ||
      (user.orgType === 'mss_provider' && user.role === 'super_admin');
    
    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to delete user'
      });
    }
    
    // Soft delete by updating status
    await db.query(`
      UPDATE users 
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [userId]);
    
    // Revoke all active sessions
    await db.query(`
      UPDATE user_sessions 
      SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'Account deleted'
      WHERE user_id = $1 AND status = 'active'
    `, [userId]);
    
    // Log audit event
    await auditService.logUserAction(
      user.userId,
      user.orgId,
      'delete',
      userId,
      targetUser.email,
      {
        deletedUser: `${targetUser.first_name} ${targetUser.last_name}`,
        role: targetUser.role
      },
      req.ip
    );
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;