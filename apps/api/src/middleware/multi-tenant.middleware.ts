import { Request, Response, NextFunction } from 'express';
import { AuthPayload, CUSTOMER_ROLES, MSS_ROLES } from '@/types/auth';
import { getDB } from '@/database/connection';

declare global {
  namespace Express {
    interface Request {
      organizationAccess?: {
        canAccessOrganization: (orgId: string) => boolean;
        canManageUsers: (targetOrgId: string) => boolean;
        canViewAuditLogs: (targetOrgId?: string) => boolean;
        canManageAccess: () => boolean;
        allowedCustomerOrgs: string[];
      };
    }
  }
}

/**
 * Multi-tenant authorization middleware that adds organization-specific access control
 */
export const multiTenantMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user as AuthPayload;
    
    if (!user) {
      next();
      return;
    }

    const db = getDB();

    // Helper functions for authorization
    const organizationAccess = {
      /**
       * Check if user can access a specific organization
       */
      canAccessOrganization: (orgId: string): boolean => {
        // Users can always access their own organization
        if (user.orgId === orgId) {
          return true;
        }

        // MSS provider users can access customer organizations based on role
        if (user.orgType === 'mss_provider') {
          const managerRoles = ['super_admin', 'account_manager', 'security_analyst'];
          return managerRoles.includes(user.role);
        }

        return false;
      },

      /**
       * Check if user can manage users in a target organization
       */
      canManageUsers: (targetOrgId: string): boolean => {
        // Customer admins can manage users in their own organization
        if (user.orgType === 'customer' && user.orgId === targetOrgId && user.role === 'admin') {
          return true;
        }

        // MSS provider managers can manage users in customer organizations
        if (user.orgType === 'mss_provider') {
          const managerRoles = ['super_admin', 'account_manager'];
          return managerRoles.includes(user.role);
        }

        return false;
      },

      /**
       * Check if user can view audit logs
       */
      canViewAuditLogs: (targetOrgId?: string): boolean => {
        if (user.orgType === 'mss_provider') {
          const auditRoles = ['super_admin', 'security_analyst', 'account_manager'];
          return auditRoles.includes(user.role);
        }

        // Customers can view their own audit logs if they have admin role
        if (user.orgType === 'customer' && user.role === 'admin') {
          return !targetOrgId || targetOrgId === user.orgId;
        }

        return false;
      },

      /**
       * Check if user can manage technician access
       */
      canManageAccess: (): boolean => {
        if (user.orgType === 'mss_provider') {
          const accessRoles = ['super_admin', 'account_manager'];
          return accessRoles.includes(user.role);
        }
        return false;
      },

      /**
       * Get list of customer organizations this user can access
       */
      allowedCustomerOrgs: [] as string[]
    };

    // Get allowed customer organizations for technicians and managers
    if (user.orgType === 'mss_provider') {
      if (user.role === 'technician') {
        // Technicians can only access customers they have explicit access to
        const techAccessResult = await db.query(`
          SELECT DISTINCT customer_org_id
          FROM technician_customer_access
          WHERE technician_id = $1 AND status = 'active'
        `, [user.userId]);
        
        organizationAccess.allowedCustomerOrgs = techAccessResult.rows.map(row => row.customer_org_id);
      } else if (['super_admin', 'account_manager', 'security_analyst'].includes(user.role)) {
        // Managers can access all customer organizations
        const customerOrgsResult = await db.query(`
          SELECT id FROM organizations WHERE type = 'customer' AND status = 'active'
        `);
        
        organizationAccess.allowedCustomerOrgs = customerOrgsResult.rows.map(row => row.id);
      }
    } else if (user.orgType === 'customer') {
      // Customers can only access their own organization
      organizationAccess.allowedCustomerOrgs = [user.orgId];
    }

    req.organizationAccess = organizationAccess;
    next();
  } catch (error) {
    console.error('Multi-tenant middleware error:', error);
    next(error);
  }
};

/**
 * Require specific organization type access
 */
export const requireOrganizationType = (orgType: 'customer' | 'mss_provider') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as AuthPayload;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (user.orgType !== orgType) {
      res.status(403).json({
        success: false,
        error: `Access denied - requires ${orgType} organization`
      });
      return;
    }

    next();
  };
};

/**
 * Require specific role within organization type
 */
export const requireRoleInOrgType = (orgType: 'customer' | 'mss_provider', roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as AuthPayload;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (user.orgType !== orgType) {
      res.status(403).json({
        success: false,
        error: `Access denied - requires ${orgType} organization`
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient role permissions',
        details: {
          required: allowedRoles,
          current: user.role,
          orgType: user.orgType
        }
      });
      return;
    }

    next();
  };
};

/**
 * Check organization access for a specific resource
 */
export const checkOrganizationAccess = (orgIdParam: string = 'orgId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as AuthPayload;
    const organizationAccess = req.organizationAccess;
    
    if (!user || !organizationAccess) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const targetOrgId = req.params[orgIdParam] || req.body[orgIdParam] || req.query[orgIdParam];
    
    if (!targetOrgId) {
      res.status(400).json({
        success: false,
        error: `Organization ID parameter '${orgIdParam}' is required`
      });
      return;
    }

    if (!organizationAccess.canAccessOrganization(targetOrgId)) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this organization'
      });
      return;
    }

    next();
  };
};

/**
 * Validate role for organization type (for user creation/updates)
 */
export const validateRoleForOrganization = (req: Request, res: Response, next: NextFunction): void => {
  const { role, orgId } = req.body;
  const user = req.user as AuthPayload;
  
  if (!role || !user) {
    next();
    return;
  }

  // Determine target organization type
  let targetOrgType: 'customer' | 'mss_provider';
  
  if (orgId) {
    // If orgId is provided, we need to look it up (this would require a database call)
    // For now, we'll rely on the user's organization type validation in the route handler
    next();
    return;
  } else {
    // If no orgId, assume it's for the user's own organization
    targetOrgType = user.orgType;
  }

  // Validate role against organization type
  if (targetOrgType === 'customer' && !CUSTOMER_ROLES.includes(role as any)) {
    res.status(400).json({
      success: false,
      error: `Invalid role for customer organization. Must be one of: ${CUSTOMER_ROLES.join(', ')}`
    });
    return;
  }

  if (targetOrgType === 'mss_provider' && !MSS_ROLES.includes(role as any)) {
    res.status(400).json({
      success: false,
      error: `Invalid role for MSS provider organization. Must be one of: ${MSS_ROLES.join(', ')}`
    });
    return;
  }

  next();
};

/**
 * Rate limiting by organization
 */
export const rateLimitByOrganization = (maxRequests: number, windowMs: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user as AuthPayload;
      
      if (!user) {
        next();
        return;
      }

      const { getRedis } = require('@/database/redis');
      const redis = getRedis();
      const key = `org_rate_limit:${user.orgId}:${Math.floor(Date.now() / windowMs)}`;
      
      const current = await redis.get(key);
      if (current && parseInt(current) >= maxRequests) {
        res.status(429).json({
          success: false,
          error: 'Organization rate limit exceeded'
        });
        return;
      }

      await redis.incr(key);
      await redis.expire(key, Math.ceil(windowMs / 1000));
      
      next();
    } catch (error) {
      console.error('Organization rate limiting error:', error);
      next(); // Continue on error
    }
  };
};

/**
 * Check if user can access customer data (for technicians)
 */
export const checkCustomerAccess = (customerOrgIdParam: string = 'customerId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user as AuthPayload;
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const customerOrgId = req.params[customerOrgIdParam] || req.body[customerOrgIdParam];
      
      if (!customerOrgId) {
        res.status(400).json({
          success: false,
          error: `Customer organization ID parameter '${customerOrgIdParam}' is required`
        });
        return;
      }

      // Customers can access their own data
      if (user.orgType === 'customer' && user.orgId === customerOrgId) {
        next();
        return;
      }

      // MSS provider users need appropriate permissions
      if (user.orgType === 'mss_provider') {
        // Super admin and account managers have access to all customers
        if (['super_admin', 'account_manager'].includes(user.role)) {
          next();
          return;
        }

        // Technicians need explicit access
        if (user.role === 'technician') {
          const organizationAccess = req.organizationAccess;
          if (organizationAccess && organizationAccess.allowedCustomerOrgs.includes(customerOrgId)) {
            next();
            return;
          }
        }
      }

      res.status(403).json({
        success: false,
        error: 'Access denied to this customer organization'
      });
    } catch (error) {
      console.error('Customer access check error:', error);
      res.status(500).json({
        success: false,
        error: 'Access verification failed'
      });
    }
  };
};