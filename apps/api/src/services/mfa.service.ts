import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { getDB } from '@/database/connection';
import { getRedis } from '@/database/redis';

export interface MfaSetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface MfaVerificationResult {
  isValid: boolean;
  method: 'totp' | 'backup_code' | null;
  remainingBackupCodes?: number;
}

export class MfaService {
  private readonly APP_NAME = 'MSS Platform';
  private readonly TOTP_WINDOW = 1; // Allow 1 step before/after current time
  private readonly BACKUP_CODE_COUNT = 10;

  /**
   * Generate MFA setup data for a user
   */
  async generateMfaSetup(userId: string, userEmail: string): Promise<MfaSetupData> {
    const db = getDB();
    
    // Generate TOTP secret
    const secret = authenticator.generateSecret();
    
    // Create OTP Auth URL
    const otpAuthUrl = authenticator.keyuri(
      userEmail,
      this.APP_NAME,
      secret
    );

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);
    
    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

    // Store encrypted secret and backup codes in database
    const encryptedSecret = this.encryptSecret(secret);
    
    await db.query(`
      UPDATE users 
      SET mfa_secret = $1, mfa_backup_codes = $2
      WHERE id = $3
    `, [encryptedSecret, hashedBackupCodes, userId]);

    return {
      secret,
      qrCodeUrl,
      backupCodes,
      manualEntryKey: secret,
    };
  }

  /**
   * Enable MFA for a user after verification
   */
  async enableMfa(userId: string, totpCode: string): Promise<boolean> {
    const db = getDB();
    
    // Get user's MFA secret
    const result = await db.query(
      'SELECT mfa_secret FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const encryptedSecret = result.rows[0].mfa_secret;
    if (!encryptedSecret) {
      return false;
    }

    // Decrypt secret and verify code
    const secret = this.decryptSecret(encryptedSecret);
    const isValid = authenticator.verify({
      token: totpCode,
      secret,
      window: this.TOTP_WINDOW,
    });

    if (!isValid) {
      return false;
    }

    // Enable MFA
    await db.query(`
      UPDATE users 
      SET mfa_enabled = true, mfa_last_used = NOW()
      WHERE id = $1
    `, [userId]);

    return true;
  }

  /**
   * Verify MFA code (TOTP or backup code)
   */
  async verifyMfa(userId: string, code: string): Promise<MfaVerificationResult> {
    const db = getDB();
    const redis = getRedis();
    
    // Get user's MFA data
    const result = await db.query(`
      SELECT mfa_secret, mfa_backup_codes 
      FROM users 
      WHERE id = $1 AND mfa_enabled = true
    `, [userId]);

    if (result.rows.length === 0) {
      return { isValid: false, method: null };
    }

    const { mfa_secret: encryptedSecret, mfa_backup_codes: backupCodes } = result.rows[0];

    // Check if code was recently used (replay attack prevention)
    const recentlyUsed = await redis.exists(`mfa_used:${userId}:${code}`);
    if (recentlyUsed) {
      return { isValid: false, method: null };
    }

    // Try TOTP verification first
    if (encryptedSecret) {
      const secret = this.decryptSecret(encryptedSecret);
      const isValidTotp = authenticator.verify({
        token: code,
        secret,
        window: this.TOTP_WINDOW,
      });

      if (isValidTotp) {
        // Mark code as used to prevent replay
        await redis.setEx(`mfa_used:${userId}:${code}`, 60, 'used'); // 60 seconds window
        
        // Update last used timestamp
        await db.query(
          'UPDATE users SET mfa_last_used = NOW() WHERE id = $1',
          [userId]
        );

        return { isValid: true, method: 'totp' };
      }
    }

    // Try backup code verification
    if (backupCodes && backupCodes.length > 0) {
      const hashedCode = this.hashBackupCode(code);
      const codeIndex = backupCodes.indexOf(hashedCode);

      if (codeIndex !== -1) {
        // Remove used backup code
        const updatedCodes = [...backupCodes];
        updatedCodes.splice(codeIndex, 1);

        await db.query(`
          UPDATE users 
          SET mfa_backup_codes = $1, mfa_last_used = NOW()
          WHERE id = $2
        `, [updatedCodes, userId]);

        // Mark code as used
        await redis.setEx(`mfa_used:${userId}:${code}`, 300, 'used'); // 5 minutes for backup codes

        return { 
          isValid: true, 
          method: 'backup_code',
          remainingBackupCodes: updatedCodes.length 
        };
      }
    }

    return { isValid: false, method: null };
  }

  /**
   * Disable MFA for a user
   */
  async disableMfa(userId: string): Promise<boolean> {
    try {
      const db = getDB();
      
      await db.query(`
        UPDATE users 
        SET mfa_enabled = false, mfa_secret = NULL, mfa_backup_codes = NULL
        WHERE id = $1
      `, [userId]);

      return true;
    } catch (error) {
      console.error('Failed to disable MFA:', error);
      return false;
    }
  }

  /**
   * Generate new backup codes for a user
   */
  async regenerateBackupCodes(userId: string): Promise<string[] | null> {
    try {
      const db = getDB();
      
      // Check if user has MFA enabled
      const result = await db.query(
        'SELECT mfa_enabled FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].mfa_enabled) {
        return null;
      }

      // Generate new backup codes
      const backupCodes = this.generateBackupCodes();
      const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

      await db.query(
        'UPDATE users SET mfa_backup_codes = $1 WHERE id = $2',
        [hashedBackupCodes, userId]
      );

      return backupCodes;
    } catch (error) {
      console.error('Failed to regenerate backup codes:', error);
      return null;
    }
  }

  /**
   * Get MFA status for a user
   */
  async getMfaStatus(userId: string): Promise<{
    enabled: boolean;
    backupCodesCount: number;
    lastUsed: Date | null;
  }> {
    try {
      const db = getDB();
      
      const result = await db.query(`
        SELECT mfa_enabled, mfa_backup_codes, mfa_last_used 
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return { enabled: false, backupCodesCount: 0, lastUsed: null };
      }

      const user = result.rows[0];
      return {
        enabled: user.mfa_enabled || false,
        backupCodesCount: user.mfa_backup_codes ? user.mfa_backup_codes.length : 0,
        lastUsed: user.mfa_last_used,
      };
    } catch (error) {
      console.error('Failed to get MFA status:', error);
      return { enabled: false, backupCodesCount: 0, lastUsed: null };
    }
  }

  /**
   * Check if MFA is required for user's role
   */
  async isMfaRequired(userId: string): Promise<boolean> {
    try {
      const db = getDB();
      
      const result = await db.query(`
        SELECT u.role, o.type 
        FROM users u 
        JOIN organizations o ON u.org_id = o.id 
        WHERE u.id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return false;
      }

      const { role, type } = result.rows[0];
      
      // MFA required for high-privilege roles
      const mfaRequiredRoles = [
        'super_admin',
        'admin', 
        'security_analyst',
        'technician'
      ];

      return mfaRequiredRoles.includes(role);
    } catch (error) {
      console.error('Failed to check MFA requirement:', error);
      return false;
    }
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      // Generate 8-character alphanumeric codes
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hash backup code for secure storage
   */
  private hashBackupCode(code: string): string {
    return crypto
      .createHash('sha256')
      .update(code.toUpperCase())
      .digest('hex');
  }

  /**
   * Encrypt MFA secret for database storage
   */
  private encryptSecret(secret: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto.randomBytes(12);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('mfa-secret'));
    
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt MFA secret from database
   */
  private decryptSecret(encryptedSecret: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    
    const [ivHex, authTagHex, encrypted] = encryptedSecret.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('mfa-secret'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

export const mfaService = new MfaService();