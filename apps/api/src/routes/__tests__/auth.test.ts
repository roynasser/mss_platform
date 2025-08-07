import request from 'supertest'
import express from 'express'
import bcrypt from 'bcryptjs'
import authRouter from '../auth'
import { 
  createTestServer, 
  TestDatabase, 
  TestRedis, 
  createMockRequest, 
  createMockResponse 
} from '@/__test__/helpers/test-server'
import { 
  userFixtures, 
  organizationFixtures, 
  authFixtures, 
  createLoginRequest, 
  createMfaRequest, 
  hashPassword 
} from '@/__test__/fixtures'

// Mock the database and Redis connections
jest.mock('@/database/connection')
jest.mock('@/database/redis')

// Mock services
jest.mock('@/services/jwt.service')
jest.mock('@/services/mfa.service')
jest.mock('@/services/password.service')
jest.mock('@/services/session.service')

const mockJwtService = require('@/services/jwt.service').jwtService
const mockMfaService = require('@/services/mfa.service').mfaService
const mockPasswordService = require('@/services/password.service').passwordService
const mockSessionService = require('@/services/session.service').sessionService

describe('Auth Routes', () => {
  let app: express.Application
  let testDb: TestDatabase
  let testRedis: TestRedis
  let mockDb: any
  let mockRedis: any

  beforeAll(async () => {
    app = createTestServer()
    app.use('/auth', authRouter)
    
    testDb = new TestDatabase()
    testRedis = new TestRedis()
    
    // Mock database and Redis connections
    mockDb = {
      query: jest.fn(),
    }
    mockRedis = {
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
    }

    require('@/database/connection').getDB = jest.fn(() => mockDb)
    require('@/database/redis').getRedis = jest.fn(() => mockRedis)
  })

  beforeEach(async () => {
    jest.clearAllMocks()
    
    // Reset mock implementations
    mockDb.query.mockReset()
    mockRedis.get.mockReset()
    mockRedis.setEx.mockReset()
    mockRedis.del.mockReset()
  })

  afterAll(async () => {
    await testDb.close()
    await testRedis.close()
  })

  describe('POST /auth/login', () => {
    it('successfully logs in a valid user', async () => {
      const loginData = createLoginRequest()
      const user = userFixtures.customer
      const org = organizationFixtures.customerOrg

      // Mock database responses
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            ...user,
            org_name: org.name,
            org_type: org.type,
            org_status: org.status,
            password_hash: await hashPassword(loginData.password),
          }],
        })

      // Mock service responses
      mockPasswordService.resetFailedAttempts.mockResolvedValue(true)
      mockSessionService.createSession.mockResolvedValue({
        success: true,
        requiresMfa: false,
        riskAssessment: { score: 25, level: 'low' },
      })
      mockSessionService.logSecurityEvent.mockResolvedValue(true)
      mockSessionService.getDeviceFingerprint.mockReturnValue('device-fingerprint')
      mockSessionService.getLocationData.mockResolvedValue({ city: 'San Francisco', country: 'US' })
      mockJwtService.generateTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      })

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
          },
        },
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [loginData.email]
      )
      expect(mockJwtService.generateTokenPair).toHaveBeenCalled()
    })

    it('requires MFA when user has MFA enabled', async () => {
      const loginData = createLoginRequest({ email: 'mfa@test.com' })
      const user = { ...userFixtures.mfaUser, password_hash: await hashPassword(loginData.password) }
      const org = organizationFixtures.customerOrg

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          ...user,
          org_name: org.name,
          org_type: org.type,
          org_status: org.status,
        }],
      })

      mockSessionService.createSession.mockResolvedValue({
        success: true,
        requiresMfa: true,
        riskAssessment: { score: 45, level: 'medium' },
      })

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        requiresMfa: true,
        pendingSessionId: expect.any(String),
      })

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        expect.stringContaining('pending_mfa'),
        300,
        expect.any(String)
      )
    })

    it('rejects invalid credentials', async () => {
      const loginData = createLoginRequest({ password: 'wrongpassword' })

      mockDb.query.mockResolvedValueOnce({ rows: [] })

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid credentials',
      })

      expect(mockSessionService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'login_failed',
          userId: 'unknown',
        })
      )
    })

    it('rejects inactive user accounts', async () => {
      const loginData = createLoginRequest()
      const user = { ...userFixtures.inactiveUser, password_hash: await hashPassword(loginData.password) }
      const org = organizationFixtures.customerOrg

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          ...user,
          org_name: org.name,
          org_type: org.type,
          org_status: org.status,
        }],
      })

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Account is not active',
      })
    })

    it('rejects users from inactive organizations', async () => {
      const loginData = createLoginRequest()
      const user = { ...userFixtures.customer, password_hash: await hashPassword(loginData.password) }
      const org = { ...organizationFixtures.inactiveOrg }

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          ...user,
          org_name: org.name,
          org_type: org.type,
          org_status: org.status,
        }],
      })

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Organization is not active',
      })
    })

    it('handles locked accounts', async () => {
      const loginData = createLoginRequest()
      const user = { ...userFixtures.lockedUser, password_hash: await hashPassword(loginData.password) }
      const org = organizationFixtures.customerOrg

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          ...user,
          org_name: org.name,
          org_type: org.type,
          org_status: org.status,
        }],
      })

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(423)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Account is temporarily locked',
        lockedUntil: expect.any(String),
      })
    })

    it('handles failed login attempts', async () => {
      const loginData = createLoginRequest({ password: 'wrongpassword' })
      const user = { ...userFixtures.customer, password_hash: await hashPassword('correctpassword') }
      const org = organizationFixtures.customerOrg

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          ...user,
          org_name: org.name,
          org_type: org.type,
          org_status: org.status,
        }],
      })

      mockPasswordService.handleFailedLogin.mockResolvedValue({
        isLocked: false,
        attemptsRemaining: 3,
      })

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid credentials',
        attemptsRemaining: 3,
      })

      expect(mockPasswordService.handleFailedLogin).toHaveBeenCalledWith(user.id)
    })

    it('validates input data', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: '',
        })
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid input',
      })
    })
  })

  describe('POST /auth/mfa/complete', () => {
    it('completes MFA authentication successfully', async () => {
      const mfaRequest = createMfaRequest()
      const user = userFixtures.mfaUser
      const org = organizationFixtures.customerOrg

      const pendingSession = {
        userId: user.id,
        email: user.email,
        sessionContext: {
          ipAddress: '192.168.1.100',
          userAgent: 'Test Browser',
        },
        riskAssessment: { score: 45, level: 'medium' },
      }

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(pendingSession))
      mockMfaService.verifyMfa.mockResolvedValue({
        isValid: true,
        method: 'totp',
        remainingBackupCodes: 5,
      })

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          ...user,
          org_name: org.name,
          org_type: org.type,
        }],
      })

      mockPasswordService.resetFailedAttempts.mockResolvedValue(true)
      mockJwtService.generateTokenPair.mockResolvedValue({
        accessToken: 'access-token-after-mfa',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      })

      const response = await request(app)
        .post('/auth/mfa/complete')
        .send(mfaRequest)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
          },
          tokens: {
            accessToken: 'access-token-after-mfa',
          },
          mfaUsed: 'totp',
          remainingBackupCodes: 5,
        },
      })

      expect(mockMfaService.verifyMfa).toHaveBeenCalledWith(user.id, mfaRequest.code)
      expect(mockRedis.del).toHaveBeenCalledWith(mfaRequest.pendingSessionId)
    })

    it('rejects invalid MFA codes', async () => {
      const mfaRequest = createMfaRequest({ code: '000000' })
      const pendingSession = { userId: 'user-id', email: 'test@example.com' }

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(pendingSession))
      mockMfaService.verifyMfa.mockResolvedValue({ isValid: false })

      const response = await request(app)
        .post('/auth/mfa/complete')
        .send(mfaRequest)
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid MFA code',
      })
    })

    it('rejects expired MFA sessions', async () => {
      const mfaRequest = createMfaRequest()
      
      mockRedis.get.mockResolvedValueOnce(null)

      const response = await request(app)
        .post('/auth/mfa/complete')
        .send(mfaRequest)
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid or expired MFA session',
      })
    })
  })

  describe('POST /auth/refresh', () => {
    it('refreshes access token successfully', async () => {
      const refreshToken = 'valid-refresh-token'
      const user = userFixtures.customer

      mockJwtService.refreshAccessToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      })

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      })

      expect(mockJwtService.refreshAccessToken).toHaveBeenCalledWith(
        refreshToken,
        expect.objectContaining({
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
        })
      )
    })

    it('rejects invalid refresh tokens', async () => {
      const refreshToken = 'invalid-refresh-token'

      mockJwtService.refreshAccessToken.mockResolvedValue(null)

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid or expired refresh token',
      })
    })
  })

  describe('POST /auth/logout', () => {
    it('logs out authenticated user', async () => {
      const mockUser = { userId: 'user-id' }
      const mockRequest = createMockRequest({ user: mockUser })
      const mockResponse = createMockResponse()

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'session-id' }],
      })
      mockJwtService.revokeSession.mockResolvedValue(true)
      mockSessionService.logSecurityEvent.mockResolvedValue(true)

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Logged out successfully',
      })
    })
  })

  describe('GET /auth/me', () => {
    it('returns current user information', async () => {
      const mockUser = { userId: 'user-id' }
      const user = userFixtures.customer
      const org = organizationFixtures.customerOrg

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          ...user,
          org_id: org.id,
          org_name: org.name,
          org_type: org.type,
        }],
      })

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          organization: {
            id: org.id,
            name: org.name,
            type: org.type,
          },
        },
      })
    })

    it('requires authentication', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401)
    })
  })

  describe('MFA Management', () => {
    describe('POST /auth/mfa/setup', () => {
      it('generates MFA setup data', async () => {
        const mockUser = { userId: 'user-id', email: 'test@example.com' }
        
        mockMfaService.generateMfaSetup.mockResolvedValue({
          qrCodeUrl: 'data:image/png;base64,qrcode',
          manualEntryKey: 'MFASECRET',
          backupCodes: ['code1', 'code2'],
        })

        const response = await request(app)
          .post('/auth/mfa/setup')
          .set('Authorization', 'Bearer valid-token')
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: {
            qrCode: 'data:image/png;base64,qrcode',
            manualEntryKey: 'MFASECRET',
            backupCodes: ['code1', 'code2'],
          },
        })
      })
    })

    describe('POST /auth/mfa/enable', () => {
      it('enables MFA with valid TOTP code', async () => {
        const mockUser = { userId: 'user-id' }
        
        mockMfaService.enableMfa.mockResolvedValue(true)

        const response = await request(app)
          .post('/auth/mfa/enable')
          .set('Authorization', 'Bearer valid-token')
          .send({ totpCode: '123456' })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          message: 'MFA enabled successfully',
        })

        expect(mockMfaService.enableMfa).toHaveBeenCalledWith('user-id', '123456')
      })

      it('rejects invalid TOTP codes', async () => {
        const mockUser = { userId: 'user-id' }
        
        mockMfaService.enableMfa.mockResolvedValue(false)

        const response = await request(app)
          .post('/auth/mfa/enable')
          .set('Authorization', 'Bearer valid-token')
          .send({ totpCode: '000000' })
          .expect(400)

        expect(response.body).toMatchObject({
          success: false,
          error: 'Invalid TOTP code',
        })
      })
    })
  })

  describe('Password Management', () => {
    describe('POST /auth/password/change', () => {
      it('changes password successfully', async () => {
        const mockUser = { userId: 'user-id' }
        
        mockPasswordService.changePassword.mockResolvedValue({
          success: true,
        })

        const response = await request(app)
          .post('/auth/password/change')
          .set('Authorization', 'Bearer valid-token')
          .send({
            currentPassword: 'oldpassword',
            newPassword: 'newpassword123',
          })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          message: 'Password changed successfully',
        })
      })
    })

    describe('POST /auth/password/reset', () => {
      it('initiates password reset', async () => {
        mockPasswordService.generateResetToken.mockResolvedValue({
          token: 'reset-token',
          expires: new Date(),
        })

        const response = await request(app)
          .post('/auth/password/reset')
          .send({ email: 'test@example.com' })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          message: 'If the email exists, a reset link has been sent',
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('handles database connection errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Database connection failed'))

      const response = await request(app)
        .post('/auth/login')
        .send(createLoginRequest())
        .expect(500)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Login failed',
      })
    })

    it('handles Redis connection errors', async () => {
      mockRedis.setEx.mockRejectedValue(new Error('Redis connection failed'))

      const loginData = createLoginRequest({ email: 'mfa@test.com' })
      const user = { ...userFixtures.mfaUser, password_hash: await hashPassword(loginData.password) }
      const org = organizationFixtures.customerOrg

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          ...user,
          org_name: org.name,
          org_type: org.type,
          org_status: org.status,
        }],
      })

      mockSessionService.createSession.mockResolvedValue({
        success: true,
        requiresMfa: true,
        riskAssessment: { score: 45, level: 'medium' },
      })

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(500)
    })
  })

  describe('Rate Limiting', () => {
    it('applies rate limiting to sensitive endpoints', async () => {
      // This would require setting up rate limiting middleware in tests
      // Implementation depends on your rate limiting strategy
    })
  })

  describe('Input Validation', () => {
    it('validates email format in login', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'not-an-email',
          password: 'password123',
        })
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid input',
      })
    })

    it('validates password requirements', async () => {
      const response = await request(app)
        .post('/auth/password/change')
        .set('Authorization', 'Bearer valid-token')
        .send({
          currentPassword: 'old',
          newPassword: 'short',
        })
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid input',
      })
    })

    it('validates MFA code format', async () => {
      const response = await request(app)
        .post('/auth/mfa/enable')
        .set('Authorization', 'Bearer valid-token')
        .send({
          totpCode: '12345', // Too short
        })
        .expect(400)
    })
  })
})