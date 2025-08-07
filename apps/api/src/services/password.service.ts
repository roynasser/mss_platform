import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDB } from '@/database/connection';
import { getRedis } from '@/database/redis';

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  maxAge: number; // days
  preventReuse: number; // last N passwords
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';
  score: number; // 0-100
}

export interface PasswordResetToken {
  token: string;
  expiresAt: Date;
}

export class PasswordService {
  private readonly SALT_ROUNDS = 12;
  private readonly RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
  private readonly MAX_RESET_ATTEMPTS = 3;

  private readonly DEFAULT_POLICY: PasswordPolicy = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    maxAge: 90,
    preventReuse: 5,
  };

  /**
   * Hash password with salt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password against policy
   */
  validatePassword(password: string, policy?: Partial<PasswordPolicy>): PasswordValidationResult {
    const effectivePolicy = { ...this.DEFAULT_POLICY, ...policy };
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < effectivePolicy.minLength) {
      errors.push(`Password must be at least ${effectivePolicy.minLength} characters long`);
    } else {
      score += Math.min(25, (password.length / effectivePolicy.minLength) * 10);
    }

    // Character requirements
    if (effectivePolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (/[A-Z]/.test(password)) {
      score += 15;
    }

    if (effectivePolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (/[a-z]/.test(password)) {
      score += 15;
    }

    if (effectivePolicy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else if (/\d/.test(password)) {
      score += 15;
    }

    if (effectivePolicy.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
      errors.push('Password must contain at least one symbol');
    } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
      score += 15;
    }

    // Additional strength checks
    const uniqueChars = new Set(password).size;
    score += Math.min(15, (uniqueChars / password.length) * 20);

    // Common patterns penalty
    if (/(.)\1{2,}/.test(password)) {
      score -= 10; // Repeating characters
      errors.push('Password should not contain repeating characters');
    }

    if (/123|abc|qwe|password|admin/i.test(password)) {
      score -= 20; // Common patterns
      errors.push('Password should not contain common patterns');
    }

    // Determine strength
    let strength: 'weak' | 'medium' | 'strong' | 'very_strong';
    if (score >= 85) strength = 'very_strong';
    else if (score >= 70) strength = 'strong';
    else if (score >= 50) strength = 'medium';
    else strength = 'weak';

    return {
      isValid: errors.length === 0,
      errors,
      strength,
      score: Math.max(0, Math.min(100, score)),
    };
  }

  /**
   * Change user password with validation
   */
  async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = getDB();

      // Get current password hash
      const result = await db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const currentHash = result.rows[0].password_hash;

      // Verify current password
      if (!await this.verifyPassword(currentPassword, currentHash)) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Validate new password
      const validation = this.validatePassword(newPassword);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      // Check password reuse
      const isReused = await this.checkPasswordReuse(userId, newPassword);
      if (isReused) {
        return { success: false, error: 'Password has been used recently. Please choose a different password.' };
      }

      // Hash new password
      const newHash = await this.hashPassword(newPassword);

      // Update password and reset failed attempts
      await db.query(`
        UPDATE users 
        SET password_hash = $1, 
            password_changed_at = NOW(),
            failed_login_attempts = 0,
            locked_until = NULL
        WHERE id = $2
      `, [newHash, userId]);

      // Store password hash for reuse prevention
      await this.storePasswordHistory(userId, newHash);

      return { success: true };
    } catch (error) {
      console.error('Password change failed:', error);
      return { success: false, error: 'Password change failed' };
    }
  }

  /**
   * Generate password reset token
   */
  async generateResetToken(email: string): Promise<PasswordResetToken | null> {
    try {
      const db = getDB();
      const redis = getRedis();

      // Check rate limiting
      const attemptKey = `reset_attempts:${email}`;
      const attempts = await redis.get(attemptKey);
      
      if (attempts && parseInt(attempts) >= this.MAX_RESET_ATTEMPTS) {
        throw new Error('Too many reset attempts. Please try again later.');
      }

      // Find user
      const userResult = await db.query(
        'SELECT id FROM users WHERE email = $1 AND status = \'active\'',
        [email]
      );

      if (userResult.rows.length === 0) {
        // Don't reveal if email exists for security
        return null;
      }

      const userId = userResult.rows[0].id;
      
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + this.RESET_TOKEN_EXPIRY);

      // Store token in database
      await db.query(`
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          token_hash = EXCLUDED.token_hash,
          expires_at = EXCLUDED.expires_at,
          created_at = NOW(),
          used_at = NULL
      `, [userId, tokenHash, expiresAt]);

      // Increment attempts counter
      await redis.setEx(attemptKey, 3600, (parseInt(attempts || '0') + 1).toString());

      return { token, expiresAt };
    } catch (error) {
      console.error('Reset token generation failed:', error);
      return null;
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(
    token: string, 
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = getDB();
      
      // Hash token for lookup
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find valid token
      const tokenResult = await db.query(`
        SELECT rt.user_id, rt.expires_at, u.email
        FROM password_reset_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token_hash = $1 
        AND rt.used_at IS NULL
        AND rt.expires_at > NOW()
      `, [tokenHash]);

      if (tokenResult.rows.length === 0) {
        return { success: false, error: 'Invalid or expired reset token' };
      }

      const { user_id: userId } = tokenResult.rows[0];

      // Validate new password
      const validation = this.validatePassword(newPassword);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      // Hash new password
      const newHash = await this.hashPassword(newPassword);

      // Update password and mark token as used
      await db.query('BEGIN');
      
      try {
        await db.query(`
          UPDATE users 
          SET password_hash = $1, 
              password_changed_at = NOW(),
              failed_login_attempts = 0,
              locked_until = NULL
          WHERE id = $2
        `, [newHash, userId]);

        await db.query(`
          UPDATE password_reset_tokens 
          SET used_at = NOW()
          WHERE token_hash = $1
        `, [tokenHash]);

        await db.query('COMMIT');

        // Store password hash for reuse prevention
        await this.storePasswordHistory(userId, newHash);

        return { success: true };
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Password reset failed:', error);
      return { success: false, error: 'Password reset failed' };
    }
  }

  /**
   * Check if account is locked due to failed attempts
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    try {
      const db = getDB();
      
      const result = await db.query(`
        SELECT locked_until 
        FROM users 
        WHERE id = $1 AND locked_until > NOW()
      `, [userId]);

      return result.rows.length > 0;
    } catch (error) {
      console.error('Lock check failed:', error);
      return false;
    }
  }

  /**
   * Handle failed login attempt
   */
  async handleFailedLogin(userId: string): Promise<{ isLocked: boolean; attemptsRemaining: number }> {
    try {
      const db = getDB();
      const maxAttempts = 5;
      const lockDuration = 30 * 60 * 1000; // 30 minutes

      const result = await db.query(`
        UPDATE users 
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE 
              WHEN failed_login_attempts + 1 >= $2 
              THEN NOW() + INTERVAL '${lockDuration} milliseconds'
              ELSE NULL 
            END
        WHERE id = $1
        RETURNING failed_login_attempts, locked_until
      `, [userId, maxAttempts]);

      if (result.rows.length === 0) {
        return { isLocked: false, attemptsRemaining: maxAttempts };
      }

      const { failed_login_attempts: attempts, locked_until: lockedUntil } = result.rows[0];
      
      return {
        isLocked: !!lockedUntil,
        attemptsRemaining: Math.max(0, maxAttempts - attempts),
      };
    } catch (error) {
      console.error('Failed login handling error:', error);
      return { isLocked: false, attemptsRemaining: 0 };
    }
  }

  /**
   * Reset failed login attempts on successful login
   */
  async resetFailedAttempts(userId: string): Promise<void> {
    try {
      const db = getDB();
      
      await db.query(`
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL
        WHERE id = $1
      `, [userId]);
    } catch (error) {
      console.error('Failed to reset login attempts:', error);
    }
  }

  /**
   * Check if password was recently used
   */
  private async checkPasswordReuse(userId: string, password: string): Promise<boolean> {
    try {
      const redis = getRedis();
      const recentHashes = await redis.lRange(`password_history:${userId}`, 0, this.DEFAULT_POLICY.preventReuse - 1);
      
      for (const hash of recentHashes) {
        if (await this.verifyPassword(password, hash)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Password reuse check failed:', error);
      return false;
    }
  }

  /**
   * Store password hash in history for reuse prevention
   */
  private async storePasswordHistory(userId: string, passwordHash: string): Promise<void> {
    try {
      const redis = getRedis();
      const historyKey = `password_history:${userId}`;
      
      // Add new hash to beginning of list
      await redis.lPush(historyKey, passwordHash);
      
      // Keep only the last N passwords
      await redis.lTrim(historyKey, 0, this.DEFAULT_POLICY.preventReuse - 1);
      
      // Set expiry on the list
      await redis.expire(historyKey, 90 * 24 * 60 * 60); // 90 days
    } catch (error) {
      console.error('Failed to store password history:', error);
    }
  }
}

export const passwordService = new PasswordService();