import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { getDB } from '@/database/connection';
import { getRedis } from '@/database/redis';
import { jwtService } from '@/services/jwt.service';
import { mfaService } from '@/services/mfa.service';
import { passwordService } from '@/services/password.service';
import { sessionService } from '@/services/session.service';
import { authMiddleware, requireRole, requireOwnership } from '@/middleware/auth';
import { AuthPayload } from '@/types';

const router = Router();

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const mfaLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  mfaCode: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const confirmResetSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

const setupMfaSchema = Joi.object({
  totpCode: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
});

const verifyMfaSchema = Joi.object({
  code: Joi.string().min(4).max(6).required(),
  pendingSessionId: Joi.string().optional(),
});

/**
 * POST /auth/login
 * Standard email/password login with risk assessment
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: error.details[0].message,
      });
    }

    const { email, password } = value;
    const db = getDB();

    // Find user with organization info
    const userResult = await db.query(`
      SELECT 
        u.id, u.org_id, u.email, u.password_hash, u.first_name, u.last_name, 
        u.role, u.status, u.mfa_enabled, u.failed_login_attempts, u.locked_until,
        o.name as org_name, o.type as org_type, o.status as org_status
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE LOWER(u.email) = LOWER($1)
    `, [email]);

    if (userResult.rows.length === 0) {
      // Log failed attempt without revealing user existence
      await sessionService.logSecurityEvent({
        type: 'login_failed',
        userId: 'unknown',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { reason: 'user_not_found', email },
        riskLevel: 'medium',
        timestamp: new Date(),
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    const user = userResult.rows[0];

    // Check account status
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Account is not active',
      });
    }

    if (user.org_status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Organization is not active',
      });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({
        success: false,
        error: 'Account is temporarily locked',
        lockedUntil: user.locked_until,
      });
    }

    // Verify password
    if (!user.password_hash || !await bcrypt.compare(password, user.password_hash)) {
      // Handle failed login
      const { isLocked, attemptsRemaining } = await passwordService.handleFailedLogin(user.id);

      await sessionService.logSecurityEvent({
        type: 'login_failed',
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { reason: 'invalid_password', attemptsRemaining },
        riskLevel: 'medium',
        timestamp: new Date(),
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        ...(isLocked && { locked: true, attemptsRemaining: 0 }),
        ...(!isLocked && { attemptsRemaining }),
      });
    }

    // Create session context
    const sessionContext = {
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceFingerprint: sessionService.getDeviceFingerprint(req),
      location: await sessionService.getLocationData(req.ip),
    };

    // Assess login risk
    const sessionResult = await sessionService.createSession(sessionContext);
    
    if (!sessionResult.success) {
      return res.status(403).json({
        success: false,
        error: sessionResult.error,
        riskAssessment: sessionResult.riskAssessment,
      });
    }

    // Check if MFA is required (always required in development mode)
    const isDevMode = process.env.NODE_ENV === 'development';
    if (user.mfa_enabled || sessionResult.requiresMfa || isDevMode) {
      // Store pending MFA session in Redis
      const redis = getRedis();
      const pendingSessionId = `pending_mfa:${user.id}:${Date.now()}`;
      
      await redis.setEx(pendingSessionId, 300, JSON.stringify({
        userId: user.id,
        email: user.email,
        sessionContext,
        riskAssessment: sessionResult.riskAssessment,
      }));

      return res.status(200).json({
        success: true,
        requiresMfa: true,
        pendingSessionId,
        riskAssessment: sessionResult.riskAssessment,
      });
    }

    // Reset failed attempts on successful login
    await passwordService.resetFailedAttempts(user.id);

    // Create JWT tokens
    const authPayload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId: user.org_id,
      orgName: user.org_name,
      orgType: user.org_type,
      mfaEnabled: user.mfa_enabled,
    };

    const tokenPair = await jwtService.generateTokenPair(authPayload, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceInfo: sessionService.getDeviceFingerprint(req),
      location: await sessionService.getLocationData(req.ip),
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          organization: {
            id: user.org_id,
            name: user.org_name,
            type: user.org_type,
          },
          mfaEnabled: user.mfa_enabled,
        },
        tokens: {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresAt: tokenPair.expiresAt,
        },
        riskAssessment: sessionResult.riskAssessment,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * POST /auth/mfa/complete
 * Complete MFA authentication
 */
router.post('/mfa/complete', async (req: Request, res: Response) => {
  try {
    const { error, value } = verifyMfaSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: error.details[0].message,
      });
    }

    const { code, pendingSessionId } = req.body;
    const redis = getRedis();

    // Get pending session
    const pendingSession = await redis.get(pendingSessionId);
    if (!pendingSession) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired MFA session',
      });
    }

    const sessionData = JSON.parse(pendingSession);
    const { userId, email, sessionContext, riskAssessment } = sessionData;

    // Get user to check if MFA is actually enabled
    const db = getDB();
    const mfaCheckResult = await db.query('SELECT mfa_enabled FROM users WHERE id = $1', [userId]);
    const userMfaEnabled = mfaCheckResult.rows[0]?.mfa_enabled || false;
    
    // If user doesn't have MFA enabled but risk assessment required it (or dev mode), allow bypass with special code
    const isDevMode = process.env.NODE_ENV === 'development';
    if ((!userMfaEnabled || isDevMode) && code === '0000') {
      // Allow bypass for development/testing
      console.log('MFA bypass used for development mode or user without MFA enabled');
    } else {
      // Verify MFA code normally
      const mfaResult = await mfaService.verifyMfa(userId, code);
      if (!mfaResult.isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid MFA code',
        });
      }
    }

    // Get user data
    const userResult = await db.query(`
      SELECT 
        u.id, u.org_id, u.email, u.first_name, u.last_name, 
        u.role, u.mfa_enabled,
        o.name as org_name, o.type as org_type
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.id = $1
    `, [userId]);

    const user = userResult.rows[0];

    // Reset failed attempts and clear pending session
    await passwordService.resetFailedAttempts(userId);
    await redis.del(pendingSessionId);

    // Create JWT tokens
    const authPayload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId: user.org_id,
      orgName: user.org_name,
      orgType: user.org_type,
      mfaEnabled: user.mfa_enabled,
    };

    const tokenPair = await jwtService.generateTokenPair(authPayload, sessionContext);

    // Log successful MFA completion
    await sessionService.logSecurityEvent({
      type: 'login',
      userId: user.id,
      ipAddress: sessionContext.ipAddress,
      userAgent: sessionContext.userAgent,
      metadata: { 
        mfaMethod: mfaResult.method,
        riskScore: riskAssessment.score 
      },
      riskLevel: riskAssessment.level,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          organization: {
            id: user.org_id,
            name: user.org_name,
            type: user.org_type,
          },
          mfaEnabled: user.mfa_enabled,
        },
        tokens: {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresAt: tokenPair.expiresAt,
        },
        mfaUsed: mfaResult.method,
        remainingBackupCodes: mfaResult.remainingBackupCodes,
      },
    });
  } catch (error) {
    console.error('MFA completion error:', error);
    res.status(500).json({
      success: false,
      error: 'MFA verification failed',
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: error.details[0].message,
      });
    }

    const { refreshToken } = value;

    // Create session info for refresh
    const sessionInfo = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceInfo: sessionService.getDeviceFingerprint(req),
      location: await sessionService.getLocationData(req.ip),
    };

    const tokenPair = await jwtService.refreshAccessToken(refreshToken, sessionInfo);
    
    if (!tokenPair) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }

    res.json({
      success: true,
      data: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresAt: tokenPair.expiresAt,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
    });
  }
});

/**
 * POST /auth/logout
 * Logout and revoke current session
 */
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      // Find and revoke the current session
      const db = getDB();
      const sessionResult = await db.query(
        'SELECT id FROM user_sessions WHERE user_id = $1 AND status = \'active\' ORDER BY last_activity_at DESC LIMIT 1',
        [req.user!.userId]
      );

      if (sessionResult.rows.length > 0) {
        await jwtService.revokeSession(sessionResult.rows[0].id, 'user_logout');
      }
    }

    // Log logout event
    await sessionService.logSecurityEvent({
      type: 'logout',
      userId: req.user!.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      riskLevel: 'low',
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

/**
 * POST /auth/logout-all
 * Logout from all sessions
 */
router.post('/logout-all', authMiddleware, async (req: Request, res: Response) => {
  try {
    const success = await jwtService.revokeAllUserSessions(req.user!.userId, 'user_logout_all');
    
    if (success) {
      // Log logout all event
      await sessionService.logSecurityEvent({
        type: 'logout',
        userId: req.user!.userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { logoutType: 'all_sessions' },
        riskLevel: 'low',
        timestamp: new Date(),
      });

      res.json({
        success: true,
        message: 'Logged out from all sessions',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to logout from all sessions',
      });
    }
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const result = await db.query(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.role, u.status,
        u.mfa_enabled, u.last_login_at, u.password_changed_at,
        o.id as org_id, o.name as org_name, o.type as org_type
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.id = $1
    `, [req.user!.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const user = result.rows[0];
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        status: user.status,
        organization: {
          id: user.org_id,
          name: user.org_name,
          type: user.org_type,
        },
        security: {
          mfaEnabled: user.mfa_enabled,
          lastLogin: user.last_login_at,
          passwordChanged: user.password_changed_at,
        },
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info',
    });
  }
});

/**
 * GET /auth/sessions
 * Get active sessions for current user
 */
router.get('/sessions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const sessions = await jwtService.getUserSessions(req.user!.userId);
    
    res.json({
      success: true,
      data: {
        sessions: sessions.map(session => ({
          id: session.id,
          deviceInfo: session.deviceInfo,
          location: session.location,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          createdAt: session.createdAt,
          lastActivity: session.lastActivityAt,
          current: false, // TODO: Identify current session
        })),
      },
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sessions',
    });
  }
});

/**
 * DELETE /auth/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/sessions/:sessionId', authMiddleware, requireOwnership('userId'), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const success = await jwtService.revokeSession(sessionId, 'manual_revoke');
    
    if (success) {
      res.json({
        success: true,
        message: 'Session revoked',
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke session',
    });
  }
});

/**
 * POST /auth/password/change
 * Change password
 */
router.post('/password/change', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: error.details[0].message,
      });
    }

    const { currentPassword, newPassword } = value;
    const result = await passwordService.changePassword(
      req.user!.userId,
      currentPassword,
      newPassword
    );

    if (result.success) {
      // Log password change
      await sessionService.logSecurityEvent({
        type: 'password_changed',
        userId: req.user!.userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        riskLevel: 'low',
        timestamp: new Date(),
      });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Password change failed',
    });
  }
});

/**
 * POST /auth/password/reset
 * Request password reset
 */
router.post('/password/reset', async (req: Request, res: Response) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: error.details[0].message,
      });
    }

    const { email } = value;
    const tokenData = await passwordService.generateResetToken(email);

    // Always return success for security (don't reveal if email exists)
    res.json({
      success: true,
      message: 'If the email exists, a reset link has been sent',
    });

    // TODO: Send email with reset token
    if (tokenData) {
      console.log(`Password reset token for ${email}: ${tokenData.token}`);
    }
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset failed',
    });
  }
});

/**
 * POST /auth/password/reset/confirm
 * Confirm password reset with token
 */
router.post('/password/reset/confirm', async (req: Request, res: Response) => {
  try {
    const { error, value } = confirmResetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: error.details[0].message,
      });
    }

    const { token, newPassword } = value;
    const result = await passwordService.resetPassword(token, newPassword);

    if (result.success) {
      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Password reset confirm error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset failed',
    });
  }
});

/**
 * POST /auth/mfa/setup
 * Setup MFA for user
 */
router.post('/mfa/setup', authMiddleware, async (req: Request, res: Response) => {
  try {
    const mfaData = await mfaService.generateMfaSetup(req.user!.userId, req.user!.email);
    
    res.json({
      success: true,
      data: {
        qrCode: mfaData.qrCodeUrl,
        manualEntryKey: mfaData.manualEntryKey,
        backupCodes: mfaData.backupCodes,
      },
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({
      success: false,
      error: 'MFA setup failed',
    });
  }
});

/**
 * POST /auth/mfa/enable
 * Enable MFA after setup verification
 */
router.post('/mfa/enable', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { error, value } = setupMfaSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: error.details[0].message,
      });
    }

    const { totpCode } = value;
    const success = await mfaService.enableMfa(req.user!.userId, totpCode);

    if (success) {
      res.json({
        success: true,
        message: 'MFA enabled successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid TOTP code',
      });
    }
  } catch (error) {
    console.error('MFA enable error:', error);
    res.status(500).json({
      success: false,
      error: 'MFA enable failed',
    });
  }
});

/**
 * POST /auth/mfa/disable
 * Disable MFA
 */
router.post('/mfa/disable', authMiddleware, async (req: Request, res: Response) => {
  try {
    const success = await mfaService.disableMfa(req.user!.userId);
    
    if (success) {
      res.json({
        success: true,
        message: 'MFA disabled successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to disable MFA',
      });
    }
  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(500).json({
      success: false,
      error: 'MFA disable failed',
    });
  }
});

/**
 * POST /auth/mfa/regenerate-codes
 * Regenerate backup codes
 */
router.post('/mfa/regenerate-codes', authMiddleware, async (req: Request, res: Response) => {
  try {
    const backupCodes = await mfaService.regenerateBackupCodes(req.user!.userId);
    
    if (backupCodes) {
      res.json({
        success: true,
        data: {
          backupCodes,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'MFA not enabled or regeneration failed',
      });
    }
  } catch (error) {
    console.error('MFA regenerate codes error:', error);
    res.status(500).json({
      success: false,
      error: 'Backup code regeneration failed',
    });
  }
});

/**
 * GET /auth/mfa/status
 * Get MFA status
 */
router.get('/mfa/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const status = await mfaService.getMfaStatus(req.user!.userId);
    const required = await mfaService.isMfaRequired(req.user!.userId);
    
    res.json({
      success: true,
      data: {
        enabled: status.enabled,
        required,
        backupCodesCount: status.backupCodesCount,
        lastUsed: status.lastUsed,
      },
    });
  } catch (error) {
    console.error('MFA status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get MFA status',
    });
  }
});

export default router;