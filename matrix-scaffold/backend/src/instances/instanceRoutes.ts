/**
 * Phase 8 - Private Instance API Routes
 * 
 * API endpoints for Private Instance Manager
 */

import { FastifyInstance } from 'fastify'
import { privateInstanceManager } from './privateInstance'
import { logError, logInfo } from '../config/logger'

export async function registerInstanceRoutes(server: FastifyInstance) {
  logInfo('Registering Private Instance API routes...')

  // Instance endpoints
  server.post('/api/instances', async (request, reply) => {
    try {
      const { userId, subscriptionId, name, type, resources } = request.body as any
      const instance = await privateInstanceManager.createInstance(
        userId,
        subscriptionId,
        name,
        type,
        resources
      )
      return { success: true, instance }
    } catch (error) {
      logError(error as Error, { context: 'Create instance' })
      return reply.status(500).send({ error: 'Failed to create instance' })
    }
  })

  server.get('/api/instances/:instanceId', async (request, reply) => {
    try {
      const { instanceId } = request.params as any
      const instance = await privateInstanceManager.getInstance(instanceId)
      if (!instance) {
        return reply.status(404).send({ error: 'Instance not found' })
      }
      return { success: true, instance }
    } catch (error) {
      logError(error as Error, { context: 'Get instance' })
      return reply.status(500).send({ error: 'Failed to get instance' })
    }
  })

  server.get('/api/instances/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any
      const instances = await privateInstanceManager.getInstancesByUserId(userId)
      return { success: true, instances }
    } catch (error) {
      logError(error as Error, { context: 'Get instances by user' })
      return reply.status(500).send({ error: 'Failed to get instances' })
    }
  })

  server.get('/api/instances/subscription/:subscriptionId', async (request, reply) => {
    try {
      const { subscriptionId } = request.params as any
      const instances = await privateInstanceManager.getInstancesBySubscription(subscriptionId)
      return { success: true, instances }
    } catch (error) {
      logError(error as Error, { context: 'Get instances by subscription' })
      return reply.status(500).send({ error: 'Failed to get instances' })
    }
  })

  server.patch('/api/instances/:instanceId', async (request, reply) => {
    try {
      const { instanceId } = request.params as any
      const updates = request.body as any
      const instance = await privateInstanceManager.updateInstance(instanceId, updates)
      if (!instance) {
        return reply.status(404).send({ error: 'Instance not found' })
      }
      return { success: true, instance }
    } catch (error) {
      logError(error as Error, { context: 'Update instance' })
      return reply.status(500).send({ error: 'Failed to update instance' })
    }
  })

  server.post('/api/instances/:instanceId/suspend', async (request, reply) => {
    try {
      const { instanceId } = request.params as any
      const success = await privateInstanceManager.suspendInstance(instanceId)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Suspend instance' })
      return reply.status(500).send({ error: 'Failed to suspend instance' })
    }
  })

  server.post('/api/instances/:instanceId/resume', async (request, reply) => {
    try {
      const { instanceId } = request.params as any
      const success = await privateInstanceManager.resumeInstance(instanceId)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Resume instance' })
      return reply.status(500).send({ error: 'Failed to resume instance' })
    }
  })

  server.delete('/api/instances/:instanceId', async (request, reply) => {
    try {
      const { instanceId } = request.params as any
      const success = await privateInstanceManager.deleteInstance(instanceId)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Delete instance' })
      return reply.status(500).send({ error: 'Failed to delete instance' })
    }
  })

  server.get('/api/instances/:instanceId/performance', async (request, reply) => {
    try {
      const { instanceId } = request.params as any
      const performance = await privateInstanceManager.getInstancePerformance(instanceId)
      if (!performance) {
        return reply.status(404).send({ error: 'Instance not found' })
      }
      return { success: true, performance }
    } catch (error) {
      logError(error as Error, { context: 'Get instance performance' })
      return reply.status(500).send({ error: 'Failed to get instance performance' })
    }
  })

  logInfo('✅ Private Instance API routes registered')
}

