/**
 * Billing & Points System
 * Phase 4: User Experience & Interaction
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { prisma } from '../config/database'
import { referralSystem } from './referral'

export interface Subscription {
  id: string
  userId: string
  plan: 'free' | 'pro' | 'enterprise'
  status: 'active' | 'cancelled' | 'expired'
  stripeId?: string
  paypalId?: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  createdAt: Date
  updatedAt: Date
}

export interface BillingHistory {
  id: string
  userId: string
  type: 'subscription' | 'purchase' | 'refund'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed'
  paymentMethod?: string
  transactionId?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

export interface Plan {
  id: 'free' | 'pro' | 'enterprise'
  name: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  aiCredits: number
  limits: {
    projects: number
    storage: string
    apiCalls: number
  }
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: ['Basic AI features', '100 AI credits/month', 'Community support'],
    aiCredits: 100,
    limits: {
      projects: 5,
      storage: '1GB',
      apiCalls: 1000,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    currency: 'USD',
    interval: 'month',
    features: ['Advanced AI features', '1000 AI credits/month', 'Priority support', 'Advanced analytics'],
    aiCredits: 1000,
    limits: {
      projects: 50,
      storage: '10GB',
      apiCalls: 10000,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    currency: 'USD',
    interval: 'month',
    features: ['Unlimited AI features', 'Unlimited AI credits', 'VIP support', 'Custom integrations', 'Dedicated account manager'],
    aiCredits: -1, // Unlimited
    limits: {
      projects: -1, // Unlimited
      storage: '100GB',
      apiCalls: -1, // Unlimited
    },
  },
]

export class BillingSystem {
  /**
   * Get user subscription
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'active',
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!subscription) {
        return null
      }

      return {
        id: subscription.id,
        userId: subscription.userId,
        plan: subscription.plan as any,
        status: subscription.status as any,
        stripeId: subscription.stripeId || undefined,
        paypalId: subscription.paypalId || undefined,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      }
    } catch (error: any) {
      logger.error('Get user subscription failed:', error)
      return null
    }
  }

  /**
   * Create or update subscription
   */
  async createSubscription(
    userId: string,
    plan: 'free' | 'pro' | 'enterprise',
    options?: {
      stripeId?: string
      paypalId?: string
      periodStart?: Date
      periodEnd?: Date
    }
  ): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
    try {
      // Cancel existing subscriptions
      await prisma.subscription.updateMany({
        where: {
          userId,
          status: 'active',
        },
        data: {
          status: 'cancelled',
        },
      })

      // Calculate period
      const periodStart = options?.periodStart || new Date()
      const periodEnd = options?.periodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

      // Create new subscription
      const subscription = await prisma.subscription.create({
        data: {
          userId,
          plan,
          status: 'active',
          stripeId: options?.stripeId,
          paypalId: options?.paypalId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      })

      // Award AI credits based on plan
      const planConfig = PLANS.find((p) => p.id === plan)
      if (planConfig && planConfig.aiCredits > 0) {
        await referralSystem.awardAICredits(userId, planConfig.aiCredits)
      }

      logger.info(`Subscription created: ${subscription.id}`, { userId, plan })

      return {
        success: true,
        subscription: {
          id: subscription.id,
          userId: subscription.userId,
          plan: subscription.plan as any,
          status: subscription.status as any,
          stripeId: subscription.stripeId || undefined,
          paypalId: subscription.paypalId || undefined,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          createdAt: subscription.createdAt,
          updatedAt: subscription.updatedAt,
        },
      }
    } catch (error: any) {
      logger.error('Create subscription failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    userId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'active',
        },
      })

      if (!subscription) {
        return { success: false, error: 'Active subscription not found' }
      }

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd,
        },
      })

      logger.info(`Subscription cancelled: ${subscription.id}`, { userId, cancelAtPeriodEnd })

      return { success: true }
    } catch (error: any) {
      logger.error('Cancel subscription failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Add billing history
   */
  async addBillingHistory(
    userId: string,
    history: {
      type: 'subscription' | 'purchase' | 'refund'
      amount: number
      currency?: string
      status: 'pending' | 'completed' | 'failed'
      paymentMethod?: string
      transactionId?: string
      metadata?: Record<string, unknown>
    }
  ): Promise<{ success: boolean; billingHistory?: BillingHistory; error?: string }> {
    try {
      const billing = await prisma.billingHistory.create({
        data: {
          userId,
          type: history.type,
          amount: history.amount,
          currency: history.currency || 'USD',
          status: history.status,
          paymentMethod: history.paymentMethod,
          transactionId: history.transactionId,
          metadata: history.metadata || {},
        },
      })

      logger.info(`Billing history added: ${billing.id}`, { userId, type: history.type })

      return {
        success: true,
        billingHistory: {
          id: billing.id,
          userId: billing.userId,
          type: billing.type as any,
          amount: billing.amount,
          currency: billing.currency,
          status: billing.status as any,
          paymentMethod: billing.paymentMethod || undefined,
          transactionId: billing.transactionId || undefined,
          metadata: billing.metadata as Record<string, unknown>,
          createdAt: billing.createdAt,
        },
      }
    } catch (error: any) {
      logger.error('Add billing history failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get billing history
   */
  async getBillingHistory(userId: string, limit: number = 50): Promise<BillingHistory[]> {
    try {
      const history = await prisma.billingHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

      return history.map((h) => ({
        id: h.id,
        userId: h.userId,
        type: h.type as any,
        amount: h.amount,
        currency: h.currency,
        status: h.status as any,
        paymentMethod: h.paymentMethod || undefined,
        transactionId: h.transactionId || undefined,
        metadata: h.metadata as Record<string, unknown>,
        createdAt: h.createdAt,
      }))
    } catch (error: any) {
      logger.error('Get billing history failed:', error)
      return []
    }
  }

  /**
   * Get available plans
   */
  getAvailablePlans(): Plan[] {
    return PLANS
  }

  /**
   * Get plan by ID
   */
  getPlanById(planId: string): Plan | null {
    return PLANS.find((p) => p.id === planId) || null
  }

  /**
   * Check subscription limits
   */
  async checkLimits(userId: string, resource: 'projects' | 'storage' | 'apiCalls'): Promise<{
    limit: number
    used: number
    remaining: number
    exceeded: boolean
  }> {
    try {
      const subscription = await this.getUserSubscription(userId)
      const planId = subscription?.plan || 'free'
      const plan = this.getPlanById(planId)

      if (!plan) {
        return { limit: 0, used: 0, remaining: 0, exceeded: true }
      }

      const limit = plan.limits[resource]
      if (limit === -1) {
        // Unlimited
        return { limit: -1, used: 0, remaining: -1, exceeded: false }
      }

      // Calculate used (simplified - in production, calculate from actual usage)
      let used = 0
      if (resource === 'projects') {
        const projects = await prisma.project.count({ where: { userId } })
        used = projects
      } else if (resource === 'apiCalls') {
        // In production, track API calls
        used = 0
      } else {
        // storage
        used = 0
      }

      const remaining = limit - used
      const exceeded = remaining < 0

      return { limit, used, remaining, exceeded }
    } catch (error: any) {
      logger.error('Check limits failed:', error)
      return { limit: 0, used: 0, remaining: 0, exceeded: true }
    }
  }
}

// Global Billing System
export const billingSystem = new BillingSystem()

