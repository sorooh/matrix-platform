/**
 * Test Setup
 * Global test configuration
 */

import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Set test environment
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/matrix_test'
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379'

// Mock console methods in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

// Global test timeout
jest.setTimeout(30000)

// Cleanup after all tests
afterAll(async () => {
  // Close database connections
  // Close Redis connections
})

