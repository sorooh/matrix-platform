import Fastify, { FastifyInstance } from 'fastify'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import Redis from 'ioredis-mock'
import { apiVersioning } from '../api/versioning'
import { registerSecurity } from '../api/security'
import { registerGraphQL } from '../api/graphql'

// Test database instance
let mongod: MongoMemoryServer | null = null
let redis: any = null

// Create test application
export async function createTestApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false // Disable logging in tests
  })

  // Setup test database
  await setupTestDatabase()

  // Setup test Redis
  redis = new Redis()

  // Register API versioning middleware
  app.addHook('preHandler', apiVersioning)

  // Register security and rate limiting
  await registerSecurity(app, redis)

  // Register GraphQL
  await registerGraphQL(app)

  // Register test routes
  await registerTestRoutes(app)

  // Error handler
  app.setErrorHandler(async (error, request, reply) => {
    console.error('Test error:', error)
    
    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation
      })
    }

    if (error.name === 'CastError') {
      return reply.status(400).send({
        error: 'Invalid ID Format',
        message: 'The provided ID is not valid'
      })
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    })
  })

  await app.ready()
  return app
}

// Setup test database
async function setupTestDatabase() {
  if (!mongod) {
    mongod = await MongoMemoryServer.create()
  }

  const uri = mongod.getUri()
  
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }

  await mongoose.connect(uri)
}

// Register test routes
async function registerTestRoutes(app: FastifyInstance) {
  // Health check
  app.get('/api/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: 'test'
    }
  })

  // Projects routes
  app.get('/api/:version/projects', {
    preHandler: [authenticateUser]
  }, async (request) => {
    const user = (request as any).user
    const { Project } = await import('../models')
    
    const projects = await Project.find({ userId: user.id })
    
    return {
      apiVersion: (request as any).apiVersion,
      data: projects,
      meta: {
        total: projects.length,
        timestamp: new Date().toISOString()
      }
    }
  })

  app.get('/api/:version/projects/:id', {
    preHandler: [authenticateUser]
  }, async (request, reply) => {
    const user = (request as any).user
    const { id } = request.params as { id: string }
    const { Project } = await import('../models')
    
    const project = await Project.findById(id)
    
    if (!project || project.userId !== user.id) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Project not found or access denied'
      })
    }
    
    return {
      apiVersion: (request as any).apiVersion,
      data: project,
      meta: {
        timestamp: new Date().toISOString()
      }
    }
  })

  app.post('/api/:version/projects', {
    preHandler: [authenticateUser],
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          framework: { type: 'string' },
          repository: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              branch: { type: 'string' },
              provider: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const user = (request as any).user
    const projectData = request.body as any
    const { Project } = await import('../models')
    
    const project = new Project({
      ...projectData,
      userId: user.id,
      status: 'active'
    })
    
    await project.save()
    
    return reply.status(201).send({
      apiVersion: (request as any).apiVersion,
      data: project,
      meta: {
        timestamp: new Date().toISOString()
      }
    })
  })

  app.put('/api/:version/projects/:id', {
    preHandler: [authenticateUser]
  }, async (request, reply) => {
    const user = (request as any).user
    const { id } = request.params as { id: string }
    const updateData = request.body as any
    const { Project } = await import('../models')
    
    const project = await Project.findById(id)
    
    if (!project || project.userId !== user.id) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Project not found or access denied'
      })
    }
    
    Object.assign(project, updateData)
    await project.save()
    
    return {
      apiVersion: (request as any).apiVersion,
      data: project,
      meta: {
        timestamp: new Date().toISOString()
      }
    }
  })

  app.delete('/api/:version/projects/:id', {
    preHandler: [authenticateUser]
  }, async (request, reply) => {
    const user = (request as any).user
    const { id } = request.params as { id: string }
    const { Project, Deployment } = await import('../models')
    
    const project = await Project.findById(id)
    
    if (!project || project.userId !== user.id) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Project not found or access denied'
      })
    }
    
    await Project.findByIdAndDelete(id)
    await Deployment.deleteMany({ projectId: id })
    
    return reply.status(204).send()
  })

  // Deployments routes
  app.get('/api/:version/deployments', {
    preHandler: [authenticateUser]
  }, async (request) => {
    const user = (request as any).user
    const { Deployment } = await import('../models')
    
    const deployments = await Deployment.find({ userId: user.id })
      .sort({ createdAt: -1 })
    
    return {
      apiVersion: (request as any).apiVersion,
      data: deployments,
      meta: {
        total: deployments.length,
        timestamp: new Date().toISOString()
      }
    }
  })

  app.post('/api/:version/deployments', {
    preHandler: [authenticateUser],
    schema: {
      body: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string' },
          branch: { type: 'string' },
          commitHash: { type: 'string' },
          commitMessage: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = (request as any).user
    const deploymentData = request.body as any
    const { Project, Deployment } = await import('../models')
    
    // Verify project ownership
    const project = await Project.findById(deploymentData.projectId)
    if (!project || project.userId !== user.id) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Project not found or access denied'
      })
    }
    
    const deployment = new Deployment({
      ...deploymentData,
      userId: user.id,
      status: 'pending'
    })
    
    await deployment.save()
    
    return reply.status(201).send({
      apiVersion: (request as any).apiVersion,
      data: deployment,
      meta: {
        timestamp: new Date().toISOString()
      }
    })
  })

  // Rate limit status
  app.get('/api/rate-limit/status', {
    preHandler: [authenticateUser]
  }, async (request) => {
    const user = (request as any).user
    const tier = user?.tier || 'free'
    
    const { RATE_LIMIT_TIERS } = await import('../api/security')
    const limits = RATE_LIMIT_TIERS[tier as keyof typeof RATE_LIMIT_TIERS]
    
    return {
      tier,
      limits,
      currentUsage: {
        requests: 0,
        remaining: limits.requests,
        resetTime: new Date(Date.now() + limits.window).toISOString()
      }
    }
  })

  // API key protected route for testing
  app.get('/api/:version/status', {
    preHandler: [validateApiKey]
  }, async (request) => {
    return {
      status: 'authenticated',
      apiVersion: (request as any).apiVersion,
      timestamp: new Date().toISOString()
    }
  })
}

// Authentication middleware for tests
async function authenticateUser(request: any, reply: any) {
  const authHeader = request.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'Authentication Required',
      message: 'Bearer token required'
    })
  }
  
  const token = authHeader.substring(7)
  
  try {
    const { verifyToken } = await import('../auth/jwt')
    const payload = verifyToken(token)
    const { User } = await import('../models')
    
    const user = await User.findById(payload.id)
    if (!user) {
      throw new Error('User not found')
    }
    
    request.user = {
      id: user._id.toString(),
      email: user.email,
      tier: user.tier || 'free'
    }
  } catch (error) {
    return reply.status(401).send({
      error: 'Invalid Token',
      message: 'The provided token is invalid or expired'
    })
  }
}

// API key validation for tests
async function validateApiKey(request: any, reply: any) {
  const apiKey = request.headers['x-api-key']
  
  if (!apiKey) {
    return reply.status(401).send({
      error: 'API Key Required',
      message: 'X-API-Key header is required for this endpoint'
    })
  }
  
  // Validate API key format
  if (!/^mk_[a-zA-Z0-9]{32}$/.test(apiKey)) {
    return reply.status(401).send({
      error: 'Invalid API Key Format',
      message: 'API key must be in format: mk_[32 alphanumeric characters]'
    })
  }
  
  request.apiKey = apiKey
}

// Test data factories
export class TestDataFactory {
  static createUser(overrides: any = {}) {
    return {
      email: 'test@matrix-platform.com',
      name: 'Test User',
      password: 'hashedpassword',
      tier: 'free',
      ...overrides
    }
  }

  static createProject(userId: string, overrides: any = {}) {
    return {
      name: 'Test Project',
      description: 'A test project',
      userId,
      status: 'active',
      framework: 'react',
      repository: {
        url: 'https://github.com/test/repo',
        branch: 'main',
        provider: 'github'
      },
      ...overrides
    }
  }

  static createDeployment(projectId: string, userId: string, overrides: any = {}) {
    return {
      projectId,
      userId,
      status: 'pending',
      commitHash: 'abc123def456',
      commitMessage: 'Test deployment',
      branch: 'main',
      ...overrides
    }
  }

  static generateApiKey(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = 'mk_'
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

// Test helpers
export class TestHelpers {
  static async clearDatabase() {
    const { User, Project, Deployment } = await import('../models')
    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      Deployment.deleteMany({})
    ])
  }

  static async createTestUser(data: any = {}) {
    const { User } = await import('../models')
    const userData = TestDataFactory.createUser(data)
    const user = new User(userData)
    await user.save()
    return user
  }

  static async createTestProject(userId: string, data: any = {}) {
    const { Project } = await import('../models')
    const projectData = TestDataFactory.createProject(userId, data)
    const project = new Project(projectData)
    await project.save()
    return project
  }

  static async createTestDeployment(projectId: string, userId: string, data: any = {}) {
    const { Deployment } = await import('../models')
    const deploymentData = TestDataFactory.createDeployment(projectId, userId, data)
    const deployment = new Deployment(deploymentData)
    await deployment.save()
    return deployment
  }

  static generateAuthToken(user: any): string {
    const { generateToken } = require('../auth/jwt')
    return generateToken({
      id: user._id.toString(),
      email: user.email
    })
  }

  static async makeAuthenticatedRequest(app: FastifyInstance, options: any) {
    const user = await this.createTestUser()
    const token = this.generateAuthToken(user)
    
    return {
      user,
      token,
      response: await app.inject({
        ...options,
        headers: {
          ...options.headers,
          authorization: `Bearer ${token}`
        }
      })
    }
  }

  static expectValidApiResponse(response: any, expectedStatus: number = 200) {
    expect(response.statusCode).toBe(expectedStatus)
    
    if (response.statusCode < 400) {
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('apiVersion')
      expect(body).toHaveProperty('meta')
      expect(body.meta).toHaveProperty('timestamp')
    }
    
    return JSON.parse(response.body)
  }

  static expectErrorResponse(response: any, expectedStatus: number, errorType?: string) {
    expect(response.statusCode).toBe(expectedStatus)
    
    const body = JSON.parse(response.body)
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('message')
    
    if (errorType) {
      expect(body.error).toBe(errorType)
    }
    
    return body
  }

  static async waitForCondition(condition: () => Promise<boolean>, timeout: number = 5000): Promise<void> {
    const start = Date.now()
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    throw new Error(`Condition not met within ${timeout}ms`)
  }
}

// Cleanup function
export async function cleanupTestEnvironment() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  
  if (mongod) {
    await mongod.stop()
    mongod = null
  }
  
  if (redis) {
    redis.disconnect()
    redis = null
  }
}

// Jest setup
export function setupTestEnvironment() {
  beforeAll(async () => {
    // Setup test environment
  })

  afterAll(async () => {
    await cleanupTestEnvironment()
  })

  beforeEach(async () => {
    await TestHelpers.clearDatabase()
  })
}

// Performance testing utilities
export class PerformanceTestUtils {
  static async measureResponseTime(fn: () => Promise<any>): Promise<{ result: any; duration: number }> {
    const start = process.hrtime.bigint()
    const result = await fn()
    const end = process.hrtime.bigint()
    
    return {
      result,
      duration: Number(end - start) / 1000000 // Convert to milliseconds
    }
  }

  static async runConcurrentRequests(requests: (() => Promise<any>)[], maxConcurrency: number = 10): Promise<any[]> {
    const results = []
    
    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const batch = requests.slice(i, i + maxConcurrency)
      const batchResults = await Promise.all(batch.map(request => request()))
      results.push(...batchResults)
    }
    
    return results
  }

  static async loadTest(requestFn: () => Promise<any>, options: {
    duration: number // milliseconds
    requestsPerSecond: number
  }): Promise<{
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    averageResponseTime: number
    minResponseTime: number
    maxResponseTime: number
  }> {
    const results: { success: boolean; duration: number }[] = []
    const interval = 1000 / options.requestsPerSecond
    const endTime = Date.now() + options.duration
    
    while (Date.now() < endTime) {
      const requestPromise = this.measureResponseTime(async () => {
        try {
          await requestFn()
          return true
        } catch (error) {
          return false
        }
      })
      
      requestPromise.then(({ result, duration }) => {
        results.push({ success: result, duration })
      })
      
      await new Promise(resolve => setTimeout(resolve, interval))
    }
    
    // Wait for all requests to complete
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const successfulRequests = results.filter(r => r.success).length
    const responseTimes = results.map(r => r.duration)
    
    return {
      totalRequests: results.length,
      successfulRequests,
      failedRequests: results.length - successfulRequests,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes)
    }
  }
}