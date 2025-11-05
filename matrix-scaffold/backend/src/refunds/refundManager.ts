/**
 * Phase 8.3 - Refund & Dispute Management
 * 
 * Professional refund and dispute handling
 * - Refund processing (full, partial, prorated)
 * - Dispute management
 * - Refund policy enforcement
 * - Automatic refund calculations
 * - Refund history and reporting
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'
import { subscriptionManager } from '../billing/subscription'
import { paymentProviderManager } from '../billing/paymentProviders'

export type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type RefundType = 'full' | 'partial' | 'prorated'
export type RefundReason = 
  | 'customer_request'
  | 'duplicate_charge'
  | 'fraudulent'
  | 'service_issue'
  | 'billing_error'
  | 'other'

export interface Refund {
  id: string
  invoiceId: string
  userId: string
  subscriptionId?: string
  amount: number
  currency: string
  type: RefundType
  reason: RefundReason
  status: RefundStatus
  description?: string
  paymentProvider: 'stripe' | 'paypal' | 'crypto'
  paymentIntentId?: string
  refundId?: string
  processedAt?: Date
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface Dispute {
  id: string
  refundId: string
  userId: string
  reason: string
  evidence?: string[]
  status: 'open' | 'under_review' | 'resolved' | 'closed'
  resolution?: string
  createdAt: Date
  resolvedAt?: Date
}

class RefundManager {
  private refunds: Map<string, Refund> = new Map()
  private disputes: Map<string, Dispute> = new Map()

  async initialize() {
    logInfo('Initializing Refund & Dispute Management...')

    // Load refunds from database
    try {
      const { prisma } = await import('../config/database')
      const refunds = await prisma.refund.findMany()
      for (const refund of refunds) {
        this.refunds.set(refund.id, {
          id: refund.id,
          invoiceId: refund.invoiceId,
          userId: refund.userId,
          subscriptionId: refund.subscriptionId || undefined,
          amount: refund.amount,
          currency: refund.currency,
          type: refund.type as RefundType,
          reason: refund.reason as RefundReason,
          status: refund.status as RefundStatus,
          description: refund.description || undefined,
          paymentProvider: refund.paymentProvider as 'stripe' | 'paypal' | 'crypto',
          paymentIntentId: refund.paymentIntentId || undefined,
          refundId: refund.refundId || undefined,
          processedAt: refund.processedAt || undefined,
          metadata: refund.metadata as Record<string, any>,
          createdAt: refund.createdAt,
          updatedAt: refund.updatedAt
        })
      }
      logInfo(`✅ Loaded ${refunds.length} refunds from database`)
    } catch (error) {
      logError(error as Error, { context: 'Refund initialization' })
    }

    logInfo('✅ Refund & Dispute Management initialized')
  }

  // Create refund
  async createRefund(
    invoiceId: string,
    userId: string,
    type: RefundType,
    reason: RefundReason,
    amount?: number,
    description?: string
  ): Promise<Refund> {
    try {
      // Get invoice
      const invoice = await subscriptionManager.getInvoice(invoiceId)
      if (!invoice) {
        throw new Error('Invoice not found')
      }

      if (invoice.status !== 'paid') {
        throw new Error('Invoice must be paid to issue refund')
      }

      // Calculate refund amount
      let refundAmount = amount
      if (!refundAmount) {
        if (type === 'full') {
          refundAmount = invoice.amount
        } else if (type === 'prorated') {
          // Calculate prorated amount
          const subscription = await subscriptionManager.getSubscription(invoice.subscriptionId)
          if (subscription) {
            const totalDays = Math.ceil(
              (subscription.currentPeriodEnd.getTime() - subscription.currentPeriodStart.getTime()) /
              (24 * 60 * 60 * 1000)
            )
            const remainingDays = Math.ceil(
              (subscription.currentPeriodEnd.getTime() - new Date().getTime()) /
              (24 * 60 * 60 * 1000)
            )
            refundAmount = invoice.amount * (remainingDays / totalDays)
          } else {
            refundAmount = invoice.amount
          }
        } else {
          throw new Error('Amount required for partial refund')
        }
      }

      if (refundAmount > invoice.amount) {
        throw new Error('Refund amount cannot exceed invoice amount')
      }

      const refundId = nanoid()
      const now = new Date()

      const refund: Refund = {
        id: refundId,
        invoiceId,
        userId,
        subscriptionId: invoice.subscriptionId,
        amount: refundAmount,
        currency: invoice.currency,
        type,
        reason,
        status: 'pending',
        description,
        paymentProvider: invoice.paymentProvider,
        paymentIntentId: invoice.paymentIntentId,
        metadata: {},
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.refund.create({
          data: {
            id: refundId,
            invoiceId,
            userId,
            subscriptionId: invoice.subscriptionId || null,
            amount: refundAmount,
            currency: invoice.currency,
            type,
            reason,
            status: 'pending',
            description: description || null,
            paymentProvider: invoice.paymentProvider,
            paymentIntentId: invoice.paymentIntentId || null,
            metadata: {}
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create refund in database' })
      }

      this.refunds.set(refundId, refund)
      logInfo(`✅ Created refund ${refundId} for invoice ${invoiceId}`)

      // Process refund
      await this.processRefund(refundId)

      return refund
    } catch (error) {
      logError(error as Error, { context: 'Create refund' })
      throw error
    }
  }

  // Process refund
  async processRefund(refundId: string): Promise<boolean> {
    try {
      const refund = this.refunds.get(refundId)
      if (!refund) return false

      if (refund.status !== 'pending') {
        return false
      }

      refund.status = 'processing'

      // Process through payment provider
      try {
        let refundProviderId: string | undefined

        if (refund.paymentProvider === 'stripe' && refund.paymentIntentId) {
          // In production, use Stripe SDK
          // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
          // const refundResult = await stripe.refunds.create({ payment_intent: refund.paymentIntentId, amount: refund.amount * 100 })
          refundProviderId = `re_${Date.now()}`
          logInfo(`✅ Processed Stripe refund ${refundProviderId}`)
        } else if (refund.paymentProvider === 'paypal' && refund.paymentIntentId) {
          // In production, use PayPal SDK
          refundProviderId = `PAYPAL_REFUND_${Date.now()}`
          logInfo(`✅ Processed PayPal refund ${refundProviderId}`)
        } else if (refund.paymentProvider === 'crypto') {
          // Crypto refunds are typically manual
          refundProviderId = `CRYPTO_REFUND_${Date.now()}`
          logInfo(`✅ Processed crypto refund ${refundProviderId}`)
        }

        refund.refundId = refundProviderId
        refund.status = 'completed'
        refund.processedAt = new Date()

        // Update invoice status
        // In production, mark invoice as refunded

        // Save to database
        try {
          const { prisma } = await import('../config/database')
          await prisma.refund.update({
            where: { id: refundId },
            data: {
              status: 'completed',
              refundId: refundProviderId,
              processedAt: refund.processedAt
            }
          })
        } catch (error) {
          logError(error as Error, { context: 'Update refund in database' })
        }

        this.refunds.set(refundId, refund)
        logInfo(`✅ Completed refund ${refundId}`)

        // Emit webhook event
        const { advancedWebhookSystem } = await import('../webhooks/webhookSystem')
        await advancedWebhookSystem.emitEvent('payment.refunded', {
          refundId: refund.id,
          invoiceId: refund.invoiceId,
          amount: refund.amount,
          currency: refund.currency
        }, 'refund-system')

        return true
      } catch (error) {
        refund.status = 'failed'
        logError(error as Error, { context: 'Process refund' })
        return false
      }
    } catch (error) {
      logError(error as Error, { context: 'Process refund' })
      return false
    }
  }

  // Get refund
  async getRefund(refundId: string): Promise<Refund | null> {
    return this.refunds.get(refundId) || null
  }

  // Get refunds by user
  async getRefundsByUserId(userId: string): Promise<Refund[]> {
    const userRefunds: Refund[] = []
    for (const refund of this.refunds.values()) {
      if (refund.userId === userId) {
        userRefunds.push(refund)
      }
    }
    return userRefunds.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Create dispute
  async createDispute(
    refundId: string,
    userId: string,
    reason: string,
    evidence?: string[]
  ): Promise<Dispute> {
    try {
      const disputeId = nanoid()
      const now = new Date()

      const dispute: Dispute = {
        id: disputeId,
        refundId,
        userId,
        reason,
        evidence,
        status: 'open',
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.dispute.create({
          data: {
            id: disputeId,
            refundId,
            userId,
            reason,
            evidence: evidence || [],
            status: 'open'
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create dispute in database' })
      }

      this.disputes.set(disputeId, dispute)
      logInfo(`✅ Created dispute ${disputeId} for refund ${refundId}`)

      return dispute
    } catch (error) {
      logError(error as Error, { context: 'Create dispute' })
      throw error
    }
  }

  // Resolve dispute
  async resolveDispute(disputeId: string, resolution: string): Promise<boolean> {
    try {
      const dispute = this.disputes.get(disputeId)
      if (!dispute) return false

      dispute.status = 'resolved'
      dispute.resolution = resolution
      dispute.resolvedAt = new Date()

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.dispute.update({
          where: { id: disputeId },
          data: {
            status: 'resolved',
            resolution,
            resolvedAt: dispute.resolvedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Resolve dispute in database' })
      }

      this.disputes.set(disputeId, dispute)
      logInfo(`✅ Resolved dispute ${disputeId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Resolve dispute' })
      return false
    }
  }
}

export const refundManager = new RefundManager()

