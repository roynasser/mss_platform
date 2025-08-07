import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { JwtService } from '../jwt.service'
import { authFixtures, userFixtures, organizationFixtures } from '@/__test__/fixtures'

// Mock dependencies
jest.mock('@/database/connection')
jest.mock('@/database/redis')
jest.mock('crypto')

const mockDb = {
  query: jest.fn(),
}

const mockRedis = {
  setEx: jest.fn(),
  exists: jest.fn(),
  get: jest.fn(),
}

require('@/database/connection').getDB = jest.fn(() => mockDb)
require('@/database/redis').getRedis = jest.fn(() => mockRedis)

const mockCrypto = crypto as jest.Mocked<typeof crypto>

describe('JwtService', () => {
  let jwtService: JwtService

  beforeAll(() => {
    // Set up environment variables for JWT secrets
    process.env.JWT_SECRET = 'test-jwt-secret'
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock crypto.randomUUID to return predictable values
    const mockRandomUUID = jest.fn()
      .mockReturnValueOnce('session-uuid-1')
      .mockReturnValueOnce('session-uuid-2')
    
    jest.spyOn(crypto, 'randomUUID').mockImplementation(mockRandomUUID)
    
    // Mock hash functions
    const mockCreateHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mocked-hash'),
    }
    jest.spyOn(crypto, 'createHash').mockReturnValue(mockCreateHash as any)
    
    // Mock random bytes
    jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('random-bytes'))
    
    jwtService = new JwtService()
  })

  afterAll(() => {
    delete process.env.JWT_SECRET
    delete process.env.JWT_REFRESH_SECRET
  })

  describe('Constructor', () => {
    it('initializes successfully with JWT secrets', () => {
      expect(() => new JwtService()).not.toThrow()
    })

    it('throws error when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET
      
      expect(() => new JwtService()).toThrow('JWT secrets must be configured')
      
      process.env.JWT_SECRET = 'test-jwt-secret' // Restore for other tests
    })

    it('throws error when JWT_REFRESH_SECRET is missing', () => {
      delete process.env.JWT_REFRESH_SECRET
      
      expect(() => new JwtService()).toThrow('JWT secrets must be configured')
      
      process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret' // Restore for other tests
    })
  })

  describe('generateTokenPair', () => {
    const mockAuthPayload = authFixtures.validTokenPayload
    const mockSessionInfo = {
      ipAddress: '192.168.1.100',
      userAgent: 'Test Browser',
      deviceInfo: { os: 'Test OS', browser: 'Test Browser' },
      location: { city: 'Test City', country: 'US' },
    }

    it('generates access and refresh tokens', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 })
      mockRedis.setEx.mockResolvedValue('OK')

      const result = await jwtService.generateTokenPair(mockAuthPayload, mockSessionInfo)

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(result).toHaveProperty('expiresAt')
      expect(result.expiresAt).toBeInstanceOf(Date)
    })

    it('stores session in database', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 })
      mockRedis.setEx.mockResolvedValue('OK')

      await jwtService.generateTokenPair(mockAuthPayload, mockSessionInfo)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_sessions'),
        expect.arrayContaining([
          mockAuthPayload.userId,
          'mocked-hash', // Hashed access token
          'mocked-hash', // Hashed refresh token
          mockSessionInfo.deviceInfo,
          mockSessionInfo.ipAddress,
          mockSessionInfo.userAgent,
          mockSessionInfo.location,
          expect.any(Date), // expires_at
        ])
      )
    })

    it('stores access token in Redis', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 })
      mockRedis.setEx.mockResolvedValue('OK')

      await jwtService.generateTokenPair(mockAuthPayload, mockSessionInfo)

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'access_token:mocked-hash',
        15 * 60, // 15 minutes in seconds
        expect.stringContaining(mockAuthPayload.userId)
      )
    })

    it('handles missing optional session info', async () => {
      const minimalSessionInfo = { ipAddress: '192.168.1.100' }
      
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 })
      mockRedis.setEx.mockResolvedValue('OK')

      await jwtService.generateTokenPair(mockAuthPayload, minimalSessionInfo)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.any(String), // userId
          expect.any(String), // hashed access token
          expect.any(String), // hashed refresh token
          {}, // empty deviceInfo
          '192.168.1.100',
          undefined, // userAgent
          {}, // empty location
          expect.any(Date),
        ])
      )
    })

    it('signs tokens with correct payload and options', async () => {
      const jwtSpy = jest.spyOn(jwt, 'sign')
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 })
      mockRedis.setEx.mockResolvedValue('OK')

      await jwtService.generateTokenPair(mockAuthPayload, mockSessionInfo)

      // Check access token signing
      expect(jwtSpy).toHaveBeenCalledWith(
        mockAuthPayload,
        'test-jwt-secret',
        {
          expiresIn: '15m',
          issuer: 'mss-platform',
          audience: 'mss-users',
        }
      )

      // Check refresh token signing
      expect(jwtSpy).toHaveBeenCalledWith(
        {
          userId: mockAuthPayload.userId,
          sessionId: 'session-uuid-1',
        },
        'test-jwt-refresh-secret',
        {
          expiresIn: '7d',
          issuer: 'mss-platform',
          audience: 'mss-users',
        }
      )
    })
  })

  describe('verifyAccessToken', () => {
    const mockToken = 'valid-access-token'

    it('successfully verifies valid token', async () => {
      const mockPayload = authFixtures.validTokenPayload
      jest.spyOn(jwt, 'verify').mockReturnValue(mockPayload as any)
      mockRedis.exists.mockResolvedValue(0) // Not blacklisted

      const result = await jwtService.verifyAccessToken(mockToken)

      expect(result).toEqual(mockPayload)
      expect(jwt.verify).toHaveBeenCalledWith(
        mockToken,
        'test-jwt-secret',
        {
          issuer: 'mss-platform',
          audience: 'mss-users',
        }
      )
    })

    it('returns null for blacklisted token', async () => {
      const mockPayload = authFixtures.validTokenPayload
      jest.spyOn(jwt, 'verify').mockReturnValue(mockPayload as any)
      mockRedis.exists.mockResolvedValue(1) // Blacklisted

      const result = await jwtService.verifyAccessToken(mockToken)

      expect(result).toBeNull()
      expect(mockRedis.exists).toHaveBeenCalledWith('blacklist:mocked-hash')
    })

    it('returns null for invalid token', async () => {
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('Invalid token')
      })
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await jwtService.verifyAccessToken('invalid-token')

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Access token verification failed:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('returns null for expired token', async () => {
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        const error = new Error('Token expired')
        error.name = 'TokenExpiredError'
        throw error
      })
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await jwtService.verifyAccessToken('expired-token')

      expect(result).toBeNull()
      consoleSpy.mockRestore()
    })
  })

  describe('refreshAccessToken', () => {
    const mockRefreshToken = 'valid-refresh-token'
    const mockSessionInfo = {
      ipAddress: '192.168.1.100',
      userAgent: 'Test Browser',
    }

    it('successfully refreshes token with valid refresh token', async () => {
      const mockRefreshPayload = { userId: 'user-id', sessionId: 'session-id' }
      const mockSessionData = {
        user_id: 'user-id',
        email: 'test@example.com',
        role: 'customer',
        org_id: 'org-id',
        org_name: 'Test Org',
        org_type: 'customer',
      }

      jest.spyOn(jwt, 'verify').mockReturnValue(mockRefreshPayload as any)
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockSessionData] }) // Session lookup
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // New session insert
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Revoke old session
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update activity
      
      mockRedis.setEx.mockResolvedValue('OK')

      const result = await jwtService.refreshAccessToken(mockRefreshToken, mockSessionInfo)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(result).toHaveProperty('expiresAt')
    })

    it('returns null for invalid refresh token', async () => {
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('Invalid token')
      })
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await jwtService.refreshAccessToken('invalid-token', mockSessionInfo)

      expect(result).toBeNull()
      consoleSpy.mockRestore()
    })

    it('returns null when no active session found', async () => {
      const mockRefreshPayload = { userId: 'user-id', sessionId: 'session-id' }
      
      jest.spyOn(jwt, 'verify').mockReturnValue(mockRefreshPayload as any)
      mockDb.query.mockResolvedValueOnce({ rows: [] }) // No session found

      const result = await jwtService.refreshAccessToken(mockRefreshToken, mockSessionInfo)

      expect(result).toBeNull()
    })

    it('revokes old session after successful refresh', async () => {
      const mockRefreshPayload = { userId: 'user-id', sessionId: 'session-id' }
      const mockSessionData = {
        user_id: 'user-id',
        email: 'test@example.com',
        role: 'customer',
        org_id: 'org-id',
        org_name: 'Test Org',
        org_type: 'customer',
      }

      jest.spyOn(jwt, 'verify').mockReturnValue(mockRefreshPayload as any)
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockSessionData] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // New session
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Revoke old
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update activity
      
      mockRedis.setEx.mockResolvedValue('OK')

      await jwtService.refreshAccessToken(mockRefreshToken, mockSessionInfo)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions'),
        expect.arrayContaining(['token_refresh', 'mocked-hash'])
      )
    })
  })

  describe('revokeSession', () => {
    const mockSessionId = 'session-123'

    it('successfully revokes session', async () => {
      const mockSession = {
        session_token: 'hashed-access-token',
        refresh_token: 'hashed-refresh-token',
      }

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockSession] }) // Get session
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update session

      mockRedis.setEx.mockResolvedValue('OK')

      const result = await jwtService.revokeSession(mockSessionId, 'manual_logout')

      expect(result).toBe(true)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions'),
        ['manual_logout', mockSessionId]
      )
    })

    it('returns false when session not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] }) // No session found

      const result = await jwtService.revokeSession('non-existent-session')

      expect(result).toBe(false)
    })

    it('blacklists tokens in Redis', async () => {
      const mockSession = {
        session_token: 'hashed-access-token',
        refresh_token: 'hashed-refresh-token',
      }

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockSession] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })

      mockRedis.setEx.mockResolvedValue('OK')

      await jwtService.revokeSession(mockSessionId)

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `blacklist:${mockSession.session_token}`,
        15 * 60,
        'revoked'
      )
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `blacklist:${mockSession.refresh_token}`,
        7 * 24 * 60 * 60,
        'revoked'
      )
    })

    it('handles database errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await jwtService.revokeSession(mockSessionId)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Session revocation failed:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('revokeAllUserSessions', () => {
    const mockUserId = 'user-123'

    it('successfully revokes all user sessions', async () => {
      const mockSessions = [
        { id: 'session-1', session_token: 'token-1', refresh_token: 'refresh-1' },
        { id: 'session-2', session_token: 'token-2', refresh_token: 'refresh-2' },
      ]

      mockDb.query
        .mockResolvedValueOnce({ rows: mockSessions }) // Get sessions
        .mockResolvedValueOnce({ rows: [], rowCount: 2 }) // Update sessions

      mockRedis.setEx.mockResolvedValue('OK')

      const result = await jwtService.revokeAllUserSessions(mockUserId, 'logout_all')

      expect(result).toBe(true)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions'),
        ['logout_all', mockUserId]
      )
    })

    it('returns true when no active sessions', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] }) // No sessions

      const result = await jwtService.revokeAllUserSessions(mockUserId)

      expect(result).toBe(true)
    })

    it('blacklists all tokens in Redis', async () => {
      const mockSessions = [
        { id: 'session-1', session_token: 'token-1', refresh_token: 'refresh-1' },
        { id: 'session-2', session_token: 'token-2', refresh_token: 'refresh-2' },
      ]

      mockDb.query
        .mockResolvedValueOnce({ rows: mockSessions })
        .mockResolvedValueOnce({ rows: [], rowCount: 2 })

      mockRedis.setEx.mockResolvedValue('OK')

      await jwtService.revokeAllUserSessions(mockUserId)

      // Should blacklist all access tokens (15 minutes)
      expect(mockRedis.setEx).toHaveBeenCalledWith('blacklist:token-1', 15 * 60, 'revoked')
      expect(mockRedis.setEx).toHaveBeenCalledWith('blacklist:token-2', 15 * 60, 'revoked')

      // Should blacklist all refresh tokens (7 days)
      expect(mockRedis.setEx).toHaveBeenCalledWith('blacklist:refresh-1', 7 * 24 * 60 * 60, 'revoked')
      expect(mockRedis.setEx).toHaveBeenCalledWith('blacklist:refresh-2', 7 * 24 * 60 * 60, 'revoked')
    })
  })

  describe('getUserSessions', () => {
    const mockUserId = 'user-123'

    it('returns user sessions successfully', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          device_info: { browser: 'Chrome' },
          ip_address: '192.168.1.100',
          user_agent: 'Chrome/120',
          location: { city: 'SF' },
          created_at: new Date('2024-01-01'),
          expires_at: new Date('2024-01-08'),
          last_activity_at: new Date('2024-01-02'),
          status: 'active',
        },
      ]

      mockDb.query.mockResolvedValue({ rows: mockSessions })

      const result = await jwtService.getUserSessions(mockUserId)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'session-1',
        deviceInfo: { browser: 'Chrome' },
        ipAddress: '192.168.1.100',
        userAgent: 'Chrome/120',
        location: { city: 'SF' },
        createdAt: new Date('2024-01-01'),
        expiresAt: new Date('2024-01-08'),
        lastActivityAt: new Date('2024-01-02'),
        status: 'active',
      })
    })

    it('returns empty array when no sessions found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] })

      const result = await jwtService.getUserSessions(mockUserId)

      expect(result).toEqual([])
    })

    it('handles database errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await jwtService.getUserSessions(mockUserId)

      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get user sessions:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('updateSessionActivity', () => {
    const mockSessionId = 'session-123'

    it('updates session activity successfully', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 })

      await jwtService.updateSessionActivity(mockSessionId)

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE user_sessions SET last_activity_at = NOW() WHERE id = $1',
        [mockSessionId]
      )
    })

    it('handles database errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      await jwtService.updateSessionActivity(mockSessionId)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update session activity:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('cleanupExpiredSessions', () => {
    it('cleans up expired sessions successfully', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 5 })

      const result = await jwtService.cleanupExpiredSessions()

      expect(result).toBe(5)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions'),
        []
      )
    })

    it('returns 0 when no sessions cleaned up', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 0 })

      const result = await jwtService.cleanupExpiredSessions()

      expect(result).toBe(0)
    })

    it('handles null rowCount', async () => {
      mockDb.query.mockResolvedValue({ rowCount: null })

      const result = await jwtService.cleanupExpiredSessions()

      expect(result).toBe(0)
    })

    it('handles database errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await jwtService.cleanupExpiredSessions()

      expect(result).toBe(0)
      consoleSpy.mockRestore()
    })
  })

  describe('generateSecureToken', () => {
    it('generates token with default length', () => {
      jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('a'.repeat(32)))

      const token = jwtService.generateSecureToken()

      expect(crypto.randomBytes).toHaveBeenCalledWith(32)
      expect(token).toBe('a'.repeat(64)) // 32 bytes = 64 hex chars
    })

    it('generates token with custom length', () => {
      jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('b'.repeat(16)))

      const token = jwtService.generateSecureToken(16)

      expect(crypto.randomBytes).toHaveBeenCalledWith(16)
      expect(token).toBe('b'.repeat(32)) // 16 bytes = 32 hex chars
    })
  })

  describe('Token Hashing', () => {
    it('hashes tokens consistently', async () => {
      const mockAuthPayload = authFixtures.validTokenPayload
      const mockSessionInfo = { ipAddress: '192.168.1.100' }

      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 })
      mockRedis.setEx.mockResolvedValue('OK')

      await jwtService.generateTokenPair(mockAuthPayload, mockSessionInfo)

      // Hash function should be called for both access and refresh tokens
      expect(crypto.createHash).toHaveBeenCalledTimes(4) // 2 for storage, 2 for Redis keys
    })
  })

  describe('Error Scenarios', () => {
    it('handles Redis connection errors during token generation', async () => {
      const mockAuthPayload = authFixtures.validTokenPayload
      const mockSessionInfo = { ipAddress: '192.168.1.100' }

      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 })
      mockRedis.setEx.mockRejectedValue(new Error('Redis connection failed'))

      // Should not throw error, but may log it
      await expect(
        jwtService.generateTokenPair(mockAuthPayload, mockSessionInfo)
      ).resolves.toBeDefined()
    })

    it('handles database connection errors during token generation', async () => {
      const mockAuthPayload = authFixtures.validTokenPayload
      const mockSessionInfo = { ipAddress: '192.168.1.100' }

      mockDb.query.mockRejectedValue(new Error('Database connection failed'))

      await expect(
        jwtService.generateTokenPair(mockAuthPayload, mockSessionInfo)
      ).rejects.toThrow('Database connection failed')
    })
  })
})