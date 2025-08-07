import jwt from 'jsonwebtoken';
import { UserSession, AuthPayload } from '@/types/auth';
import crypto from 'crypto';
import { getDB } from '@/database/connection';
import { getRedis } from '@/database/redis';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface SessionInfo {
  deviceInfo?: any;
  ipAddress: string;
  userAgent?: string;
  location?: any;
}

export class JwtService {
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly JWT_SECRET = process.env.JWT_SECRET!;
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

  constructor() {
    if (!this.JWT_SECRET || !this.JWT_REFRESH_SECRET) {
      throw new Error('JWT secrets must be configured');
    }
  }

  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(
    user: AuthPayload,
    sessionInfo: SessionInfo
  ): Promise<TokenPair> {
    const db = getDB();
    const redis = getRedis();

    // Generate tokens
    const accessToken = jwt.sign(user, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      issuer: 'mss-platform',
      audience: 'mss-users',
    });

    const refreshTokenPayload = {
      userId: user.userId,
      sessionId: crypto.randomUUID(),
    };

    const refreshToken = jwt.sign(refreshTokenPayload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      issuer: 'mss-platform',
      audience: 'mss-users',
    });

    // Calculate expiry dates
    const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store session in database
    await db.query(`
      INSERT INTO user_sessions (
        user_id, session_token, refresh_token, device_info, 
        ip_address, user_agent, location, expires_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
    `, [
      user.userId,
      this.hashToken(accessToken),
      this.hashToken(refreshToken),
      sessionInfo.deviceInfo || {},
      sessionInfo.ipAddress,
      sessionInfo.userAgent,
      sessionInfo.location || {},
      refreshTokenExpiry,
    ]);

    // Store access token in Redis for fast lookup (optional)
    await redis.setEx(
      `access_token:${this.hashToken(accessToken)}`,
      15 * 60, // 15 minutes in seconds
      JSON.stringify({ userId: user.userId, expires: accessTokenExpiry })
    );

    return {
      accessToken,
      refreshToken,
      expiresAt: accessTokenExpiry,
    };
  }

  /**
   * Verify and decode access token
   */
  async verifyAccessToken(token: string): Promise<AuthPayload | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'mss-platform',
        audience: 'mss-users',
      }) as AuthPayload;

      // Check if token is blacklisted in Redis
      const redis = getRedis();
      const isBlacklisted = await redis.exists(`blacklist:${this.hashToken(token)}`);
      
      if (isBlacklisted) {
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('Access token verification failed:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string, sessionInfo: SessionInfo): Promise<TokenPair | null> {
    try {
      const db = getDB();
      
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET, {
        issuer: 'mss-platform',
        audience: 'mss-users',
      }) as { userId: string; sessionId: string };

      // Find active session
      const sessionResult = await db.query(`
        SELECT s.*, u.email, u.role, u.org_id, o.name as org_name, o.type as org_type
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        JOIN organizations o ON u.org_id = o.id
        WHERE s.refresh_token = $1 
        AND s.status = 'active' 
        AND s.expires_at > NOW()
      `, [this.hashToken(refreshToken)]);

      if (sessionResult.rows.length === 0) {
        return null;
      }

      const session = sessionResult.rows[0];
      const user: AuthPayload = {
        userId: session.user_id,
        email: session.email,
        role: session.role,
        orgId: session.org_id,
        orgName: session.org_name,
        orgType: session.org_type,
      };

      // Generate new token pair
      const newTokenPair = await this.generateTokenPair(user, sessionInfo);

      // Revoke old session
      await db.query(`
        UPDATE user_sessions 
        SET status = 'revoked', revoked_at = NOW(), revoked_reason = 'token_refresh'
        WHERE refresh_token = $1
      `, [this.hashToken(refreshToken)]);

      // Update last activity
      await db.query(`
        UPDATE user_sessions 
        SET last_activity_at = NOW()
        WHERE refresh_token = $1
      `, [this.hashToken(newTokenPair.refreshToken)]);

      return newTokenPair;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string, reason = 'manual_revoke'): Promise<boolean> {
    try {
      const db = getDB();
      const redis = getRedis();

      // Get session details before revoking
      const sessionResult = await db.query(
        'SELECT session_token, refresh_token FROM user_sessions WHERE id = $1',
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        return false;
      }

      const session = sessionResult.rows[0];

      // Revoke session in database
      await db.query(`
        UPDATE user_sessions 
        SET status = 'revoked', revoked_at = NOW(), revoked_reason = $1
        WHERE id = $2
      `, [reason, sessionId]);

      // Blacklist tokens in Redis
      await redis.setEx(`blacklist:${session.session_token}`, 15 * 60, 'revoked'); // 15 minutes
      await redis.setEx(`blacklist:${session.refresh_token}`, 7 * 24 * 60 * 60, 'revoked'); // 7 days

      return true;
    } catch (error) {
      console.error('Session revocation failed:', error);
      return false;
    }
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId: string, reason = 'logout_all'): Promise<boolean> {
    try {
      const db = getDB();
      const redis = getRedis();

      // Get all active sessions
      const sessionsResult = await db.query(
        'SELECT id, session_token, refresh_token FROM user_sessions WHERE user_id = $1 AND status = \'active\'',
        [userId]
      );

      if (sessionsResult.rows.length === 0) {
        return true; // No active sessions
      }

      // Revoke all sessions in database
      await db.query(`
        UPDATE user_sessions 
        SET status = 'revoked', revoked_at = NOW(), revoked_reason = $1
        WHERE user_id = $2 AND status = 'active'
      `, [reason, userId]);

      // Blacklist all tokens in Redis
      for (const session of sessionsResult.rows) {
        await redis.setEx(`blacklist:${session.session_token}`, 15 * 60, 'revoked');
        await redis.setEx(`blacklist:${session.refresh_token}`, 7 * 24 * 60 * 60, 'revoked');
      }

      return true;
    } catch (error) {
      console.error('All sessions revocation failed:', error);
      return false;
    }
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    try {
      const db = getDB();
      
      const result = await db.query(`
        SELECT 
          id, device_info, ip_address, user_agent, location,
          created_at, expires_at, last_activity_at, status
        FROM user_sessions 
        WHERE user_id = $1 AND status = 'active'
        ORDER BY last_activity_at DESC
      `, [userId]);

      return result.rows.map(row => ({
        id: row.id,
        deviceInfo: row.device_info,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        location: row.location,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        lastActivityAt: row.last_activity_at,
        status: row.status,
      }));
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const db = getDB();
      await db.query(
        'UPDATE user_sessions SET last_activity_at = NOW() WHERE id = $1',
        [sessionId]
      );
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const db = getDB();
      const result = await db.query(`
        UPDATE user_sessions 
        SET status = 'expired' 
        WHERE status = 'active' AND expires_at < NOW()
        RETURNING id
      `);

      return result.rowCount || 0;
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  /**
   * Hash a token for storage (one-way)
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a secure random token
   */
  generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

export const jwtService = new JwtService();