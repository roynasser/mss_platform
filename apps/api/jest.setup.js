import dotenv from 'dotenv'
import { Pool } from 'pg'
import { createClient } from 'redis'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Mock database and Redis connections for testing
let mockDb
let mockRedis

// Setup test database connection
beforeAll(async () => {
  // Create test database pool
  mockDb = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'password',
    database: process.env.TEST_DB_NAME || 'mss_platform_test',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })

  // Create test Redis client
  mockRedis = createClient({
    url: process.env.TEST_REDIS_URL || 'redis://localhost:6379/1',
  })

  await mockRedis.connect()
})

// Clean up after each test
afterEach(async () => {
  // Clear Redis test data
  if (mockRedis && mockRedis.isOpen) {
    await mockRedis.flushDb()
  }
  
  // Clean up database tables (in reverse order due to foreign keys)
  if (mockDb) {
    try {
      await mockDb.query('TRUNCATE TABLE user_sessions, mfa_backup_codes, password_resets, security_events, users, organizations RESTART IDENTITY CASCADE')
    } catch (error) {
      console.warn('Database cleanup failed:', error.message)
    }
  }
})

// Cleanup connections
afterAll(async () => {
  if (mockRedis && mockRedis.isOpen) {
    await mockRedis.quit()
  }
  if (mockDb) {
    await mockDb.end()
  }
})

// Mock database and Redis modules
jest.mock('@/database/connection', () => ({
  getDB: () => mockDb || {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    end: jest.fn(),
  },
  initializeDB: jest.fn().mockResolvedValue(true),
}))

jest.mock('@/database/redis', () => ({
  getRedis: () => mockRedis || {
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    flushDb: jest.fn(),
    quit: jest.fn(),
    isOpen: true,
  },
  initializeRedis: jest.fn().mockResolvedValue(true),
}))

// Mock email service
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  })),
}))

// Mock external services
jest.mock('@/services/jwt.service', () => ({
  jwtService: {
    generateTokenPair: jest.fn(),
    verifyToken: jest.fn(),
    refreshAccessToken: jest.fn(),
    revokeSession: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    getUserSessions: jest.fn(),
  },
}))

// Global test utilities
global.createTestUser = async (overrides = {}) => {
  const defaultUser = {
    email: 'test@example.com',
    password_hash: '$2a$10$test.hash.here',
    first_name: 'Test',
    last_name: 'User',
    role: 'customer',
    status: 'active',
    mfa_enabled: false,
    org_id: 1,
    ...overrides,
  }

  const result = await mockDb.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, status, mfa_enabled, org_id) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      defaultUser.email,
      defaultUser.password_hash,
      defaultUser.first_name,
      defaultUser.last_name,
      defaultUser.role,
      defaultUser.status,
      defaultUser.mfa_enabled,
      defaultUser.org_id,
    ]
  )

  return result.rows[0]
}

global.createTestOrganization = async (overrides = {}) => {
  const defaultOrg = {
    name: 'Test Organization',
    type: 'customer',
    status: 'active',
    ...overrides,
  }

  const result = await mockDb.query(
    `INSERT INTO organizations (name, type, status) 
     VALUES ($1, $2, $3) RETURNING *`,
    [defaultOrg.name, defaultOrg.type, defaultOrg.status]
  )

  return result.rows[0]
}

// Suppress console logs during tests unless in verbose mode
if (!process.env.VERBOSE_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}

// Set test environment
process.env.NODE_ENV = 'test'