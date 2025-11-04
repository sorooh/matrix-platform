/**
 * Memory Tests
 * Test memory operations with database
 */

import { addMemory, searchMemory, addMemoryUnique } from '../core/memory'
import { db } from '../core/storage'
import { prisma } from '../config/database'

describe('Memory Tests', () => {
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

  describe('Memory Operations', () => {
    it('should add memory', async () => {
      const projectId = 'test-project-1'
      const text = 'Test memory text'
      const rec = await addMemory(projectId, text)

      expect(rec).toBeDefined()
      expect(rec.text).toBe(text)
      expect(rec.projectId).toBe(projectId)
    })

    it('should search memory', async () => {
      const projectId = 'test-project-1'
      await addMemory(projectId, 'Test memory 1')
      await addMemory(projectId, 'Test memory 2')

      const results = await searchMemory(projectId, 'Test', 5)
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
    })

    it('should add unique memory', async () => {
      const projectId = 'test-project-1'
      const text = 'Unique test memory'
      
      const rec1 = await addMemoryUnique(projectId, text)
      const rec2 = await addMemoryUnique(projectId, text)

      expect(rec1.id).toBe(rec2.id)
    })
  })
})

