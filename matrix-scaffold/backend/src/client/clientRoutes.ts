/**
 * Phase 8.1 - Client Portal API Routes
 * 
 * Client-facing API endpoints for Client Portal
 */

import { FastifyInstance } from 'fastify'
import { clientPortalManager } from './clientPortal'
import { subscriptionManager } from '../billing/subscription'
import { usageTracker } from '../billing/usageTracker'
import { privateInstanceManager } from '../instances/privateInstance'
import { apiGatewayManager } from '../gateway/apiGateway'
import { ticketingManager } from '../tickets/ticketing'
import { logError, logInfo } from '../config/logger'

export async function registerClientRoutes(server: FastifyInstance) {
  logInfo('Registering Client Portal API routes...')

  // Client Dashboard
  server.get('/api/client/dashboard', async (request, reply) => {
    try {
      const { userId } = request.query as any
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' })
      }

      const dashboard = await clientPortalManager.getClientDashboard(userId)
      if (!dashboard) {
        return reply.status(404).send({ error: 'Dashboard not found' })
      }

      return { success: true, dashboard }
    } catch (error) {
      logError(error as Error, { context: 'Get client dashboard' })
      return reply.status(500).send({ error: 'Failed to get dashboard' })
    }
  })

  // Client Profile
  server.get('/api/client/profile', async (request, reply) => {
    try {
      const { userId } = request.query as any
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' })
      }

      const profile = await clientPortalManager.getClientProfile(userId)
      if (!profile) {
        return reply.status(404).send({ error: 'Profile not found' })
      }

      return { success: true, profile }
    } catch (error) {
      logError(error as Error, { context: 'Get client profile' })
      return reply.status(500).send({ error: 'Failed to get profile' })
    }
  })

  server.patch('/api/client/profile', async (request, reply) => {
    try {
      const { userId, ...updates } = request.body as any
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' })
      }

      const profile = await clientPortalManager.updateClientProfile(userId, updates)
      if (!profile) {
        return reply.status(404).send({ error: 'Profile not found' })
      }

      return { success: true, profile }
    } catch (error) {
      logError(error as Error, { context: 'Update client profile' })
      return reply.status(500).send({ error: 'Failed to update profile' })
    }
  })

  // Subscription Manager
  server.get('/api/client/subscription', async (request, reply) => {
    try {
      const { userId } = request.query as any
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' })
      }

      const subscription = await subscriptionManager.getSubscriptionByUserId(userId)
      if (!subscription) {
        return reply.status(404).send({ error: 'Subscription not found' })
      }

      // Get tier limits
      const limits = subscriptionManager.getTierLimits(subscription.tier)

      return {
        success: true,
        subscription: {
          ...subscription,
          limits
        }
      }
    } catch (error) {
      logError(error as Error, { context: 'Get client subscription' })
      return reply.status(500).send({ error: 'Failed to get subscription' })
    }
  })

  server.post('/api/client/subscription/upgrade', async (request, reply) => {
    try {
      const { userId, newTier } = request.body as any
      if (!userId || !newTier) {
        return reply.status(400).send({ error: 'User ID and new tier required' })
      }

      const subscription = await subscriptionManager.getSubscriptionByUserId(userId)
      if (!subscription) {
        return reply.status(404).send({ error: 'Subscription not found' })
      }

      const updated = await subscriptionManager.updateSubscription(subscription.id, {
        tier: newTier
      })

      return { success: true, subscription: updated }
    } catch (error) {
      logError(error as Error, { context: 'Upgrade subscription' })
      return reply.status(500).send({ error: 'Failed to upgrade subscription' })
    }
  })

  server.post('/api/client/subscription/cancel', async (request, reply) => {
    try {
      const { userId, cancelAtPeriodEnd } = request.body as any
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' })
      }

      const subscription = await subscriptionManager.getSubscriptionByUserId(userId)
      if (!subscription) {
        return reply.status(404).send({ error: 'Subscription not found' })
      }

      const success = await subscriptionManager.cancelSubscription(
        subscription.id,
        cancelAtPeriodEnd !== false
      )

      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Cancel subscription' })
      return reply.status(500).send({ error: 'Failed to cancel subscription' })
    }
  })

  // Billing & Invoices
  server.get('/api/client/billing/invoices', async (request, reply) => {
    try {
      const { userId } = request.query as any
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' })
      }

      const invoices = await subscriptionManager.getInvoicesByUserId(userId)
      return { success: true, invoices }
    } catch (error) {
      logError(error as Error, { context: 'Get client invoices' })
      return reply.status(500).send({ error: 'Failed to get invoices' })
    }
  })

  server.get('/api/client/billing/invoices/:invoiceId', async (request, reply) => {
    try {
      const { invoiceId } = request.params as any
      const invoice = await subscriptionManager.getInvoice(invoiceId)
      if (!invoice) {
        return reply.status(404).send({ error: 'Invoice not found' })
      }

      return { success: true, invoice }
    } catch (error) {
      logError(error as Error, { context: 'Get client invoice' })
      return reply.status(500).send({ error: 'Failed to get invoice' })
    }
  })

  server.get('/api/client/billing/invoices/:invoiceId/download', async (request, reply) => {
    try {
      const { invoiceId } = request.params as any
      const invoice = await subscriptionManager.getInvoice(invoiceId)
      if (!invoice) {
        return reply.status(404).send({ error: 'Invoice not found' })
      }

      // In production, generate PDF from invoice
      // For now, return JSON
      return { success: true, invoice, pdf: 'TODO: Generate PDF' }
    } catch (error) {
      logError(error as Error, { context: 'Download invoice' })
      return reply.status(500).send({ error: 'Failed to download invoice' })
    }
  })

  // Usage Analytics
  server.get('/api/client/usage', async (request, reply) => {
    try {
      const { userId, period, periodStart, periodEnd } = request.query as any
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' })
      }

      const subscription = await subscriptionManager.getSubscriptionByUserId(userId)
      if (!subscription) {
        return reply.status(404).send({ error: 'Subscription not found' })
      }

      const metrics = await subscriptionManager.getUsageMetrics(subscription.id)
      if (!metrics) {
        return reply.status(404).send({ error: 'Usage metrics not found' })
      }

      return { success: true, usage: metrics }
    } catch (error) {
      logError(error as Error, { context: 'Get client usage' })
      return reply.status(500).send({ error: 'Failed to get usage' })
    }
  })

  server.post('/api/client/usage/report', async (request, reply) => {
    try {
      const { userId, period, periodStart, periodEnd } = request.body as any
      if (!userId || !period || !periodStart || !periodEnd) {
        return reply.status(400).send({ error: 'Missing required parameters' })
      }

      const subscription = await subscriptionManager.getSubscriptionByUserId(userId)
      if (!subscription) {
        return reply.status(404).send({ error: 'Subscription not found' })
      }

      const report = await usageTracker.generateUsageReport(
        userId,
        period,
        new Date(periodStart),
        new Date(periodEnd),
        subscription.id
      )

      return { success: true, report }
    } catch (error) {
      logError(error as Error, { context: 'Generate usage report' })
      return reply.status(500).send({ error: 'Failed to generate usage report' })
    }
  })

  // AI Instances
  server.get('/api/client/instances', async (request, reply) => {
    try {
      const { userId } = request.query as any
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' })
      }

      const instances = await privateInstanceManager.getInstancesByUserId(userId)
      return { success: true, instances }
    } catch (error) {
      logError(error as Error, { context: 'Get client instances' })
      return reply.status(500).send({ error: 'Failed to get instances' })
    }
  })

  server.get('/api/client/instances/:instanceId', async (request, reply) => {
    try {
      const { instanceId } = request.params as any
      const instance = await privateInstanceManager.getInstance(instanceId)
      if (!instance) {
        return reply.status(404).send({ error: 'Instance not found' })
      }

      const performance = await privateInstanceManager.getInstancePerformance(instanceId)
      return {
        success: true,
        instance: {
          ...instance,
          performance
        }
      }
    } catch (error) {
      logError(error as Error, { context: 'Get client instance' })
      return reply.status(500).send({ error: 'Failed to get instance' })
    }
  })

  server.post('/api/client/instances', async (request, reply) => {
    try {
      const { userId, subscriptionId, name, type, resources } = request.body as any
      if (!userId || !subscriptionId || !name || !type) {
        return reply.status(400).send({ error: 'Missing required parameters' })
      }

      const instance = await privateInstanceManager.createInstance(
        userId,
        subscriptionId,
        name,
        type,
        resources
      )

      return { success: true, instance }
    } catch (error) {
      logError(error as Error, { context: 'Create client instance' })
      return reply.status(500).send({ error: 'Failed to create instance' })
    }
  })

  server.post('/api/client/instances/:instanceId/start', async (request, reply) => {
    try {
      const { instanceId } = request.params as any
      const success = await privateInstanceManager.resumeInstance(instanceId)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Start instance' })
      return reply.status(500).send({ error: 'Failed to start instance' })
    }
  })

  server.post('/api/client/instances/:instanceId/stop', async (request, reply) => {
    try {
      const { instanceId } = request.params as any
      const success = await privateInstanceManager.suspendInstance(instanceId)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Stop instance' })
      return reply.status(500).send({ error: 'Failed to stop instance' })
    }
  })

  server.delete('/api/client/instances/:instanceId', async (request, reply) => {
    try {
      const { instanceId } = request.params as any
      const success = await privateInstanceManager.deleteInstance(instanceId)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Delete instance' })
      return reply.status(500).send({ error: 'Failed to delete instance' })
    }
  })

  // API Keys
  server.get('/api/client/api-keys', async (request, reply) => {
    try {
      const { userId } = request.query as any
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' })
      }

      const apiKeys = await apiGatewayManager.getAPIKeysByUserId(userId)
      return { success: true, apiKeys }
    } catch (error) {
      logError(error as Error, { context: 'Get client API keys' })
      return reply.status(500).send({ error: 'Failed to get API keys' })
    }
  })

  server.post('/api/client/api-keys', async (request, reply) => {
    try {
      const { userId, name, subscriptionId, allowedAIs, rateLimit, expiresInDays } = request.body as any
      if (!userId || !name) {
        return reply.status(400).send({ error: 'User ID and name required' })
      }

      const apiKey = await apiGatewayManager.createAPIKey(
        userId,
        name,
        subscriptionId,
        allowedAIs,
        rateLimit,
        expiresInDays
      )

      return { success: true, apiKey }
    } catch (error) {
      logError(error as Error, { context: 'Create API key' })
      return reply.status(500).send({ error: 'Failed to create API key' })
    }
  })

  server.post('/api/client/api-keys/:keyId/revoke', async (request, reply) => {
    try {
      const { keyId } = request.params as any
      const success = await apiGatewayManager.revokeAPIKey(keyId)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Revoke API key' })
      return reply.status(500).send({ error: 'Failed to revoke API key' })
    }
  })

  // Support Tickets
  server.get('/api/client/tickets', async (request, reply) => {
    try {
      const { userId } = request.query as any
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' })
      }

      const tickets = await ticketingManager.getTicketsByUserId(userId)
      return { success: true, tickets }
    } catch (error) {
      logError(error as Error, { context: 'Get client tickets' })
      return reply.status(500).send({ error: 'Failed to get tickets' })
    }
  })

  server.get('/api/client/tickets/:ticketId', async (request, reply) => {
    try {
      const { ticketId } = request.params as any
      const ticket = await ticketingManager.getTicket(ticketId)
      if (!ticket) {
        return reply.status(404).send({ error: 'Ticket not found' })
      }

      return { success: true, ticket }
    } catch (error) {
      logError(error as Error, { context: 'Get client ticket' })
      return reply.status(500).send({ error: 'Failed to get ticket' })
    }
  })

  server.post('/api/client/tickets', async (request, reply) => {
    try {
      const { userId, type, priority, subject, description } = request.body as any
      if (!userId || !type || !priority || !subject || !description) {
        return reply.status(400).send({ error: 'Missing required parameters' })
      }

      const ticket = await ticketingManager.createTicket(
        userId,
        type,
        priority,
        subject,
        description
      )

      return { success: true, ticket }
    } catch (error) {
      logError(error as Error, { context: 'Create ticket' })
      return reply.status(500).send({ error: 'Failed to create ticket' })
    }
  })

  server.post('/api/client/tickets/:ticketId/messages', async (request, reply) => {
    try {
      const { ticketId } = request.params as any
      const { userId, content, attachments } = request.body as any
      if (!userId || !content) {
        return reply.status(400).send({ error: 'User ID and content required' })
      }

      const message = await ticketingManager.addMessage(
        ticketId,
        userId,
        content,
        false,
        attachments
      )

      if (!message) {
        return reply.status(404).send({ error: 'Ticket not found' })
      }

      return { success: true, message }
    } catch (error) {
      logError(error as Error, { context: 'Add ticket message' })
      return reply.status(500).send({ error: 'Failed to add message' })
    }
  })

  // Sessions
  server.get('/api/client/sessions', async (request, reply) => {
    try {
      const { userId } = request.query as any
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' })
      }

      const sessions = await clientPortalManager.getActiveSessions(userId)
      return { success: true, sessions }
    } catch (error) {
      logError(error as Error, { context: 'Get client sessions' })
      return reply.status(500).send({ error: 'Failed to get sessions' })
    }
  })

  server.post('/api/client/sessions/revoke', async (request, reply) => {
    try {
      const { token } = request.body as any
      if (!token) {
        return reply.status(400).send({ error: 'Token required' })
      }

      const success = await clientPortalManager.revokeSession(token)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Revoke session' })
      return reply.status(500).send({ error: 'Failed to revoke session' })
    }
  })

  logInfo('✅ Client Portal API routes registered')
}

