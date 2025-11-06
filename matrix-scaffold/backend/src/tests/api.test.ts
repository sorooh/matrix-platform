import { test, describe, beforeEach, afterEach, expect } from '@jest/globals'
import { FastifyInstance } from 'fastify'
import { createTestApp } from './test-utils'
import { User, Project, Deployment } from '../models'
import { generateToken } from '../auth/jwt'

describe('Matrix Platform API Tests', () => {
  let app: FastifyInstance
  let testUser: any
  let authToken: string

  beforeEach(async () => {
    // Create test app instance
    app = await createTestApp()
    
    // Create test user
    testUser = new User({
      email: 'test@matrix-platform.com',
      name: 'Test User',
      password: 'hashedpassword',
      tier: 'pro'
    })
    await testUser.save()
    
    // Generate auth token
    authToken = generateToken({ 
      id: testUser._id, 
      email: testUser.email 
    })
  })

  afterEach(async () => {
    // Clean up database
    await User.deleteMany({})
    await Project.deleteMany({})
    await Deployment.deleteMany({})
    
    // Close app
    await app.close()
  })

  describe('Authentication & Authorization', () => {
    test('should require authentication for protected routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v2/projects'
      })

      expect(response.statusCode).toBe(401)
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Authentication Required'
      })
    })

    test('should accept valid JWT token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v2/projects',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      expect(response.statusCode).toBe(200)
    })

    test('should reject invalid JWT token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v2/projects',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      })

      expect(response.statusCode).toBe(401)
    })

    test('should validate API key format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v2/status',
        headers: {
          'x-api-key': 'invalid-format'
        }
      })

      expect(response.statusCode).toBe(401)
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Invalid API Key Format'
      })
    })
  })

  describe('API Versioning', () => {
    test('should default to current API version', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/version'
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.currentVersion).toBe('v2')
      expect(body.supportedVersions).toContain('v1')
      expect(body.supportedVersions).toContain('v2')
    })

    test('should accept version from URL path', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      expect(response.headers['x-api-version']).toBe('v1')
    })

    test('should accept version from header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: {
          authorization: `Bearer ${authToken}`,
          'x-api-version': 'v1'
        }
      })

      expect(response.headers['x-api-version']).toBe('v1')
    })

    test('should reject unsupported API version', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v99/projects',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      expect(response.statusCode).toBe(400)
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Unsupported API Version'
      })
    })
  })

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      const requests = []
      
      // Make multiple requests rapidly
      for (let i = 0; i < 15; i++) {
        requests.push(
          app.inject({
            method: 'GET',
            url: '/api/v2/projects',
            headers: {
              authorization: `Bearer ${authToken}`
            }
          })
        )
      }

      const responses = await Promise.all(requests)
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.statusCode === 429)
      expect(rateLimited.length).toBeGreaterThan(0)
      
      // Rate limited responses should have proper headers
      const limitedResponse = rateLimited[0]
      expect(limitedResponse.headers['x-ratelimit-limit']).toBeDefined()
      expect(limitedResponse.headers['x-ratelimit-remaining']).toBeDefined()
      expect(limitedResponse.headers['retry-after']).toBeDefined()
    })

    test('should have different limits for different tiers', async () => {
      // Create enterprise user
      const enterpriseUser = new User({
        email: 'enterprise@matrix-platform.com',
        name: 'Enterprise User',
        password: 'hashedpassword',
        tier: 'enterprise'
      })
      await enterpriseUser.save()
      
      const enterpriseToken = generateToken({
        id: enterpriseUser._id,
        email: enterpriseUser.email
      })

      // Enterprise users should have higher limits
      const response = await app.inject({
        method: 'GET',
        url: '/api/rate-limit/status',
        headers: {
          authorization: `Bearer ${enterpriseToken}`
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.tier).toBe('enterprise')
      expect(body.limits.requests).toBeGreaterThan(10000)
    })
  })

  describe('Project Management', () => {
    test('should create new project', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test project',
        framework: 'react',
        repository: {
          url: 'https://github.com/test/repo',
          branch: 'main',
          provider: 'github'
        }
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v2/projects',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(projectData)
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.data.name).toBe(projectData.name)
      expect(body.data.userId).toBe(testUser._id.toString())
    })

    test('should list user projects', async () => {
      // Create test project
      const project = new Project({
        name: 'Test Project',
        userId: testUser._id,
        status: 'active',
        framework: 'react'
      })
      await project.save()

      const response = await app.inject({
        method: 'GET',
        url: '/api/v2/projects',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].name).toBe('Test Project')
    })

    test('should get project by ID', async () => {
      const project = new Project({
        name: 'Test Project',
        userId: testUser._id,
        status: 'active',
        framework: 'react'
      })
      await project.save()

      const response = await app.inject({
        method: 'GET',
        url: `/api/v2/projects/${project._id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.name).toBe('Test Project')
    })

    test('should update project', async () => {
      const project = new Project({
        name: 'Test Project',
        userId: testUser._id,
        status: 'active',
        framework: 'react'
      })
      await project.save()

      const updateData = {
        name: 'Updated Project',
        description: 'Updated description'
      }

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v2/projects/${project._id}`,
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.name).toBe('Updated Project')
      expect(body.data.description).toBe('Updated description')
    })

    test('should delete project', async () => {
      const project = new Project({
        name: 'Test Project',
        userId: testUser._id,
        status: 'active',
        framework: 'react'
      })
      await project.save()

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v2/projects/${project._id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      expect(response.statusCode).toBe(204)
      
      // Verify project is deleted
      const deletedProject = await Project.findById(project._id)
      expect(deletedProject).toBeNull()
    })
  })

  describe('Deployment Management', () => {
    let testProject: any

    beforeEach(async () => {
      testProject = new Project({
        name: 'Test Project',
        userId: testUser._id,
        status: 'active',
        framework: 'react'
      })
      await testProject.save()
    })

    test('should create deployment', async () => {
      const deploymentData = {
        projectId: testProject._id,
        branch: 'main',
        commitHash: 'abc123',
        commitMessage: 'Initial commit'
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v2/deployments',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(deploymentData)
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.data.projectId).toBe(testProject._id.toString())
      expect(body.data.status).toBe('pending')
    })

    test('should list deployments', async () => {
      const deployment = new Deployment({
        projectId: testProject._id,
        userId: testUser._id,
        status: 'success',
        commitHash: 'abc123'
      })
      await deployment.save()

      const response = await app.inject({
        method: 'GET',
        url: '/api/v2/deployments',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].status).toBe('success')
    })
  })

  describe('GraphQL Integration', () => {
    test('should execute GraphQL query', async () => {
      const query = `
        query {
          me {
            id
            email
            name
            tier
          }
        }
      `

      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ query })
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.me.email).toBe(testUser.email)
      expect(body.data.me.tier).toBe('pro')
    })

    test('should handle GraphQL mutations', async () => {
      const mutation = `
        mutation CreateProject($input: ProjectInput!) {
          createProject(input: $input) {
            id
            name
            status
          }
        }
      `

      const variables = {
        input: {
          name: 'GraphQL Test Project',
          description: 'Created via GraphQL',
          framework: 'vue'
        }
      }

      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ query: mutation, variables })
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.createProject.name).toBe('GraphQL Test Project')
      expect(body.data.createProject.status).toBe('active')
    })
  })

  describe('Error Handling', () => {
    test('should handle validation errors', async () => {
      const invalidData = {
        // Missing required name field
        description: 'Invalid project'
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v2/projects',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error).toContain('Validation Error')
    })

    test('should handle not found errors', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v2/projects/507f1f77bcf86cd799439011',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      expect(response.statusCode).toBe(404)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Not Found')
    })

    test('should handle server errors gracefully', async () => {
      // Mock a server error by using invalid MongoDB ObjectId
      const response = await app.inject({
        method: 'GET',
        url: '/api/v2/projects/invalid-id',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error).toBeDefined()
    })
  })

  describe('Security', () => {
    test('should include security headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health'
      })

      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('DENY')
      expect(response.headers['x-xss-protection']).toBe('1; mode=block')
      expect(response.headers['x-request-id']).toBeDefined()
    })

    test('should reject oversized requests', async () => {
      const largePayload = 'x'.repeat(11 * 1024 * 1024) // 11MB

      const response = await app.inject({
        method: 'POST',
        url: '/api/v2/projects',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
          'content-length': largePayload.length.toString()
        },
        body: largePayload
      })

      expect(response.statusCode).toBe(413)
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Request Entity Too Large'
      })
    })
  })

  describe('Performance', () => {
    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now()
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/v2/projects',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      const responseTime = Date.now() - startTime
      
      expect(response.statusCode).toBe(200)
      expect(responseTime).toBeLessThan(1000) // Should respond within 1 second
    })

    test('should handle concurrent requests', async () => {
      const requests = []
      
      for (let i = 0; i < 10; i++) {
        requests.push(
          app.inject({
            method: 'GET',
            url: '/api/v2/projects',
            headers: {
              authorization: `Bearer ${authToken}`
            }
          })
        )
      }

      const responses = await Promise.all(requests)
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(200)
      })
    })
  })
})