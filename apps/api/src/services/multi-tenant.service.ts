import { getDB } from '@/database/connection';
import { Organization, TechnicianAccess, AccessMatrixEntry, CUSTOMER_ROLES, MSS_ROLES } from '@/types/auth';

export interface CreateOrganizationData {
  name: string;
  domain?: string;
  settings?: Record<string, any>;
  createdBy: string;
}

export interface UpdateOrganizationData {
  name?: string;
  domain?: string;
  ssoEnabled?: boolean;
  settings?: Record<string, any>;
  status?: 'active' | 'suspended' | 'deleted';
}

export interface GrantAccessData {
  technicianId: string;
  customerOrgId: string;
  accessLevel: 'read_only' | 'full_access' | 'emergency';
  grantedBy: string;
  expiresAt?: Date;
  allowedServices?: string[];
  ipRestrictions?: string[];
  timeRestrictions?: Record<string, any>;
  notes?: string;
}

export interface AccessHandoffData {
  fromTechnicianId: string;
  toTechnicianId: string;
  customerOrgIds?: string[];
  reason?: string;
  maintainOriginalAccess?: boolean;
}

export interface OrganizationStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    mfaEnabled: number;
    recentLogins: number;
  };
  roles: Record<string, number>;
  activity: {
    reports: { total: number; published: number };
    interventions: { total: number; active: number };
    technicianAccess: { total: number; active: number };
  };
}

export class MultiTenantService {
  private get db() {
    return getDB();
  }

  // ============================================================================
  // ORGANIZATION MANAGEMENT
  // ============================================================================

  async createOrganization(data: CreateOrganizationData): Promise<Organization> {
    // Check for duplicate names
    const existingOrg = await this.db.query(
      'SELECT id FROM organizations WHERE LOWER(name) = LOWER($1)',
      [data.name]
    );

    if (existingOrg.rows.length > 0) {
      throw new Error('Organization name already exists');
    }

    const result = await this.db.query(`
      INSERT INTO organizations (name, type, domain, settings, created_by)
      VALUES ($1, 'customer', $2, $3, $4)
      RETURNING *
    `, [data.name, data.domain, JSON.stringify(data.settings || {}), data.createdBy]);

    return this.mapOrganizationRow(result.rows[0]);
  }

  async getOrganization(id: string): Promise<Organization | null> {
    const result = await this.db.query(
      'SELECT * FROM organizations WHERE id = $1',
      [id]
    );

    return result.rows.length > 0 ? this.mapOrganizationRow(result.rows[0]) : null;
  }

  async getOrganizations(filters?: {
    type?: 'customer' | 'mss_provider';
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ organizations: Organization[]; total: number }> {
    let query = 'SELECT * FROM organizations WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.type) {
      query += ` AND type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.search) {
      query += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    query += ` ORDER BY created_at DESC`;
    if (filters?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }
    if (filters?.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    const result = await this.db.query(query, params);
    const organizations = result.rows.map(row => this.mapOrganizationRow(row));

    return { organizations, total };
  }

  async updateOrganization(id: string, data: UpdateOrganizationData): Promise<Organization> {
    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.domain !== undefined) updates.domain = data.domain;
    if (data.ssoEnabled !== undefined) updates.sso_enabled = data.ssoEnabled;
    if (data.status) updates.status = data.status;
    if (data.settings) {
      // Merge with existing settings
      const currentOrg = await this.getOrganization(id);
      if (!currentOrg) throw new Error('Organization not found');
      
      updates.settings = JSON.stringify({
        ...currentOrg.settings,
        ...data.settings
      });
    }

    if (Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }

    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];

    const result = await this.db.query(`
      UPDATE organizations 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      throw new Error('Organization not found');
    }

    return this.mapOrganizationRow(result.rows[0]);
  }

  async deleteOrganization(id: string): Promise<void> {
    // Soft delete by updating status
    const result = await this.db.query(`
      UPDATE organizations 
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND type = 'customer'
    `, [id]);

    if (result.rowCount === 0) {
      throw new Error('Customer organization not found');
    }

    // Also soft delete all users in the organization
    await this.db.query(`
      UPDATE users 
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE org_id = $1
    `, [id]);
  }

  async getOrganizationStats(id: string): Promise<OrganizationStats> {
    const result = await this.db.query(`
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
        COUNT(CASE WHEN u.role = 'super_admin' THEN 1 END) as super_admin_count,
        COUNT(CASE WHEN u.role = 'technician' THEN 1 END) as technician_count,
        COUNT(CASE WHEN u.role = 'security_analyst' THEN 1 END) as security_analyst_count,
        COUNT(CASE WHEN u.role = 'account_manager' THEN 1 END) as account_manager_count,
        
        -- Activity stats
        COUNT(CASE WHEN sr.id IS NOT NULL THEN 1 END) as total_reports,
        COUNT(CASE WHEN sr.status = 'published' THEN 1 END) as published_reports,
        COUNT(CASE WHEN ir.id IS NOT NULL THEN 1 END) as total_interventions,
        COUNT(CASE WHEN ir.status IN ('pending', 'assigned', 'in_progress') THEN 1 END) as active_interventions,
        COUNT(CASE WHEN tca.id IS NOT NULL THEN 1 END) as total_technician_access,
        COUNT(CASE WHEN tca.status = 'active' THEN 1 END) as active_technician_access
        
      FROM organizations o
      LEFT JOIN users u ON o.id = u.org_id
      LEFT JOIN security_reports sr ON o.id = sr.customer_org_id
      LEFT JOIN intervention_requests ir ON o.id = ir.customer_org_id
      LEFT JOIN technician_customer_access tca ON o.id = tca.customer_org_id
      WHERE o.id = $1
      GROUP BY o.id
    `, [id]);

    if (result.rows.length === 0) {
      throw new Error('Organization not found');
    }

    const stats = result.rows[0];

    return {
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
        basicUser: parseInt(stats.basic_user_count),
        superAdmin: parseInt(stats.super_admin_count),
        technician: parseInt(stats.technician_count),
        securityAnalyst: parseInt(stats.security_analyst_count),
        accountManager: parseInt(stats.account_manager_count)
      },
      activity: {
        reports: {
          total: parseInt(stats.total_reports),
          published: parseInt(stats.published_reports)
        },
        interventions: {
          total: parseInt(stats.total_interventions),
          active: parseInt(stats.active_interventions)
        },
        technicianAccess: {
          total: parseInt(stats.total_technician_access),
          active: parseInt(stats.active_technician_access)
        }
      }
    };
  }

  // ============================================================================
  // TECHNICIAN ACCESS MANAGEMENT
  // ============================================================================

  async grantTechnicianAccess(data: GrantAccessData): Promise<TechnicianAccess> {
    // Verify technician exists and is from MSS provider
    const techResult = await this.db.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.role
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.id = $1 AND o.type = 'mss_provider' 
      AND u.role IN ('technician', 'security_analyst', 'super_admin')
      AND u.status = 'active'
    `, [data.technicianId]);

    if (techResult.rows.length === 0) {
      throw new Error('Technician not found or invalid');
    }

    // Verify customer organization exists
    const customerResult = await this.db.query(`
      SELECT id, name FROM organizations WHERE id = $1 AND type = 'customer' AND status = 'active'
    `, [data.customerOrgId]);

    if (customerResult.rows.length === 0) {
      throw new Error('Customer organization not found');
    }

    // Check if access already exists and is active
    const existingAccess = await this.db.query(`
      SELECT id FROM technician_customer_access 
      WHERE technician_id = $1 AND customer_org_id = $2 AND status = 'active'
    `, [data.technicianId, data.customerOrgId]);

    if (existingAccess.rows.length > 0) {
      throw new Error('Active access already exists for this technician-customer pair');
    }

    const result = await this.db.query(`
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
      data.technicianId,
      data.customerOrgId,
      data.accessLevel,
      data.grantedBy,
      data.expiresAt,
      data.allowedServices,
      data.ipRestrictions,
      JSON.stringify(data.timeRestrictions || {}),
      data.notes
    ]);

    return this.mapTechnicianAccessRow(result.rows[0]);
  }

  async updateTechnicianAccess(
    accessId: string, 
    updates: {
      accessLevel?: string;
      expiresAt?: Date;
      allowedServices?: string[];
      ipRestrictions?: string[];
      timeRestrictions?: Record<string, any>;
      notes?: string;
    }
  ): Promise<TechnicianAccess> {
    const setUpdates: any = {};
    if (updates.accessLevel) setUpdates.access_level = updates.accessLevel;
    if (updates.expiresAt !== undefined) setUpdates.expires_at = updates.expiresAt;
    if (updates.allowedServices) setUpdates.allowed_services = updates.allowedServices;
    if (updates.ipRestrictions) setUpdates.ip_restrictions = updates.ipRestrictions;
    if (updates.timeRestrictions) setUpdates.time_restrictions = JSON.stringify(updates.timeRestrictions);
    if (updates.notes !== undefined) setUpdates.notes = updates.notes;

    if (Object.keys(setUpdates).length === 0) {
      throw new Error('No updates provided');
    }

    const setClause = Object.keys(setUpdates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [accessId, ...Object.values(setUpdates)];

    const result = await this.db.query(`
      UPDATE technician_customer_access 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      throw new Error('Access record not found');
    }

    return this.mapTechnicianAccessRow(result.rows[0]);
  }

  async revokeTechnicianAccess(accessId: string, revokedBy: string, reason = 'Administrative revocation'): Promise<void> {
    const result = await this.db.query(`
      UPDATE technician_customer_access 
      SET 
        status = 'revoked',
        revoked_at = CURRENT_TIMESTAMP,
        revoked_by = $1,
        revoked_reason = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND status = 'active'
    `, [revokedBy, reason, accessId]);

    if (result.rowCount === 0) {
      throw new Error('Active access record not found');
    }
  }

  async getAccessMatrix(): Promise<{
    matrix: Record<string, AccessMatrixEntry>;
    technicians: any[];
    customers: any[];
  }> {
    const result = await this.db.query(`
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
        tca.granted_at,
        tca.granted_by,
        tca.expires_at,
        tca.revoked_at,
        tca.revoked_by,
        tca.revoked_reason,
        tca.allowed_services,
        tca.ip_restrictions,
        tca.time_restrictions,
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

    const matrix: Record<string, AccessMatrixEntry> = {};
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
        access: row.access_id ? this.mapTechnicianAccessRow(row) : undefined
      };
    });

    return {
      matrix,
      technicians: Object.values(technicians),
      customers: Object.values(customers)
    };
  }

  async getTechnicianAccess(technicianId: string): Promise<TechnicianAccess[]> {
    const result = await this.db.query(`
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

    return result.rows.map(row => this.mapTechnicianAccessRow(row));
  }

  async handoffTechnicianAccess(data: AccessHandoffData): Promise<{
    results: Array<{
      customerOrgId: string;
      customerName: string;
      status: 'transferred' | 'skipped';
      reason?: string;
      newAccessId?: string;
    }>;
    summary: {
      total: number;
      transferred: number;
      skipped: number;
    };
  }> {
    // Verify both technicians exist
    const techniciansCheck = await this.db.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.role
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.id IN ($1, $2) AND o.type = 'mss_provider' 
        AND u.role IN ('technician', 'security_analyst', 'super_admin')
        AND u.status = 'active'
    `, [data.fromTechnicianId, data.toTechnicianId]);

    if (techniciansCheck.rows.length !== 2) {
      throw new Error('One or both technicians not found or invalid');
    }

    // Get access records to transfer
    let accessQuery = `
      SELECT tca.*, o.name as customer_name
      FROM technician_customer_access tca
      JOIN organizations o ON tca.customer_org_id = o.id
      WHERE tca.technician_id = $1 AND tca.status = 'active'
    `;
    const queryParams = [data.fromTechnicianId];

    if (data.customerOrgIds && data.customerOrgIds.length > 0) {
      accessQuery += ` AND tca.customer_org_id = ANY($2)`;
      queryParams.push(data.customerOrgIds);
    }

    const accessRecords = await this.db.query(accessQuery, queryParams);

    if (accessRecords.rows.length === 0) {
      throw new Error('No active access records found to transfer');
    }

    const results: any[] = [];
    
    // Begin transaction
    await this.db.query('BEGIN');

    try {
      for (const access of accessRecords.rows) {
        // Check if destination technician already has access
        const existingAccess = await this.db.query(`
          SELECT id FROM technician_customer_access 
          WHERE technician_id = $1 AND customer_org_id = $2 AND status = 'active'
        `, [data.toTechnicianId, access.customer_org_id]);

        if (existingAccess.rows.length > 0) {
          results.push({
            customerOrgId: access.customer_org_id,
            customerName: access.customer_name,
            status: 'skipped',
            reason: 'Destination technician already has active access'
          });
          continue;
        }

        // Create new access for destination technician
        const newAccessResult = await this.db.query(`
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
          RETURNING id
        `, [
          data.toTechnicianId,
          access.customer_org_id,
          access.access_level,
          access.granted_by,
          access.expires_at,
          access.allowed_services,
          access.ip_restrictions,
          access.time_restrictions,
          `Transferred from technician. ${data.reason || ''}`
        ]);

        // Revoke original access unless maintaining it
        if (!data.maintainOriginalAccess) {
          await this.db.query(`
            UPDATE technician_customer_access 
            SET 
              status = 'revoked',
              revoked_at = CURRENT_TIMESTAMP,
              revoked_by = $1,
              revoked_reason = $2,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `, [data.toTechnicianId, `Access transferred to another technician`, access.id]);
        }

        results.push({
          customerOrgId: access.customer_org_id,
          customerName: access.customer_name,
          status: 'transferred',
          newAccessId: newAccessResult.rows[0].id
        });
      }

      await this.db.query('COMMIT');

      const summary = {
        total: results.length,
        transferred: results.filter(r => r.status === 'transferred').length,
        skipped: results.filter(r => r.status === 'skipped').length
      };

      return { results, summary };
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  // ============================================================================
  // USER ROLE VALIDATION
  // ============================================================================

  validateUserRole(role: string, orgType: 'customer' | 'mss_provider'): boolean {
    if (orgType === 'customer') {
      return CUSTOMER_ROLES.includes(role as any);
    } else {
      return MSS_ROLES.includes(role as any);
    }
  }

  getValidRoles(orgType: 'customer' | 'mss_provider'): string[] {
    return orgType === 'customer' ? [...CUSTOMER_ROLES] : [...MSS_ROLES];
  }

  // ============================================================================
  // AUDIT LOGGING
  // ============================================================================

  async logAction(
    userId: string,
    orgId: string,
    actionType: string,
    resourceType: string,
    resourceId: string | null,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ): Promise<void> {
    await this.db.query(`
      INSERT INTO audit_logs (
        user_id, organization_id, action_type, resource_type, resource_id,
        action_description, action_data, ip_address, user_agent, risk_level,
        compliance_relevant, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, CURRENT_TIMESTAMP)
    `, [
      userId,
      orgId,
      actionType,
      resourceType,
      resourceId,
      `${actionType} on ${resourceType}`,
      JSON.stringify(details),
      ipAddress,
      userAgent,
      riskLevel
    ]);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private mapOrganizationRow(row: any): Organization {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      domain: row.domain,
      ssoEnabled: row.sso_enabled,
      status: row.status,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }

  private mapTechnicianAccessRow(row: any): TechnicianAccess {
    return {
      id: row.id,
      technicianId: row.technician_id,
      customerOrgId: row.customer_org_id,
      accessLevel: row.access_level,
      grantedBy: row.granted_by,
      grantedAt: row.granted_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      revokedBy: row.revoked_by,
      revokedReason: row.revoked_reason,
      allowedServices: row.allowed_services,
      ipRestrictions: row.ip_restrictions,
      timeRestrictions: typeof row.time_restrictions === 'string' 
        ? JSON.parse(row.time_restrictions) 
        : row.time_restrictions,
      status: row.status,
      notes: row.notes
    };
  }
}

export const multiTenantService = new MultiTenantService();