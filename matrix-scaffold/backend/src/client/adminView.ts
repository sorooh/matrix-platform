/**
 * Phase 8.1 - Admin Client View
 * 
 * Admin view for managing clients
 * - Impersonate client
 * - Client management
 * - Client analytics
 */

import { logger, logError, logInfo } from '../config/logger'
import { clientPortalManager } from './clientPortal'
import { subscriptionManager } from '../billing/subscription'
import { privateInstanceManager } from '../instances/privateInstance'
import { apiGatewayManager } from '../gateway/apiGateway'
import { ticketingManager } from '../tickets/ticketing'

export interface ClientSummary {
  userId: string
  email: string
  name: string
  subscription: {
    tier: string
    status: string
    periodEnd: Date
  }
  usage: {
    requests: number
    tokens: number
    cost: number
  }
  instances: {
    total: number
    active: number
  }
  apiKeys: number
  tickets: {
    open: number
    total: number
  }
  createdAt: Date
}

class AdminClientViewManager {
  async initialize() {
    logInfo('Initializing Admin Client View...')
    logInfo('✅ Admin Client View initialized')
  }

  // Get client summary
  async getClientSummary(userId: string): Promise<ClientSummary | null> {
    try {
      const profile = await clientPortalManager.getClientProfile(userId)
      if (!profile) return null

      const subscription = await subscriptionManager.getSubscriptionByUserId(userId)
      const usageMetrics = subscription ? await subscriptionManager.getUsageMetrics(subscription.id) : null
      const instances = await privateInstanceManager.getInstancesByUserId(userId)
      const apiKeys = await apiGatewayManager.getAPIKeysByUserId(userId)
      const tickets = await ticketingManager.getTicketsByUserId(userId)

      return {
        userId,
        email: profile.email,
        name: profile.name,
        subscription: subscription ? {
          tier: subscription.tier,
          status: subscription.status,
          periodEnd: subscription.currentPeriodEnd
        } : {
          tier: 'none',
          status: 'none',
          periodEnd: new Date()
        },
        usage: usageMetrics ? {
          requests: usageMetrics.requests,
          tokens: usageMetrics.tokens,
          cost: usageMetrics.cost
        } : {
          requests: 0,
          tokens: 0,
          cost: 0
        },
        instances: {
          total: instances.length,
          active: instances.filter(i => i.status === 'active').length
        },
        apiKeys: apiKeys.length,
        tickets: {
          open: tickets.filter(t => t.status === 'open').length,
          total: tickets.length
        },
        createdAt: profile.createdAt
      }
    } catch (error) {
      logError(error as Error, { context: 'Get client summary' })
      return null
    }
  }

  // Get all clients
  async getAllClients(search?: string, limit: number = 100): Promise<ClientSummary[]> {
    try {
      // In production, get from database with search and pagination
      const { prisma } = await import('../config/database')
      const profiles = await prisma.clientProfile.findMany({
        where: search ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } }
          ]
        } : undefined,
        take: limit
      })

      const summaries: ClientSummary[] = []
      for (const profile of profiles) {
        const summary = await this.getClientSummary(profile.userId)
        if (summary) {
          summaries.push(summary)
        }
      }

      return summaries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    } catch (error) {
      logError(error as Error, { context: 'Get all clients' })
      return []
    }
  }

  // Impersonate client (get client dashboard data as admin)
  async impersonateClient(userId: string): Promise<any> {
    try {
      const dashboard = await clientPortalManager.getClientDashboard(userId)
      const profile = await clientPortalManager.getClientProfile(userId)
      const subscription = await subscriptionManager.getSubscriptionByUserId(userId)
      const instances = await privateInstanceManager.getInstancesByUserId(userId)
      const apiKeys = await apiGatewayManager.getAPIKeysByUserId(userId)
      const tickets = await ticketingManager.getTicketsByUserId(userId)

      return {
        dashboard,
        profile,
        subscription,
        instances,
        apiKeys,
        tickets
      }
    } catch (error) {
      logError(error as Error, { context: 'Impersonate client' })
      return null
    }
  }

  // Update client subscription
  async updateClientSubscription(userId: string, updates: { tier?: string; status?: string }): Promise<boolean> {
    try {
      const subscription = await subscriptionManager.getSubscriptionByUserId(userId)
      if (!subscription) return false

      await subscriptionManager.updateSubscription(subscription.id, updates)
      return true
    } catch (error) {
      logError(error as Error, { context: 'Update client subscription' })
      return false
    }
  }

  // Suspend client account
  async suspendClient(userId: string): Promise<boolean> {
    try {
      const subscription = await subscriptionManager.getSubscriptionByUserId(userId)
      if (!subscription) return false

      await subscriptionManager.updateSubscription(subscription.id, { status: 'suspended' })
      
      // Suspend all instances
      const instances = await privateInstanceManager.getInstancesByUserId(userId)
      for (const instance of instances) {
        await privateInstanceManager.suspendInstance(instance.id)
      }

      return true
    } catch (error) {
      logError(error as Error, { context: 'Suspend client' })
      return false
    }
  }

  // Activate client account
  async activateClient(userId: string): Promise<boolean> {
    try {
      const subscription = await subscriptionManager.getSubscriptionByUserId(userId)
      if (!subscription) return false

      await subscriptionManager.updateSubscription(subscription.id, { status: 'active' })
      return true
    } catch (error) {
      logError(error as Error, { context: 'Activate client' })
      return false
    }
  }
}

export const adminClientViewManager = new AdminClientViewManager()

