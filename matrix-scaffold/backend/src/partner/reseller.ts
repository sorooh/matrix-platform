/**
 * Phase 8.2 - Reseller Management
 * 
 * Reseller account management system
 * - Create reseller accounts under partners
 * - Commission rate configuration
 * - Customer management per reseller
 * - Reseller performance reports
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'
import { subscriptionManager } from '../billing/subscription'
import { marketplaceManager } from '../marketplace/marketplace'

export type ResellerStatus = 'active' | 'suspended' | 'pending' | 'inactive'

export interface Reseller {
  id: string
  partnerId: string
  name: string
  email: string
  status: ResellerStatus
  commissionRate: number // Percentage
  customPricing?: Record<string, number>
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface ResellerCustomer {
  id: string
  resellerId: string
  userId: string
  email: string
  name: string
  subscriptionId?: string
  createdAt: Date
}

export interface ResellerReport {
  resellerId: string
  sales: {
    total: number
    thisMonth: number
    lastMonth: number
  }
  subscriptions: {
    total: number
    active: number
  }
  customers: {
    total: number
    active: number
    newThisMonth: number
  }
  commissions: {
    total: number
    pending: number
    paid: number
  }
}

class ResellerManager {
  private resellers: Map<string, Reseller> = new Map()
  private resellerCustomers: Map<string, ResellerCustomer> = new Map()

  async initialize() {
    logInfo('Initializing Reseller Management...')

    // Load resellers from database
    try {
      const { prisma } = await import('../config/database')
      const resellers = await prisma.reseller.findMany()
      for (const reseller of resellers) {
        this.resellers.set(reseller.id, {
          id: reseller.id,
          partnerId: reseller.partnerId,
          name: reseller.name,
          email: reseller.email,
          status: reseller.status as ResellerStatus,
          commissionRate: reseller.commissionRate,
          customPricing: reseller.customPricing as Record<string, number> || undefined,
          metadata: reseller.metadata as Record<string, any>,
          createdAt: reseller.createdAt,
          updatedAt: reseller.updatedAt
        })
      }
      logInfo(`✅ Loaded ${resellers.length} resellers from database`)
    } catch (error) {
      logError(error as Error, { context: 'Reseller initialization' })
    }

    logInfo('✅ Reseller Management initialized')
  }

  // Create reseller
  async createReseller(
    partnerId: string,
    name: string,
    email: string,
    commissionRate: number = 5
  ): Promise<Reseller> {
    try {
      const resellerId = nanoid()
      const now = new Date()

      const reseller: Reseller = {
        id: resellerId,
        partnerId,
        name,
        email,
        status: 'pending',
        commissionRate,
        metadata: {},
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.reseller.create({
          data: {
            id: resellerId,
            partnerId,
            name,
            email,
            status: 'pending',
            commissionRate,
            customPricing: {},
            metadata: {}
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create reseller in database' })
      }

      this.resellers.set(resellerId, reseller)
      logInfo(`✅ Created reseller ${resellerId} for partner ${partnerId}`)

      return reseller
    } catch (error) {
      logError(error as Error, { context: 'Create reseller' })
      throw error
    }
  }

  // Get reseller
  async getReseller(resellerId: string): Promise<Reseller | null> {
    return this.resellers.get(resellerId) || null
  }

  // Get resellers by partner
  async getResellersByPartner(partnerId: string): Promise<Reseller[]> {
    const partnerResellers: Reseller[] = []
    for (const reseller of this.resellers.values()) {
      if (reseller.partnerId === partnerId) {
        partnerResellers.push(reseller)
      }
    }
    return partnerResellers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Update reseller
  async updateReseller(
    resellerId: string,
    updates: Partial<Reseller>
  ): Promise<Reseller | null> {
    const reseller = this.resellers.get(resellerId)
    if (!reseller) return null

    const updated = {
      ...reseller,
      ...updates,
      updatedAt: new Date()
    }

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.reseller.update({
        where: { id: resellerId },
        data: {
          name: updated.name,
          email: updated.email,
          status: updated.status,
          commissionRate: updated.commissionRate,
          customPricing: updated.customPricing || {},
          metadata: updated.metadata
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Update reseller in database' })
    }

    this.resellers.set(resellerId, updated)
    return updated
  }

  // Add customer to reseller
  async addCustomer(
    resellerId: string,
    userId: string,
    email: string,
    name: string,
    subscriptionId?: string
  ): Promise<ResellerCustomer> {
    try {
      const customerId = nanoid()

      const customer: ResellerCustomer = {
        id: customerId,
        resellerId,
        userId,
        email,
        name,
        subscriptionId,
        createdAt: new Date()
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.resellerCustomer.create({
          data: {
            id: customerId,
            resellerId,
            userId,
            email,
            name,
            subscriptionId: subscriptionId || null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Add reseller customer in database' })
      }

      this.resellerCustomers.set(customerId, customer)
      logInfo(`✅ Added customer ${customerId} to reseller ${resellerId}`)

      return customer
    } catch (error) {
      logError(error as Error, { context: 'Add reseller customer' })
      throw error
    }
  }

  // Get customers by reseller
  async getCustomersByReseller(resellerId: string): Promise<ResellerCustomer[]> {
    const customers: ResellerCustomer[] = []
    for (const customer of this.resellerCustomers.values()) {
      if (customer.resellerId === resellerId) {
        customers.push(customer)
      }
    }
    return customers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Get reseller report
  async getResellerReport(resellerId: string): Promise<ResellerReport | null> {
    try {
      const reseller = this.resellers.get(resellerId)
      if (!reseller) return null

      const customers = await this.getCustomersByReseller(resellerId)
      const thisMonth = new Date()
      thisMonth.setDate(1)
      const lastMonth = new Date(thisMonth)
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      const newThisMonth = customers.filter(c => c.createdAt >= thisMonth).length

      // Get subscriptions (simplified)
      const activeSubscriptions = customers.filter(c => c.subscriptionId).length

      // Get sales (simplified - would get from actual purchases)
      const totalSales = 0 // Would calculate from actual purchases
      const thisMonthSales = 0
      const lastMonthSales = 0

      const commissions = {
        total: totalSales * (reseller.commissionRate / 100),
        pending: thisMonthSales * (reseller.commissionRate / 100),
        paid: lastMonthSales * (reseller.commissionRate / 100)
      }

      return {
        resellerId,
        sales: {
          total: totalSales,
          thisMonth: thisMonthSales,
          lastMonth: lastMonthSales
        },
        subscriptions: {
          total: customers.length,
          active: activeSubscriptions
        },
        customers: {
          total: customers.length,
          active: activeSubscriptions,
          newThisMonth
        },
        commissions
      }
    } catch (error) {
      logError(error as Error, { context: 'Get reseller report' })
      return null
    }
  }
}

export const resellerManager = new ResellerManager()

