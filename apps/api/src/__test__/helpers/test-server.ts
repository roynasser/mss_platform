import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { Pool } from 'pg'
import { createClient } from 'redis'

// Test server setup
export const createTestServer = () => {
  const app = express()

  // Basic middleware
  app.use(helmet())
  app.use(cors())
  app.use(compression())
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  return app
}

// Database test helpers
export class TestDatabase {
  private pool: Pool

  constructor() {
    this.pool = new Pool({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'password',
      database: process.env.TEST_DB_NAME || 'mss_platform_test',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }

  async query(text: string, params?: any[]) {
    const client = await this.pool.connect()
    try {
      const result = await client.query(text, params)
      return result
    } finally {
      client.release()
    }
  }

  async createUser(userData: any) {
    const result = await this.query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, role, 
        status, mfa_enabled, org_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        userData.email,
        userData.password_hash,
        userData.first_name,
        userData.last_name,
        userData.role,
        userData.status,
        userData.mfa_enabled,
        userData.org_id,
      ]
    )
    return result.rows[0]
  }

  async createOrganization(orgData: any) {
    const result = await this.query(
      `INSERT INTO organizations (name, type, status, settings) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [orgData.name, orgData.type, orgData.status, JSON.stringify(orgData.settings)]
    )
    return result.rows[0]
  }

  async createSession(sessionData: any) {
    const result = await this.query(
      `INSERT INTO user_sessions (
        user_id, device_info, ip_address, user_agent, 
        location, status, risk_score, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        sessionData.user_id,
        sessionData.device_info,
        sessionData.ip_address,
        sessionData.user_agent,
        sessionData.location,
        sessionData.status,
        sessionData.risk_score,
        sessionData.expires_at,
      ]
    )
    return result.rows[0]
  }

  async cleanup() {
    // Clean up in reverse order of foreign key dependencies
    const tables = [
      'user_sessions',
      'mfa_backup_codes',
      'password_resets',
      'security_events',
      'users',
      'organizations'
    ]

    for (const table of tables) {
      await this.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`)
    }
  }

  async close() {
    await this.pool.end()
  }
}

// Redis test helpers
export class TestRedis {
  private client: any

  constructor() {
    this.client = createClient({
      url: process.env.TEST_REDIS_URL || 'redis://localhost:6379/1',
    })
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect()
    }
    return this.client
  }

  async set(key: string, value: string, expiration?: number) {
    await this.connect()
    if (expiration) {
      return await this.client.setEx(key, expiration, value)
    }
    return await this.client.set(key, value)
  }

  async get(key: string) {
    await this.connect()
    return await this.client.get(key)
  }

  async del(key: string) {
    await this.connect()
    return await this.client.del(key)
  }

  async flushAll() {
    await this.connect()
    return await this.client.flushDb()
  }

  async close() {
    if (this.client.isOpen) {
      await this.client.quit()
    }
  }
}

// Test request helpers
export const createAuthHeaders = (token: string) => {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export const createMockRequest = (overrides = {}) => {
  return {
    ip: '192.168.1.100',
    get: jest.fn((header: string) => {
      switch (header) {
        case 'User-Agent':
          return 'Mozilla/5.0 (Test Browser)'
        case 'Authorization':
          return 'Bearer mock-token'
        default:
          return undefined
      }
    }),
    header: jest.fn(),
    headers: {
      'user-agent': 'Mozilla/5.0 (Test Browser)',
      authorization: 'Bearer mock-token',
    },
    body: {},
    params: {},
    query: {},
    user: null,
    ...overrides,
  }
}

export const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  }
  return res
}

// Integration test helpers
export const waitForAsync = async (fn: () => Promise<any>, timeout = 5000) => {
  const start = Date.now()
  
  while (Date.now() - start < timeout) {
    try {
      await fn()
      return
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  throw new Error(`Async operation timed out after ${timeout}ms`)
}

// Environment setup
export const setupTestEnvironment = () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = 'test-jwt-secret'
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret'
  process.env.MFA_ENCRYPTION_KEY = 'test-mfa-encryption-key'
  
  // Mock external services
  jest.mock('nodemailer', () => ({
    createTransporter: jest.fn(() => ({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    })),
  }))
}