import { Request, Response, NextFunction } from 'express';
import { jwtService } from '@/services/jwt.service';
import { getDB } from '@/database/connection';
import { AuthPayload } from '@/types/auth';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      sessionId?: string;
    }
  }
}

/**
 * Main authentication middleware
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ 
        success: false,
        error: 'Access token required' 
      });
      return;
    }

    // Verify token using JWT service
    const decoded = await jwtService.verifyAccessToken(token);
    if (!decoded) {
      res.status(401).json({ 
        success: false,
        error: 'Invalid or expired token' 
      });
      return;
    }

    // Check if user still exists and is active
    const db = getDB();
    const userResult = await db.query(`
      SELECT u.id, u.status, u.mfa_enabled, o.status as org_status
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.id = $1
    `, [decoded.userId]);

    if (userResult.rows.length === 0) {
      res.status(401).json({ 
        success: false,
        error: 'User not found' 
      });
      return;
    }

    const user = userResult.rows[0];
    
    // Check user and organization status
    if (user.status !== 'active') {
      res.status(401).json({ 
        success: false,
        error: 'Account is not active' 
      });
      return;
    }

    if (user.org_status !== 'active') {
      res.status(401).json({ 
        success: false,
        error: 'Organization is not active' 
      });
      return;
    }

    // Add user info to request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ 
      success: false,
      error: 'Authentication failed' 
    });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = await jwtService.verifyAccessToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        success: false,
        error: 'Insufficient permissions',
        details: {
          required: allowedRoles,
          current: req.user.role
        }
      });
      return;
    }

    next();
  };
};

/**
 * Organization-based access control
 */
export const requireOrganization = (orgTypes: string | string[]) => {
  const allowedTypes = Array.isArray(orgTypes) ? orgTypes : [orgTypes];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
      return;
    }

    if (!allowedTypes.includes(req.user.orgType)) {
      res.status(403).json({ 
        success: false,
        error: 'Organization access denied' 
      });
      return;
    }

    next();
  };
};

/**
 * Multi-factor authentication requirement middleware
 */
export const requireMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
      return;
    }

    const db = getDB();
    const result = await db.query(
      'SELECT mfa_enabled FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].mfa_enabled) {
      res.status(403).json({ 
        success: false,
        error: 'Multi-factor authentication required' 
      });
      return;
    }

    next();
  } catch (error) {
    console.error('MFA check error:', error);
    res.status(500).json({ 
      success: false,
      error: 'MFA verification failed' 
    });
  }
};

/**
 * Check if user owns the resource
 */
export const requireOwnership = (userIdParam = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
      return;
    }

    const resourceUserId = req.params[userIdParam];
    if (req.user.userId !== resourceUserId) {
      // Allow super admins to access any resource
      if (req.user.role !== 'super_admin') {
        res.status(403).json({ 
          success: false,
          error: 'Access denied - not resource owner' 
        });
        return;
      }
    }

    next();
  };
};

/**
 * Rate limiting by user
 */
export const rateLimitByUser = (maxRequests: number, windowMs: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next();
        return;
      }

      const { getRedis } = require('@/database/redis');
      const redis = getRedis();
      const key = `rate_limit:${req.user.userId}:${Math.floor(Date.now() / windowMs)}`;
      
      const current = await redis.get(key);
      if (current && parseInt(current) >= maxRequests) {
        res.status(429).json({ 
          success: false,
          error: 'Rate limit exceeded' 
        });
        return;
      }

      await redis.incr(key);
      await redis.expire(key, Math.ceil(windowMs / 1000));
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Continue on error
    }
  };
};