/**
 * Phase 2 - Routes
 * 
 * Advanced core API routes
 */

import { FastifyInstance } from 'fastify'
import { logger, logError } from '../../config/logger'

export async function registerPhase2Routes(server: FastifyInstance) {
  // Advanced project analytics
  server.get('/api/phase2/projects/analytics', async (request, reply) => {
    try {
      const { projectId } = request.query as any
      const { prisma } = await import('../../config/database')
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          jobs: true,
          tasks: true,
          memories: true
        }
      })
      if (!project) return reply.status(404).send({ error: 'Project not found' })
      
      const analytics = {
        totalJobs: project.jobs.length,
        completedJobs: project.jobs.filter(j => j.status === 'completed').length,
        totalTasks: project.tasks.length,
        totalMemories: project.memories.length,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
      return reply.send({ success: true, analytics })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/phase2/projects/analytics' })
      return reply.status(500).send({ error: 'Failed to get project analytics' })
    }
  })

  // Advanced job management
  server.get('/api/phase2/jobs/advanced', async (request, reply) => {
    try {
      const { projectId, status } = request.query as any
      const { prisma } = await import('../../config/database')
      const jobs = await prisma.job.findMany({
        where: {
          projectId,
          status: status || undefined
        },
        include: {
          artifacts: true
        },
        orderBy: { createdAt: 'desc' }
      })
      return reply.send({ success: true, jobs })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/phase2/jobs/advanced' })
      return reply.status(500).send({ error: 'Failed to get advanced jobs' })
    }
  })
}

