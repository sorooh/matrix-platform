/**
 * Storage Tests
 * Test database operations
 */

import { db } from '../core/storage.db'
import { prisma } from '../config/database'

describe('Storage Tests', () => {
  beforeAll(async () => {
    // Setup test database
  })

  afterAll(async () => {
    // Cleanup
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clear test data
  })

  describe('Projects', () => {
    it('should create a project', async () => {
      const project = await db.upsertProject({
        id: 'test-project-1',
        name: 'Test Project',
        description: 'Test Description',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      expect(project).toBeDefined()
      expect(project.name).toBe('Test Project')
    })

    it('should list projects', async () => {
      const projects = await db.listProjects()
      expect(Array.isArray(projects)).toBe(true)
    })

    it('should get project by id', async () => {
      const project = await db.getProject('test-project-1')
      expect(project).toBeDefined()
      expect(project?.name).toBe('Test Project')
    })
  })

  describe('Jobs', () => {
    it('should create a job', async () => {
      const job = await db.upsertJob({
        id: 'test-job-1',
        projectId: 'test-project-1',
        status: 'pending',
        spec: { kind: 'script', command: ['echo', 'test'] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      expect(job).toBeDefined()
      expect(job.status).toBe('pending')
    })

    it('should list jobs', async () => {
      const jobs = await db.listJobs()
      expect(Array.isArray(jobs)).toBe(true)
    })
  })
})

