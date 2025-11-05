/**
 * Phase 8.1 - Admin Client View API Routes
 * 
 * Admin endpoints for managing clients
 */

import { FastifyInstance } from 'fastify'
import { adminClientViewManager } from './adminView'
import { clientSecurityManager } from './security'
import { logError, logInfo } from '../config/logger'

export async function registerAdminClientRoutes(server: FastifyInstance) {
  logInfo('Registering Admin Client View API routes...')

  // Get client summary
  server.get('/api/admin/clients/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any
      const summary = await adminClientViewManager.getClientSummary(userId)
      if (!summary) {
        return reply.status(404).send({ error: 'Client not found' })
      }

      return { success: true, client: summary }
    } catch (error) {
      logError(error as Error, { context: 'Get client summary' })
      return reply.status(500).send({ error: 'Failed to get client summary' })
    }
  })

  // Get all clients
  server.get('/api/admin/clients', async (request, reply) => {
    try {
      const { search, limit } = request.query as any
      const clients = await adminClientViewManager.getAllClients(search, limit ? parseInt(limit) : 100)
      return { success: true, clients }
    } catch (error) {
      logError(error as Error, { context: 'Get all clients' })
      return reply.status(500).send({ error: 'Failed to get clients' })
    }
  })

  // Impersonate client
  server.get('/api/admin/clients/:userId/impersonate', async (request, reply) => {
    try {
      const { userId } = request.params as any
      const clientData = await adminClientViewManager.impersonateClient(userId)
      if (!clientData) {
        return reply.status(404).send({ error: 'Client not found' })
      }

      return { success: true, clientData }
    } catch (error) {
      logError(error as Error, { context: 'Impersonate client' })
      return reply.status(500).send({ error: 'Failed to impersonate client' })
    }
  })

  // Update client subscription
  server.patch('/api/admin/clients/:userId/subscription', async (request, reply) => {
    try {
      const { userId } = request.params as any
      const updates = request.body as any
      const success = await adminClientViewManager.updateClientSubscription(userId, updates)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Update client subscription' })
      return reply.status(500).send({ error: 'Failed to update subscription' })
    }
  })

  // Suspend client
  server.post('/api/admin/clients/:userId/suspend', async (request, reply) => {
    try {
      const { userId } = request.params as any
      const success = await adminClientViewManager.suspendClient(userId)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Suspend client' })
      return reply.status(500).send({ error: 'Failed to suspend client' })
    }
  })

  // Activate client
  server.post('/api/admin/clients/:userId/activate', async (request, reply) => {
    try {
      const { userId } = request.params as any
      const success = await adminClientViewManager.activateClient(userId)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Activate client' })
      return reply.status(500).send({ error: 'Failed to activate client' })
    }
  })

  logInfo('✅ Admin Client View API routes registered')
}

