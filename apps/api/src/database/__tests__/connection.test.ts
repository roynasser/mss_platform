import { Pool, Client } from 'pg'
import { getDB, initializeDB } from '../connection'

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn(),
  Client: jest.fn(),
}))

const MockPool = Pool as jest.MockedClass<typeof Pool>
const MockClient = Client as jest.MockedClass<typeof Client>

describe('Database Connection', () => {
  let mockPool: jest.Mocked<Pool>
  let mockClient: jest.Mocked<Client>

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset environment variables
    delete process.env.NODE_ENV
    delete process.env.DB_HOST
    delete process.env.DB_PORT
    delete process.env.DB_USER
    delete process.env.DB_PASSWORD
    delete process.env.DB_NAME
    
    // Mock pool instance
    mockPool = {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
    } as any

    // Mock client instance
    mockClient = {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
    } as any

    MockPool.mockImplementation(() => mockPool)
    MockClient.mockImplementation(() => mockClient)
  })

  afterEach(() => {
    // Clear any module-level state
    jest.resetModules()
  })

  describe('getDB', () => {
    it('creates a new pool when none exists', () => {
      const db = getDB()

      expect(MockPool).toHaveBeenCalledTimes(1)
      expect(db).toBe(mockPool)
    })

    it('reuses existing pool instance', () => {
      const db1 = getDB()
      const db2 = getDB()

      expect(MockPool).toHaveBeenCalledTimes(1)
      expect(db1).toBe(db2)
      expect(db1).toBe(mockPool)
    })

    it('uses environment variables for configuration', () => {
      process.env.DB_HOST = 'test-host'
      process.env.DB_PORT = '5433'
      process.env.DB_USER = 'test-user'
      process.env.DB_PASSWORD = 'test-password'
      process.env.DB_NAME = 'test-database'

      // Clear module cache to reload with new env vars
      jest.resetModules()
      const { getDB } = require('../connection')
      
      getDB()

      expect(MockPool).toHaveBeenCalledWith({
        host: 'test-host',
        port: 5433,
        user: 'test-user',
        password: 'test-password',
        database: 'test-database',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      })
    })

    it('uses default values when environment variables are not set', () => {
      const db = getDB()

      expect(MockPool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'password',
        database: 'mss_platform',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      })
    })

    it('uses test database in test environment', () => {
      process.env.NODE_ENV = 'test'

      // Clear module cache to reload with new env vars
      jest.resetModules()
      const { getDB } = require('../connection')
      
      getDB()

      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          database: 'mss_platform_test',
        })
      )
    })

    it('sets up error handling on pool creation', () => {
      getDB()

      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function))
    })

    it('handles pool error events', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      getDB()

      // Get the error handler that was registered
      const errorHandler = mockPool.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]

      expect(errorHandler).toBeDefined()

      // Simulate an error
      const testError = new Error('Connection failed')
      errorHandler(testError)

      expect(consoleSpy).toHaveBeenCalledWith('Database pool error:', testError)

      consoleSpy.mockRestore()
    })
  })

  describe('initializeDB', () => {
    it('successfully initializes database connection', async () => {
      mockClient.connect.mockResolvedValue(undefined)
      mockClient.query.mockResolvedValue({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] })
      mockClient.end.mockResolvedValue(undefined)

      const result = await initializeDB()

      expect(result).toBe(true)
      expect(MockClient).toHaveBeenCalledTimes(1)
      expect(mockClient.connect).toHaveBeenCalled()
      expect(mockClient.query).toHaveBeenCalledWith('SELECT NOW()')
      expect(mockClient.end).toHaveBeenCalled()
    })

    it('uses environment variables for client configuration', async () => {
      process.env.DB_HOST = 'init-host'
      process.env.DB_PORT = '5434'
      process.env.DB_USER = 'init-user'
      process.env.DB_PASSWORD = 'init-password'
      process.env.DB_NAME = 'init-database'

      mockClient.connect.mockResolvedValue(undefined)
      mockClient.query.mockResolvedValue({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] })
      mockClient.end.mockResolvedValue(undefined)

      // Clear module cache to reload with new env vars
      jest.resetModules()
      const { initializeDB } = require('../connection')

      await initializeDB()

      expect(MockClient).toHaveBeenCalledWith({
        host: 'init-host',
        port: 5434,
        user: 'init-user',
        password: 'init-password',
        database: 'init-database',
      })
    })

    it('handles connection errors gracefully', async () => {
      const connectionError = new Error('Connection refused')
      mockClient.connect.mockRejectedValue(connectionError)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await initializeDB()

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Database initialization error:', connectionError)

      consoleSpy.mockRestore()
    })

    it('handles query errors gracefully', async () => {
      mockClient.connect.mockResolvedValue(undefined)
      
      const queryError = new Error('Query failed')
      mockClient.query.mockRejectedValue(queryError)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await initializeDB()

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Database initialization error:', queryError)

      consoleSpy.mockRestore()
    })

    it('ensures client is closed even when errors occur', async () => {
      const connectionError = new Error('Connection refused')
      mockClient.connect.mockRejectedValue(connectionError)
      mockClient.end.mockResolvedValue(undefined)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      await initializeDB()

      expect(mockClient.end).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('handles client close errors gracefully', async () => {
      mockClient.connect.mockResolvedValue(undefined)
      mockClient.query.mockResolvedValue({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] })
      
      const closeError = new Error('Close failed')
      mockClient.end.mockRejectedValue(closeError)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Should still return true for successful connection and query
      const result = await initializeDB()

      expect(result).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith('Error closing database client:', closeError)

      consoleSpy.mockRestore()
    })

    it('logs successful connection', async () => {
      mockClient.connect.mockResolvedValue(undefined)
      mockClient.query.mockResolvedValue({ 
        rows: [{ now: '2024-01-01T12:00:00.000Z' }], 
        command: 'SELECT', 
        rowCount: 1, 
        oid: 0, 
        fields: [] 
      })
      mockClient.end.mockResolvedValue(undefined)

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await initializeDB()

      expect(consoleSpy).toHaveBeenCalledWith('Database connection successful')

      consoleSpy.mockRestore()
    })
  })

  describe('Pool Configuration', () => {
    it('configures pool with correct settings', () => {
      getDB()

      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        })
      )
    })

    it('uses different database name for test environment', () => {
      process.env.NODE_ENV = 'test'

      // Clear module cache to reload with new env vars
      jest.resetModules()
      const { getDB } = require('../connection')
      
      getDB()

      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          database: 'mss_platform_test',
        })
      )
    })
  })

  describe('Connection Lifecycle', () => {
    it('handles multiple initialization calls', async () => {
      mockClient.connect.mockResolvedValue(undefined)
      mockClient.query.mockResolvedValue({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] })
      mockClient.end.mockResolvedValue(undefined)

      const result1 = await initializeDB()
      const result2 = await initializeDB()

      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(MockClient).toHaveBeenCalledTimes(2)
    })

    it('maintains pool singleton across multiple getDB calls', () => {
      const pool1 = getDB()
      const pool2 = getDB()
      const pool3 = getDB()

      expect(pool1).toBe(pool2)
      expect(pool2).toBe(pool3)
      expect(MockPool).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Scenarios', () => {
    it('handles missing environment variables gracefully', () => {
      // Ensure all DB env vars are undefined
      delete process.env.DB_HOST
      delete process.env.DB_PORT
      delete process.env.DB_USER
      delete process.env.DB_PASSWORD
      delete process.env.DB_NAME

      expect(() => getDB()).not.toThrow()

      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 5432,
          user: 'postgres',
          password: 'password',
          database: 'mss_platform',
        })
      )
    })

    it('handles invalid port number gracefully', () => {
      process.env.DB_PORT = 'invalid-port'

      expect(() => getDB()).not.toThrow()

      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          port: NaN, // parseInt of invalid string returns NaN
        })
      )
    })
  })

  describe('Integration with Real Database Operations', () => {
    it('pool can execute queries', async () => {
      const expectedResult = { 
        rows: [{ id: 1, name: 'test' }], 
        command: 'SELECT', 
        rowCount: 1, 
        oid: 0, 
        fields: [] 
      }
      mockPool.query.mockResolvedValue(expectedResult)

      const pool = getDB()
      const result = await pool.query('SELECT * FROM test WHERE id = $1', [1])

      expect(result).toEqual(expectedResult)
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM test WHERE id = $1', [1])
    })

    it('pool can get connection from pool', async () => {
      const mockConnection = {
        query: jest.fn(),
        release: jest.fn(),
      }
      mockPool.connect.mockResolvedValue(mockConnection as any)

      const pool = getDB()
      const connection = await pool.connect()

      expect(connection).toBe(mockConnection)
      expect(mockPool.connect).toHaveBeenCalled()
    })
  })
})