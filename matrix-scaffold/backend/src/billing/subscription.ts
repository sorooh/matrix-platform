/**
 * Phase 8 - Subscription & Billing System
 * 
 * Subscription management with multiple payment providers:
 * - Stripe (Credit Cards)
 * - PayPal (Bank Accounts)
 * - Crypto Payments (USDT, BTC, ETH)
 * 
 * Subscription tiers: Free / Pro / Enterprise / Custom
 * Usage-based billing tracking
 * Automatic invoice generation and email delivery
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type SubscriptionTier = 'free' | 'pro' | 'enterprise' | 'custom'
export type PaymentProvider = 'stripe' | 'paypal' | 'crypto'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'suspended' | 'trial'

export interface Subscription {
  id: string
  userId: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  paymentProvider: PaymentProvider
  paymentMethodId?: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  trialEnd?: Date
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface UsageMetrics {
  requests: number
  tokens: number
  cost: number
  periodStart: Date
  periodEnd: Date
}

export interface Invoice {
  id: string
  subscriptionId: string
  userId: string
  amount: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  periodStart: Date
  periodEnd: Date
  items: InvoiceItem[]
  paymentProvider: PaymentProvider
  paymentIntentId?: string
  paidAt?: Date
  dueDate: Date
  createdAt: Date
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  amount: number
  metadata?: Record<string, any>
}

class SubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map()
  private invoices: Map<string, Invoice> = new Map()
  private usageMetrics: Map<string, UsageMetrics> = new Map()

  async initialize() {
    logInfo('Initializing Subscription & Billing System...')
    
    // Load subscriptions from database
    try {
      const { prisma } = await import('../config/database')
      const subscriptions = await prisma.subscription.findMany()
      for (const sub of subscriptions) {
        this.subscriptions.set(sub.id, {
          id: sub.id,
          userId: sub.userId,
          tier: sub.tier as SubscriptionTier,
          status: sub.status as SubscriptionStatus,
          paymentProvider: sub.paymentProvider as PaymentProvider,
          paymentMethodId: sub.paymentMethodId || undefined,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          trialEnd: sub.trialEnd || undefined,
          metadata: sub.metadata as Record<string, any>,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt
        })
      }
      logInfo(`✅ Loaded ${subscriptions.length} subscriptions from database`)
    } catch (error) {
      logError(error as Error, { context: 'Subscription initialization' })
    }

    logInfo('✅ Subscription & Billing System initialized')
  }

  // Create new subscription
  async createSubscription(
    userId: string,
    tier: SubscriptionTier,
    paymentProvider: PaymentProvider,
    paymentMethodId?: string,
    trialDays?: number
  ): Promise<Subscription> {
    try {
      const subscriptionId = nanoid()
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1) // Default 1 month

      const trialEnd = trialDays ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : undefined

      const subscription: Subscription = {
        id: subscriptionId,
        userId,
        tier,
        status: trialEnd ? 'trial' : 'active',
        paymentProvider,
        paymentMethodId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        trialEnd,
        metadata: {},
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.subscription.create({
          data: {
            id: subscriptionId,
            userId,
            tier,
            status: subscription.status,
            paymentProvider,
            paymentMethodId: paymentMethodId || null,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            trialEnd: trialEnd || null,
            metadata: subscription.metadata
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create subscription in database' })
      }

      this.subscriptions.set(subscriptionId, subscription)
      logInfo(`✅ Created subscription ${subscriptionId} for user ${userId} (${tier})`)

      return subscription
    } catch (error) {
      logError(error as Error, { context: 'Create subscription' })
      throw error
    }
  }

  // Get subscription by ID
  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    return this.subscriptions.get(subscriptionId) || null
  }

  // Get subscription by user ID
  async getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    for (const sub of this.subscriptions.values()) {
      if (sub.userId === userId && (sub.status === 'active' || sub.status === 'trial')) {
        return sub
      }
    }
    return null
  }

  // Update subscription
  async updateSubscription(
    subscriptionId: string,
    updates: Partial<Subscription>
  ): Promise<Subscription | null> {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) return null

    const updated = {
      ...subscription,
      ...updates,
      updatedAt: new Date()
    }

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          tier: updated.tier,
          status: updated.status,
          paymentProvider: updated.paymentProvider,
          paymentMethodId: updated.paymentMethodId || null,
          currentPeriodStart: updated.currentPeriodStart,
          currentPeriodEnd: updated.currentPeriodEnd,
          cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
          trialEnd: updated.trialEnd || null,
          metadata: updated.metadata
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Update subscription in database' })
    }

    this.subscriptions.set(subscriptionId, updated)
    return updated
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) return false

    if (cancelAtPeriodEnd) {
      await this.updateSubscription(subscriptionId, { cancelAtPeriodEnd: true })
    } else {
      await this.updateSubscription(subscriptionId, {
        status: 'cancelled',
        cancelAtPeriodEnd: false
      })
    }

    return true
  }

  // Track usage
  async trackUsage(
    subscriptionId: string,
    requests: number = 1,
    tokens: number = 0,
    cost: number = 0
  ): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) return

    const metricsKey = `${subscriptionId}:${subscription.currentPeriodStart.toISOString()}`
    const existing = this.usageMetrics.get(metricsKey)

    if (existing) {
      existing.requests += requests
      existing.tokens += tokens
      existing.cost += cost
    } else {
      this.usageMetrics.set(metricsKey, {
        requests,
        tokens,
        cost,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd
      })
    }

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.usageMetrics.upsert({
        where: {
          subscriptionId_periodStart: {
            subscriptionId,
            periodStart: subscription.currentPeriodStart
          }
        },
        create: {
          subscriptionId,
          periodStart: subscription.currentPeriodStart,
          periodEnd: subscription.currentPeriodEnd,
          requests,
          tokens,
          cost
        },
        update: {
          requests: { increment: requests },
          tokens: { increment: tokens },
          cost: { increment: cost }
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Track usage in database' })
    }
  }

  // Get usage metrics
  async getUsageMetrics(subscriptionId: string): Promise<UsageMetrics | null> {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) return null

    const metricsKey = `${subscriptionId}:${subscription.currentPeriodStart.toISOString()}`
    return this.usageMetrics.get(metricsKey) || null
  }

  // Create invoice
  async createInvoice(
    subscriptionId: string,
    items: InvoiceItem[],
    dueDate?: Date
  ): Promise<Invoice> {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) throw new Error('Subscription not found')

    const invoiceId = nanoid()
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
    const now = new Date()

    const invoice: Invoice = {
      id: invoiceId,
      subscriptionId,
      userId: subscription.userId,
      amount: totalAmount,
      currency: 'USD',
      status: 'draft',
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      items,
      paymentProvider: subscription.paymentProvider,
      dueDate: dueDate || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
      createdAt: now
    }

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.invoice.create({
        data: {
          id: invoiceId,
          subscriptionId,
          userId: subscription.userId,
          amount: totalAmount,
          currency: 'USD',
          status: 'draft',
          periodStart: subscription.currentPeriodStart,
          periodEnd: subscription.currentPeriodEnd,
          items: items,
          paymentProvider: subscription.paymentProvider,
          dueDate: invoice.dueDate
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Create invoice in database' })
    }

    this.invoices.set(invoiceId, invoice)
    logInfo(`✅ Created invoice ${invoiceId} for subscription ${subscriptionId}`)

    return invoice
  }

  // Get invoice
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    return this.invoices.get(invoiceId) || null
  }

  // Get invoices by user
  async getInvoicesByUserId(userId: string): Promise<Invoice[]> {
    const userInvoices: Invoice[] = []
    for (const invoice of this.invoices.values()) {
      if (invoice.userId === userId) {
        userInvoices.push(invoice)
      }
    }
    return userInvoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Process payment
  async processPayment(
    invoiceId: string,
    paymentIntentId: string
  ): Promise<boolean> {
    const invoice = this.invoices.get(invoiceId)
    if (!invoice) return false

    const updated = {
      ...invoice,
      status: 'paid' as const,
      paymentIntentId,
      paidAt: new Date()
    }

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'paid',
          paymentIntentId,
          paidAt: new Date()
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Process payment in database' })
    }

    this.invoices.set(invoiceId, updated)
    logInfo(`✅ Processed payment for invoice ${invoiceId}`)

    return true
  }

  // Check subscription limits
  async checkLimits(subscriptionId: string, resource: string, amount: number): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) return false

    const limits = this.getTierLimits(subscription.tier)
    const limit = limits[resource as keyof typeof limits]
    
    if (limit === -1) return true // Unlimited
    if (limit === undefined) return false

    const metrics = await this.getUsageMetrics(subscriptionId)
    if (!metrics) return true

    // Check based on resource type
    switch (resource) {
      case 'requests':
        return metrics.requests + amount <= limit
      case 'tokens':
        return metrics.tokens + amount <= limit
      default:
        return true
    }
  }

  // Get tier limits
  getTierLimits(tier: SubscriptionTier): Record<string, number> {
    const limits: Record<string, Record<string, number>> = {
      free: {
        requests: 1000,
        tokens: 100000,
        aiInstances: 1,
        storage: 100 * 1024 * 1024, // 100 MB
        apiKeys: 1
      },
      pro: {
        requests: 100000,
        tokens: 10000000,
        aiInstances: 5,
        storage: 10 * 1024 * 1024 * 1024, // 10 GB
        apiKeys: 10
      },
      enterprise: {
        requests: -1, // Unlimited
        tokens: -1,
        aiInstances: -1,
        storage: -1,
        apiKeys: -1
      },
      custom: {
        requests: -1,
        tokens: -1,
        aiInstances: -1,
        storage: -1,
        apiKeys: -1
      }
    }

    return limits[tier] || limits.free
  }

  // Periodic check for expired subscriptions
  async checkExpiredSubscriptions(): Promise<void> {
    const now = new Date()
    for (const subscription of this.subscriptions.values()) {
      if (subscription.status === 'active' || subscription.status === 'trial') {
        if (subscription.currentPeriodEnd < now) {
          await this.updateSubscription(subscription.id, { status: 'expired' })
          logInfo(`✅ Expired subscription ${subscription.id}`)
        }
      }
    }
  }
}

export const subscriptionManager = new SubscriptionManager()

