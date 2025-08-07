import { Request } from 'express';
import { getDB } from '@/database/connection';
import { getRedis } from '@/database/redis';
import { jwtService } from './jwt.service';

export interface DeviceFingerprint {
  userAgent: string;
  acceptLanguage?: string;
  acceptEncoding?: string;
  platform?: string;
  screenResolution?: string;
  timezone?: string;
  plugins?: string[];
}

export interface LocationData {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
}

export interface SessionContext {
  userId: string;
  ipAddress: string;
  userAgent?: string;
  deviceFingerprint?: DeviceFingerprint;
  location?: LocationData;
}

export interface SecurityEvent {
  type: 'login' | 'login_failed' | 'logout' | 'token_refresh' | 'suspicious_activity' | 'mfa_required' | 'password_changed';
  userId: string;
  ipAddress: string;
  userAgent?: string;
  location?: LocationData;
  metadata?: any;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export interface RiskAssessment {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  requiresMfa: boolean;
  shouldBlock: boolean;
}

export class SessionService {
  private readonly SUSPICIOUS_LOGIN_THRESHOLD = 50;
  private readonly HIGH_RISK_THRESHOLD = 75;
  private readonly LOCATION_CHANGE_THRESHOLD = 1000; // km
  private readonly MAX_CONCURRENT_SESSIONS = 50; // Temporarily increased for development

  /**
   * Create a new session with risk assessment
   */
  async createSession(context: SessionContext): Promise<{
    success: boolean;
    riskAssessment: RiskAssessment;
    requiresMfa?: boolean;
    sessionId?: string;
    error?: string;
  }> {
    try {
      const db = getDB();

      // Assess login risk
      const riskAssessment = await this.assessLoginRisk(context);

      // Check if session should be blocked
      if (riskAssessment.shouldBlock) {
        await this.logSecurityEvent({
          type: 'suspicious_activity',
          userId: context.userId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          location: context.location,
          metadata: { riskScore: riskAssessment.score, factors: riskAssessment.factors },
          riskLevel: riskAssessment.level,
          timestamp: new Date(),
        });

        return {
          success: false,
          riskAssessment,
          error: 'Login blocked due to suspicious activity',
        };
      }

      // Check concurrent session limit
      const activeSessions = await this.getActiveSessionCount(context.userId);
      if (activeSessions >= this.MAX_CONCURRENT_SESSIONS) {
        return {
          success: false,
          riskAssessment,
          error: 'Maximum number of concurrent sessions exceeded',
        };
      }

      // Log successful login attempt
      await this.logSecurityEvent({
        type: 'login',
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        location: context.location,
        metadata: { riskScore: riskAssessment.score },
        riskLevel: riskAssessment.level,
        timestamp: new Date(),
      });

      // Update user's last login info
      await db.query(`
        UPDATE users 
        SET last_login_at = NOW(), last_login_ip = $1
        WHERE id = $2
      `, [context.ipAddress, context.userId]);

      return {
        success: true,
        riskAssessment,
        requiresMfa: riskAssessment.requiresMfa,
      };
    } catch (error) {
      console.error('Session creation failed:', error);
      return {
        success: false,
        riskAssessment: { score: 100, level: 'critical', factors: ['system_error'], requiresMfa: true, shouldBlock: true },
        error: 'Session creation failed',
      };
    }
  }

  /**
   * Assess login risk based on various factors
   */
  async assessLoginRisk(context: SessionContext): Promise<RiskAssessment> {
    let riskScore = 0;
    const factors: string[] = [];

    try {
      const db = getDB();
      const redis = getRedis();

      // Get user's login history
      const userHistory = await db.query(`
        SELECT last_login_at, last_login_ip
        FROM users 
        WHERE id = $1
      `, [context.userId]);

      if (userHistory.rows.length === 0) {
        factors.push('user_not_found');
        return { score: 100, level: 'critical', factors, requiresMfa: true, shouldBlock: true };
      }

      const { last_login_at: lastLogin, last_login_ip: lastIp } = userHistory.rows[0];

      // Factor 1: New IP address
      if (lastIp && lastIp !== context.ipAddress) {
        riskScore += 20;
        factors.push('new_ip_address');

        // Check if IP is from different geographical location
        if (context.location && await this.isSignificantLocationChange(context.userId, context.location)) {
          riskScore += 30;
          factors.push('location_change');
        }
      }

      // Factor 2: Time since last login
      if (lastLogin) {
        const daysSinceLastLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastLogin > 30) {
          riskScore += 15;
          factors.push('long_time_since_last_login');
        }
      } else {
        riskScore += 10;
        factors.push('first_time_login');
      }

      // Factor 3: Failed login attempts from this IP
      const failedAttempts = await redis.get(`failed_logins:${context.ipAddress}`);
      if (failedAttempts && parseInt(failedAttempts) > 0) {
        riskScore += Math.min(25, parseInt(failedAttempts) * 5);
        factors.push('recent_failed_attempts');
      }

      // Factor 4: Unusual time of day
      const hour = new Date().getHours();
      if (hour < 6 || hour > 22) {
        riskScore += 10;
        factors.push('unusual_time');
      }

      // Factor 5: Device fingerprint check
      if (context.deviceFingerprint && await this.isNewDevice(context.userId, context.deviceFingerprint)) {
        riskScore += 20;
        factors.push('new_device');
      }

      // Factor 6: User agent analysis
      if (context.userAgent && this.isAutomatedUserAgent(context.userAgent)) {
        riskScore += 40;
        factors.push('automated_user_agent');
      }

      // Factor 7: IP reputation check
      const ipRisk = await this.checkIpReputation(context.ipAddress);
      if (ipRisk > 0) {
        riskScore += ipRisk;
        factors.push('suspicious_ip');
      }

      // Factor 8: Concurrent login attempts
      const recentAttempts = await redis.get(`login_attempts:${context.userId}:${Math.floor(Date.now() / 60000)}`);
      if (recentAttempts && parseInt(recentAttempts) > 3) {
        riskScore += 25;
        factors.push('rapid_login_attempts');
      }

      // Determine risk level
      let level: 'low' | 'medium' | 'high' | 'critical';
      if (riskScore >= 80) level = 'critical';
      else if (riskScore >= 60) level = 'high';
      else if (riskScore >= 30) level = 'medium';
      else level = 'low';

      // Determine if MFA is required
      const requiresMfa = riskScore >= this.SUSPICIOUS_LOGIN_THRESHOLD;
      const shouldBlock = riskScore >= this.HIGH_RISK_THRESHOLD;

      return {
        score: Math.min(100, riskScore),
        level,
        factors,
        requiresMfa,
        shouldBlock,
      };
    } catch (error) {
      console.error('Risk assessment failed:', error);
      return { score: 50, level: 'medium', factors: ['assessment_error'], requiresMfa: true, shouldBlock: false };
    }
  }

  /**
   * Get device fingerprint from request
   */
  getDeviceFingerprint(req: Request): DeviceFingerprint {
    return {
      userAgent: req.get('User-Agent') || '',
      acceptLanguage: req.get('Accept-Language'),
      acceptEncoding: req.get('Accept-Encoding'),
      // Additional fingerprinting data would come from client-side JavaScript
    };
  }

  /**
   * Get location data from IP address
   */
  async getLocationData(ipAddress: string): Promise<LocationData> {
    try {
      // In production, you would use a service like MaxMind GeoIP2 or ipinfo.io
      // For now, return basic IP info
      return {
        ip: ipAddress,
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
      };
    } catch (error) {
      console.error('Location lookup failed:', error);
      return { ip: ipAddress };
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const db = getDB();
      
      // Store in audit log
      await db.query(`
        INSERT INTO login_attempts (
          email, ip_address, user_agent, success, failure_reason,
          attempted_at, location_data
        )
        SELECT u.email, $2, $3, $4, $5, $6, $7
        FROM users u WHERE u.id = $1
      `, [
        event.userId,
        event.ipAddress,
        event.userAgent,
        event.type === 'login',
        event.type === 'login_failed' ? 'risk_assessment' : null,
        event.timestamp,
        event.location ? JSON.stringify(event.location) : null,
      ]);

      // Store in Redis for real-time monitoring
      const redis = getRedis();
      await redis.lPush(`security_events:${event.userId}`, JSON.stringify(event));
      await redis.expire(`security_events:${event.userId}`, 24 * 60 * 60); // 24 hours
      
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get active session count for user
   */
  async getActiveSessionCount(userId: string): Promise<number> {
    try {
      const db = getDB();
      const result = await db.query(
        'SELECT COUNT(*) as count FROM user_sessions WHERE user_id = $1 AND status = \'active\'',
        [userId]
      );
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('Failed to get session count:', error);
      return 0;
    }
  }

  /**
   * Check if there's a significant location change
   */
  private async isSignificantLocationChange(userId: string, newLocation: LocationData): Promise<boolean> {
    try {
      const redis = getRedis();
      const lastLocationData = await redis.get(`last_location:${userId}`);
      
      if (!lastLocationData) {
        // Store current location for future comparisons
        await redis.setEx(`last_location:${userId}`, 30 * 24 * 60 * 60, JSON.stringify(newLocation));
        return false;
      }

      const lastLocation = JSON.parse(lastLocationData);
      
      // Calculate distance if coordinates are available
      if (lastLocation.latitude && lastLocation.longitude && newLocation.latitude && newLocation.longitude) {
        const distance = this.calculateDistance(
          lastLocation.latitude, lastLocation.longitude,
          newLocation.latitude, newLocation.longitude
        );
        
        return distance > this.LOCATION_CHANGE_THRESHOLD;
      }

      // Fallback to country comparison
      return lastLocation.country !== newLocation.country;
    } catch (error) {
      console.error('Location change check failed:', error);
      return false;
    }
  }

  /**
   * Check if this is a new device for the user
   */
  private async isNewDevice(userId: string, fingerprint: DeviceFingerprint): Promise<boolean> {
    try {
      const redis = getRedis();
      const deviceKey = `devices:${userId}`;
      const fingerprintHash = this.hashFingerprint(fingerprint);
      
      const isKnownDevice = await redis.sIsMember(deviceKey, fingerprintHash);
      
      if (!isKnownDevice) {
        // Add device to known devices
        await redis.sAdd(deviceKey, fingerprintHash);
        await redis.expire(deviceKey, 90 * 24 * 60 * 60); // 90 days
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Device check failed:', error);
      return false;
    }
  }

  /**
   * Check if user agent appears to be automated/bot
   */
  private isAutomatedUserAgent(userAgent: string): boolean {
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /java/i,
      /postman/i, /insomnia/i
    ];
    
    return botPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Check IP reputation (simplified implementation)
   */
  private async checkIpReputation(ipAddress: string): Promise<number> {
    try {
      const redis = getRedis();
      
      // Check if IP is in known bad list
      const isBad = await redis.sIsMember('bad_ips', ipAddress);
      if (isBad) return 50;
      
      // Check recent failed attempts from this IP across all users
      const failedAttempts = await redis.get(`global_failed:${ipAddress}`);
      if (failedAttempts && parseInt(failedAttempts) > 10) return 30;
      
      return 0;
    } catch (error) {
      console.error('IP reputation check failed:', error);
      return 0;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  /**
   * Hash device fingerprint for storage
   */
  private hashFingerprint(fingerprint: DeviceFingerprint): string {
    const crypto = require('crypto');
    const fingerprintString = JSON.stringify(fingerprint);
    return crypto.createHash('sha256').update(fingerprintString).digest('hex');
  }
}

export const sessionService = new SessionService();