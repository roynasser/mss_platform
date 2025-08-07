import jwt from 'jsonwebtoken';
import { jwtDecode } from 'jwt-decode';
import type { User } from '@mss-platform/types';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  organizationId?: string;
  iat: number;
  exp: number;
}

export class JWTService {
  private secret: string;
  private expiresIn: string;

  constructor(secret?: string, expiresIn = '24h') {
    this.secret = secret || process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    this.expiresIn = expiresIn;
  }

  generateToken(user: Pick<User, 'id' | 'email' | 'role' | 'organizationId'>): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
      ...(user.organizationId && { organizationId: user.organizationId }),
    };

    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, this.secret) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  decodeToken(token: string): JWTPayload | null {
    try {
      return jwtDecode<JWTPayload>(token);
    } catch (error) {
      return null;
    }
  }

  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded) return true;
    
    return Date.now() >= decoded.exp * 1000;
  }

  refreshToken(token: string): string | null {
    const payload = this.verifyToken(token);
    if (!payload) return null;

    // Generate new token with same payload but fresh expiration
    return this.generateToken({
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
    });
  }
}

// Export singleton instance
export const jwtService = new JWTService();