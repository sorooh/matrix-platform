/**
 * Nicholas Tests
 * Test project and job management
 */

import { Nicholas } from '../core/nicholas'
import { prisma } from '../config/database'

describe('Nicholas Tests', () => {
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
      const project = await Nicholas.createProject('Test Project', 'Test Description')

      expect(project).toBeDefined()
      expect(project.name).toBe('Test Project')
      expect(project.description).toBe('Test Description')
    })

    it('should list projects', async () => {
      await Nicholas.createProject('Project 1')
      await Nicholas.createProject('Project 2')

      const projects = await Nicholas.listProjects()
      expect(projects.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Jobs', () => {
    it('should schedule a job', async () => {
      const project = await Nicholas.createProject('Test Project')
      const job = await Nicholas.scheduleJob(project.id, {
        kind: 'script',
        command: ['echo', 'test']
      })

      expect(job).toBeDefined()
      expect(job.projectId).toBe(project.id)
      expect(job.status).toBe('pending')
    })

    it('should get a job', async () => {
      const project = await Nicholas.createProject('Test Project')
      const job = await Nicholas.scheduleJob(project.id, {
        kind: 'script',
        command: ['echo', 'test']
      })

      const retrieved = await Nicholas.getJob(job.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(job.id)
    })
  })
})

