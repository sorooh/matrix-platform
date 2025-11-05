/**
 * Phase 1 - Routes
 * 
 * Enhanced core API routes
 */

import { FastifyInstance } from 'fastify'
import { logger, logError } from '../../config/logger'

export async function registerPhase1Routes(server: FastifyInstance) {
  // Enhanced project management
  server.get('/api/phase1/projects/enhanced', async (request, reply) => {
    try {
      const { prisma } = await import('../../config/database')
      const projects = await prisma.project.findMany({
        include: {
          jobs: true,
          tasks: true,
          memories: true
        },
        orderBy: { createdAt: 'desc' }
      })
      return reply.send({ success: true, projects })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/phase1/projects/enhanced' })
      return reply.status(500).send({ error: 'Failed to get enhanced projects' })
    }
  })

  // Enhanced memory search
  server.get('/api/phase1/memory/enhanced-search', async (request, reply) => {
    try {
      const { projectId, query, limit = 10 } = request.query as any
      const { prisma } = await import('../../config/database')
      const memories = await prisma.memory.findMany({
        where: {
          projectId: projectId || '__org__',
          text: { contains: query, mode: 'insensitive' }
        },
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      })
      return reply.send({ success: true, memories })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/phase1/memory/enhanced-search' })
      return reply.status(500).send({ error: 'Failed to search memory' })
    }
  })
}

