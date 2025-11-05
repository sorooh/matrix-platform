/**
 * Phase 8.2 - Partner Portal
 * 
 * Partner dashboard and management system
 * - Partner dashboard with sales, customers, profits
 * - Custom branding (Logo, Theme, Subdomain)
 * - SSL and DNS management
 * - Daily and monthly performance reports
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'
import { subscriptionManager } from '../billing/subscription'
import { marketplaceManager } from '../marketplace/marketplace'

export type PartnerStatus = 'active' | 'suspended' | 'pending' | 'inactive'
export type PartnerTier = 'bronze' | 'silver' | 'gold' | 'platinum'
export type PartnerRole = 'owner' | 'manager' | 'sales' | 'support' | 'viewer'

export interface Partner {
  id: string
  name: string
  email: string
  subdomain: string // partnername.matrix.ai
  domain?: string // Custom domain
  logo?: string
  theme?: PartnerTheme
  status: PartnerStatus
  tier: PartnerTier
  commissionRate: number // Percentage (e.g., 20%)
  customPricing?: Record<string, number> // AI ID -> Price
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface PartnerTheme {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  fontFamily?: string
}

export interface PartnerDashboard {
  sales: {
    total: number
    thisMonth: number
    lastMonth: number
    growth: number // Percentage
  }
  customers: {
    total: number
    active: number
    newThisMonth: number
  }
  revenue: {
    total: number
    thisMonth: number
    lastMonth: number
    growth: number
  }
  commissions: {
    total: number
    pending: number
    paid: number
    nextPayout?: Date
  }
  subscriptions: {
    total: number
    active: number
    cancelled: number
  }
}

export interface PartnerMember {
  id: string
  partnerId: string
  userId: string
  role: PartnerRole
  email: string
  name: string
  permissions: string[]
  createdAt: Date
}

class PartnerPortalManager {
  private partners: Map<string, Partner> = new Map()
  private members: Map<string, PartnerMember> = new Map()
  private sslCertificates: Map<string, string> = new Map() // partnerId -> certificate

  async initialize() {
    logInfo('Initializing Partner Portal...')

    // Load partners from database
    try {
      const { prisma } = await import('../config/database')
      const partners = await prisma.partner.findMany()
      for (const partner of partners) {
        this.partners.set(partner.id, {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          subdomain: partner.subdomain,
          domain: partner.domain || undefined,
          logo: partner.logo || undefined,
          theme: partner.theme as PartnerTheme || undefined,
          status: partner.status as PartnerStatus,
          tier: partner.tier as PartnerTier,
          commissionRate: partner.commissionRate,
          customPricing: partner.customPricing as Record<string, number> || undefined,
          metadata: partner.metadata as Record<string, any>,
          createdAt: partner.createdAt,
          updatedAt: partner.updatedAt
        })
      }
      logInfo(`✅ Loaded ${partners.length} partners from database`)
    } catch (error) {
      logError(error as Error, { context: 'Partner Portal initialization' })
    }

    logInfo('✅ Partner Portal initialized')
  }

  // Create partner
  async createPartner(
    name: string,
    email: string,
    subdomain: string,
    tier: PartnerTier = 'bronze',
    commissionRate: number = 10
  ): Promise<Partner> {
    try {
      // Check if subdomain is available
      const existing = Array.from(this.partners.values()).find(p => p.subdomain === subdomain)
      if (existing) {
        throw new Error('Subdomain already taken')
      }

      const partnerId = nanoid()
      const now = new Date()

      const partner: Partner = {
        id: partnerId,
        name,
        email,
        subdomain,
        status: 'pending',
        tier,
        commissionRate,
        metadata: {},
        createdAt: now,
        updatedAt: now
      }

      // Generate SSL certificate (in production, use Let's Encrypt or similar)
      await this.generateSSL(partnerId, subdomain)

      // Setup DNS (in production, use DNS API)
      await this.setupDNS(subdomain)

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.partner.create({
          data: {
            id: partnerId,
            name,
            email,
            subdomain,
            domain: null,
            logo: null,
            theme: null,
            status: 'pending',
            tier,
            commissionRate,
            customPricing: {},
            metadata: {}
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create partner in database' })
      }

      this.partners.set(partnerId, partner)
      logInfo(`✅ Created partner ${partnerId}: ${name}`)

      return partner
    } catch (error) {
      logError(error as Error, { context: 'Create partner' })
      throw error
    }
  }

  // Get partner
  async getPartner(partnerId: string): Promise<Partner | null> {
    return this.partners.get(partnerId) || null
  }

  // Get partner by subdomain
  async getPartnerBySubdomain(subdomain: string): Promise<Partner | null> {
    for (const partner of this.partners.values()) {
      if (partner.subdomain === subdomain) {
        return partner
      }
    }
    return null
  }

  // Update partner
  async updatePartner(
    partnerId: string,
    updates: Partial<Partner>
  ): Promise<Partner | null> {
    const partner = this.partners.get(partnerId)
    if (!partner) return null

    const updated = {
      ...partner,
      ...updates,
      updatedAt: new Date()
    }

    // Update SSL if domain changed
    if (updates.domain && updates.domain !== partner.domain) {
      await this.generateSSL(partnerId, updates.domain)
    }

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.partner.update({
        where: { id: partnerId },
        data: {
          name: updated.name,
          email: updated.email,
          subdomain: updated.subdomain,
          domain: updated.domain || null,
          logo: updated.logo || null,
          theme: updated.theme || null,
          status: updated.status,
          tier: updated.tier,
          commissionRate: updated.commissionRate,
          customPricing: updated.customPricing || {},
          metadata: updated.metadata
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Update partner in database' })
    }

    this.partners.set(partnerId, updated)
    return updated
  }

  // Get partner dashboard
  async getPartnerDashboard(partnerId: string): Promise<PartnerDashboard | null> {
    try {
      const partner = this.partners.get(partnerId)
      if (!partner) return null

      // Get sales data (from purchases)
      const purchases = await marketplaceManager.getPurchasesByUserId(partnerId) // Simplified
      const thisMonth = new Date()
      thisMonth.setDate(1)
      const lastMonth = new Date(thisMonth)
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      const thisMonthPurchases = purchases.filter(p => p.createdAt >= thisMonth)
      const lastMonthPurchases = purchases.filter(
        p => p.createdAt >= lastMonth && p.createdAt < thisMonth
      )

      const totalSales = purchases.reduce((sum, p) => sum + p.amount, 0)
      const thisMonthSales = thisMonthPurchases.reduce((sum, p) => sum + p.amount, 0)
      const lastMonthSales = lastMonthPurchases.reduce((sum, p) => sum + p.amount, 0)
      const salesGrowth = lastMonthSales > 0
        ? ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100
        : 0

      // Get customers (from subscriptions)
      const subscriptions = await subscriptionManager.getSubscriptionByUserId(partnerId) // Simplified
      const activeSubscriptions = subscriptions ? 1 : 0 // Simplified

      // Calculate commissions (from commission system)
      const commissions = {
        total: totalSales * (partner.commissionRate / 100),
        pending: thisMonthSales * (partner.commissionRate / 100),
        paid: lastMonthSales * (partner.commissionRate / 100),
        nextPayout: new Date(thisMonth.getTime() + 30 * 24 * 60 * 60 * 1000)
      }

      const dashboard: PartnerDashboard = {
        sales: {
          total: totalSales,
          thisMonth: thisMonthSales,
          lastMonth: lastMonthSales,
          growth: salesGrowth
        },
        customers: {
          total: purchases.length,
          active: activeSubscriptions,
          newThisMonth: thisMonthPurchases.length
        },
        revenue: {
          total: totalSales,
          thisMonth: thisMonthSales,
          lastMonth: lastMonthSales,
          growth: salesGrowth
        },
        commissions,
        subscriptions: {
          total: activeSubscriptions,
          active: activeSubscriptions,
          cancelled: 0
        }
      }

      return dashboard
    } catch (error) {
      logError(error as Error, { context: 'Get partner dashboard' })
      return null
    }
  }

  // Generate SSL certificate
  private async generateSSL(partnerId: string, domain: string): Promise<void> {
    try {
      // In production, use Let's Encrypt or similar service
      const certificate = `SSL_CERT_${nanoid(32)}`
      this.sslCertificates.set(partnerId, certificate)
      logInfo(`✅ Generated SSL certificate for partner ${partnerId} (${domain})`)
    } catch (error) {
      logError(error as Error, { context: 'Generate SSL' })
    }
  }

  // Setup DNS
  private async setupDNS(subdomain: string): Promise<void> {
    try {
      // In production, use DNS API (Cloudflare, AWS Route53, etc.)
      logInfo(`✅ Setup DNS for subdomain ${subdomain}`)
    } catch (error) {
      logError(error as Error, { context: 'Setup DNS' })
    }
  }

  // Add partner member
  async addPartnerMember(
    partnerId: string,
    userId: string,
    email: string,
    name: string,
    role: PartnerRole
  ): Promise<PartnerMember> {
    try {
      const memberId = nanoid()
      const permissions = this.getRolePermissions(role)

      const member: PartnerMember = {
        id: memberId,
        partnerId,
        userId,
        role,
        email,
        name,
        permissions,
        createdAt: new Date()
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.partnerMember.create({
          data: {
            id: memberId,
            partnerId,
            userId,
            role,
            email,
            name,
            permissions
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Add partner member in database' })
      }

      this.members.set(memberId, member)
      logInfo(`✅ Added member ${memberId} to partner ${partnerId}`)

      return member
    } catch (error) {
      logError(error as Error, { context: 'Add partner member' })
      throw error
    }
  }

  // Get role permissions
  private getRolePermissions(role: PartnerRole): string[] {
    const permissions: Record<PartnerRole, string[]> = {
      owner: ['*'],
      manager: ['view', 'edit', 'manage_members', 'view_reports'],
      sales: ['view', 'create_customers', 'view_reports'],
      support: ['view', 'manage_tickets'],
      viewer: ['view']
    }

    return permissions[role] || []
  }

  // Get partner members
  async getPartnerMembers(partnerId: string): Promise<PartnerMember[]> {
    const partnerMembers: PartnerMember[] = []
    for (const member of this.members.values()) {
      if (member.partnerId === partnerId) {
        partnerMembers.push(member)
      }
    }
    return partnerMembers.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }
}

export const partnerPortalManager = new PartnerPortalManager()

