/**
 * Production Health Routes
 * 
 * Health check endpoints for production
 */

import { FastifyInstance } from 'fastify'
import { productionHealth } from './productionHealth'
import { logger, logError } from '../config/logger'

export function registerHealthRoutes(server: FastifyInstance) {
  // Production health check
  server.get('/health', async (request, reply) => {
    try {
      const health = await productionHealth.checkHealth()
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503
      return reply.status(statusCode).send(health)
    } catch (error) {
      logError(error as Error, { context: 'GET /health' })
      return reply.status(503).send({
        status: 'unhealthy',
        error: 'Health check failed'
      })
    }
  })

  // Readiness check
  server.get('/ready', async (request, reply) => {
    try {
      const health = await productionHealth.checkHealth()
      const isReady = health.status === 'healthy' || health.status === 'degraded'
      return reply.status(isReady ? 200 : 503).send({
        ready: isReady,
        status: health.status
      })
    } catch (error) {
      logError(error as Error, { context: 'GET /ready' })
      return reply.status(503).send({ ready: false })
    }
  })

  // Liveness check
  server.get('/live', async (request, reply) => {
    return reply.send({ alive: true, timestamp: new Date() })
  })
}

