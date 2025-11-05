/**
 * Phase 8.2 - Partner Billing & Commission System
 * 
 * Automatic commission calculation and payout system
 * - Calculate commissions per sale
 * - Integration with Stripe/PayPal for payouts
 * - Payout history and scheduling
 * - Commission reports
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'
import { paymentProviderManager } from '../billing/paymentProviders'
import { subscriptionManager } from '../billing/subscription'

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type CommissionType = 'sale' | 'subscription' | 'recurring'

export interface Commission {
  id: string
  partnerId: string
  resellerId?: string
  type: CommissionType
  amount: number
  currency: string
  percentage: number
  saleAmount: number
  status: PayoutStatus
  payoutId?: string
  saleId?: string
  subscriptionId?: string
  metadata: Record<string, any>
  createdAt: Date
  paidAt?: Date
}

export interface Payout {
  id: string
  partnerId: string
  amount: number
  currency: string
  status: PayoutStatus
  paymentProvider: 'stripe' | 'paypal'
  paymentMethodId: string
  commissions: string[] // Commission IDs
  scheduledAt: Date
  processedAt?: Date
  metadata: Record<string, any>
  createdAt: Date
}

class CommissionManager {
  private commissions: Map<string, Commission> = new Map()
  private payouts: Map<string, Payout> = new Map()

  async initialize() {
    logInfo('Initializing Partner Billing & Commission System...')

    // Load commissions from database
    try {
      const { prisma } = await import('../config/database')
      const commissions = await prisma.commission.findMany()
      for (const comm of commissions) {
        this.commissions.set(comm.id, {
          id: comm.id,
          partnerId: comm.partnerId,
          resellerId: comm.resellerId || undefined,
          type: comm.type as CommissionType,
          amount: comm.amount,
          currency: comm.currency,
          percentage: comm.percentage,
          saleAmount: comm.saleAmount,
          status: comm.status as PayoutStatus,
          payoutId: comm.payoutId || undefined,
          saleId: comm.saleId || undefined,
          subscriptionId: comm.subscriptionId || undefined,
          metadata: comm.metadata as Record<string, any>,
          createdAt: comm.createdAt,
          paidAt: comm.paidAt || undefined
        })
      }
      logInfo(`✅ Loaded ${commissions.length} commissions from database`)
    } catch (error) {
      logError(error as Error, { context: 'Commission initialization' })
    }

    logInfo('✅ Partner Billing & Commission System initialized')
  }

  // Calculate and create commission
  async createCommission(
    partnerId: string,
    saleAmount: number,
    currency: string,
    type: CommissionType,
    resellerId?: string,
    saleId?: string,
    subscriptionId?: string
  ): Promise<Commission> {
    try {
      // Get partner commission rate
      const { partnerPortalManager } = await import('./partnerPortal')
      const partner = await partnerPortalManager.getPartner(partnerId)
      if (!partner) {
        throw new Error('Partner not found')
      }

      let commissionRate = partner.commissionRate

      // If reseller, calculate reseller commission and partner commission
      if (resellerId) {
        const { resellerManager } = await import('./reseller')
        const reseller = await resellerManager.getReseller(resellerId)
        if (reseller) {
          // Partner gets partner rate, reseller gets reseller rate
          commissionRate = partner.commissionRate - reseller.commissionRate
        }
      }

      const commissionId = nanoid()
      const commissionAmount = saleAmount * (commissionRate / 100)

      const commission: Commission = {
        id: commissionId,
        partnerId,
        resellerId,
        type,
        amount: commissionAmount,
        currency,
        percentage: commissionRate,
        saleAmount,
        status: 'pending',
        saleId,
        subscriptionId,
        metadata: {},
        createdAt: new Date()
      }

      // If reseller, create reseller commission too
      if (resellerId) {
        const { resellerManager } = await import('./reseller')
        const reseller = await resellerManager.getReseller(resellerId)
        if (reseller) {
          const resellerCommission = saleAmount * (reseller.commissionRate / 100)
          await this.createCommission(
            partnerId,
            saleAmount,
            currency,
            type,
            undefined,
            saleId,
            subscriptionId
          )
          // Store reseller commission separately
        }
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.commission.create({
          data: {
            id: commissionId,
            partnerId,
            resellerId: resellerId || null,
            type,
            amount: commissionAmount,
            currency,
            percentage: commissionRate,
            saleAmount,
            status: 'pending',
            saleId: saleId || null,
            subscriptionId: subscriptionId || null,
            metadata: {}
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create commission in database' })
      }

      this.commissions.set(commissionId, commission)
      logInfo(`✅ Created commission ${commissionId} for partner ${partnerId}`)

      return commission
    } catch (error) {
      logError(error as Error, { context: 'Create commission' })
      throw error
    }
  }

  // Get commissions by partner
  async getCommissionsByPartner(
    partnerId: string,
    status?: PayoutStatus
  ): Promise<Commission[]> {
    const partnerCommissions: Commission[] = []
    for (const commission of this.commissions.values()) {
      if (commission.partnerId === partnerId) {
        if (status && commission.status !== status) continue
        partnerCommissions.push(commission)
      }
    }
    return partnerCommissions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Create payout
  async createPayout(
    partnerId: string,
    paymentProvider: 'stripe' | 'paypal',
    paymentMethodId: string,
    scheduledAt?: Date
  ): Promise<Payout> {
    try {
      // Get pending commissions
      const pendingCommissions = await this.getCommissionsByPartner(partnerId, 'pending')
      if (pendingCommissions.length === 0) {
        throw new Error('No pending commissions')
      }

      const payoutId = nanoid()
      const totalAmount = pendingCommissions.reduce((sum, c) => sum + c.amount, 0)
      const currency = pendingCommissions[0]?.currency || 'USD'
      const now = new Date()

      const payout: Payout = {
        id: payoutId,
        partnerId,
        amount: totalAmount,
        currency,
        status: 'pending',
        paymentProvider,
        paymentMethodId,
        commissions: pendingCommissions.map(c => c.id),
        scheduledAt: scheduledAt || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
        metadata: {},
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.payout.create({
          data: {
            id: payoutId,
            partnerId,
            amount: totalAmount,
            currency,
            status: 'pending',
            paymentProvider,
            paymentMethodId,
            commissions: pendingCommissions.map(c => c.id),
            scheduledAt: payout.scheduledAt,
            metadata: {}
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create payout in database' })
      }

      this.payouts.set(payoutId, payout)

      // Update commissions status
      for (const commission of pendingCommissions) {
        commission.status = 'processing'
        commission.payoutId = payoutId
        this.commissions.set(commission.id, commission)
      }

      logInfo(`✅ Created payout ${payoutId} for partner ${partnerId}`)

      return payout
    } catch (error) {
      logError(error as Error, { context: 'Create payout' })
      throw error
    }
  }

  // Process payout
  async processPayout(payoutId: string): Promise<boolean> {
    try {
      const payout = this.payouts.get(payoutId)
      if (!payout) return false

      // Process payment through provider
      const paymentIntent = await paymentProviderManager.createPaymentIntent(
        payout.paymentProvider,
        payout.amount,
        payout.currency,
        { type: 'payout', partnerId: payout.partnerId }
      )

      // Update payout status
      payout.status = 'processing'
      payout.processedAt = new Date()

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.payout.update({
          where: { id: payoutId },
          data: {
            status: 'processing',
            processedAt: payout.processedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Process payout in database' })
      }

      this.payouts.set(payoutId, payout)

      // Update commissions
      for (const commissionId of payout.commissions) {
        const commission = this.commissions.get(commissionId)
        if (commission) {
          commission.status = 'processing'
          commission.paidAt = new Date()
          this.commissions.set(commissionId, commission)
        }
      }

      logInfo(`✅ Processing payout ${payoutId}`)
      return true
    } catch (error) {
      logError(error as Error, { context: 'Process payout' })
      return false
    }
  }

  // Complete payout
  async completePayout(payoutId: string): Promise<boolean> {
    try {
      const payout = this.payouts.get(payoutId)
      if (!payout) return false

      payout.status = 'completed'

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.payout.update({
          where: { id: payoutId },
          data: { status: 'completed' }
        })
      } catch (error) {
        logError(error as Error, { context: 'Complete payout in database' })
      }

      // Update commissions
      for (const commissionId of payout.commissions) {
        const commission = this.commissions.get(commissionId)
        if (commission) {
          commission.status = 'completed'
          this.commissions.set(commissionId, commission)
        }
      }

      this.payouts.set(payoutId, payout)
      logInfo(`✅ Completed payout ${payoutId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Complete payout' })
      return false
    }
  }

  // Get payouts by partner
  async getPayoutsByPartner(partnerId: string): Promise<Payout[]> {
    const partnerPayouts: Payout[] = []
    for (const payout of this.payouts.values()) {
      if (payout.partnerId === partnerId) {
        partnerPayouts.push(payout)
      }
    }
    return partnerPayouts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Get commission summary
  async getCommissionSummary(partnerId: string): Promise<{
    total: number
    pending: number
    processing: number
    completed: number
    nextPayout?: Date
  }> {
    const commissions = await this.getCommissionsByPartner(partnerId)
    const pending = commissions.filter(c => c.status === 'pending')
    const processing = commissions.filter(c => c.status === 'processing')
    const completed = commissions.filter(c => c.status === 'completed')

    const pendingAmount = pending.reduce((sum, c) => sum + c.amount, 0)
    const processingAmount = processing.reduce((sum, c) => sum + c.amount, 0)
    const completedAmount = completed.reduce((sum, c) => sum + c.amount, 0)

    // Get next scheduled payout
    const payouts = await this.getPayoutsByPartner(partnerId)
    const nextPayout = payouts
      .filter(p => p.status === 'pending' || p.status === 'processing')
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0]

    return {
      total: pendingAmount + processingAmount + completedAmount,
      pending: pendingAmount,
      processing: processingAmount,
      completed: completedAmount,
      nextPayout: nextPayout?.scheduledAt
    }
  }
}

export const commissionManager = new CommissionManager()

