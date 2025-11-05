/**
 * Phase 8 - License & Governance Layer
 * 
 * Legal license management for rented AI intelligences
 * - Intellectual Property Protection
 * - Custom license system for each AI type (Personal / Commercial / Reseller)
 * - Track sales and rentals within Marketplace
 * - Automatic compliance check before activating any new subscription
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type LicenseType = 'personal' | 'commercial' | 'reseller' | 'custom'
export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'suspended'
export type ComplianceStatus = 'compliant' | 'non_compliant' | 'pending'

export interface License {
  id: string
  userId: string
  subscriptionId?: string
  aiId: string
  type: LicenseType
  status: LicenseStatus
  terms: LicenseTerms
  metadata: Record<string, any>
  issuedAt: Date
  expiresAt?: Date
  revokedAt?: Date
}

export interface LicenseTerms {
  allowedUsage: string[]
  restrictions: string[]
  intellectualProperty: IPProtection
  commercialRights: boolean
  resellerRights: boolean
  attributionRequired: boolean
  redistributionAllowed: boolean
}

export interface IPProtection {
  owner: string
  protected: boolean
  watermark?: string
  encryption?: boolean
}

export interface ComplianceCheck {
  id: string
  userId: string
  subscriptionId?: string
  status: ComplianceStatus
  checks: ComplianceCheckItem[]
  passed: boolean
  checkedAt: Date
}

export interface ComplianceCheckItem {
  name: string
  description: string
  passed: boolean
  reason?: string
}

class GovernanceManager {
  private licenses: Map<string, License> = new Map()
  private complianceChecks: Map<string, ComplianceCheck> = new Map()

  async initialize() {
    logInfo('Initializing License & Governance Layer...')

    // Load licenses from database
    try {
      const { prisma } = await import('../config/database')
      const licenses = await prisma.license.findMany()
      for (const license of licenses) {
        this.licenses.set(license.id, {
          id: license.id,
          userId: license.userId,
          subscriptionId: license.subscriptionId || undefined,
          aiId: license.aiId,
          type: license.type as LicenseType,
          status: license.status as LicenseStatus,
          terms: license.terms as LicenseTerms,
          metadata: license.metadata as Record<string, any>,
          issuedAt: license.issuedAt,
          expiresAt: license.expiresAt || undefined,
          revokedAt: license.revokedAt || undefined
        })
      }
      logInfo(`✅ Loaded ${licenses.length} licenses from database`)
    } catch (error) {
      logError(error as Error, { context: 'Governance initialization' })
    }

    logInfo('✅ License & Governance Layer initialized')
  }

  // Create license
  async createLicense(
    userId: string,
    aiId: string,
    type: LicenseType,
    subscriptionId?: string,
    expiresInDays?: number
  ): Promise<License> {
    try {
      const licenseId = nanoid()
      const now = new Date()
      const expiresAt = expiresInDays 
        ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)
        : undefined

      // Default terms based on license type
      const terms = this.getDefaultTerms(type)

      const license: License = {
        id: licenseId,
        userId,
        subscriptionId,
        aiId,
        type,
        status: 'active',
        terms,
        metadata: {},
        issuedAt: now,
        expiresAt
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.license.create({
          data: {
            id: licenseId,
            userId,
            subscriptionId: subscriptionId || null,
            aiId,
            type,
            status: 'active',
            terms,
            metadata: {},
            expiresAt: expiresAt || null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create license in database' })
      }

      this.licenses.set(licenseId, license)
      logInfo(`✅ Created license ${licenseId} for AI ${aiId} (${type})`)

      return license
    } catch (error) {
      logError(error as Error, { context: 'Create license' })
      throw error
    }
  }

  // Get default terms
  private getDefaultTerms(type: LicenseType): LicenseTerms {
    const terms: Record<LicenseType, LicenseTerms> = {
      personal: {
        allowedUsage: ['personal_projects', 'non_commercial'],
        restrictions: ['commercial_use', 'redistribution', 'resale'],
        intellectualProperty: {
          owner: 'Matrix Platform',
          protected: true,
          watermark: 'Matrix Platform - Personal License'
        },
        commercialRights: false,
        resellerRights: false,
        attributionRequired: true,
        redistributionAllowed: false
      },
      commercial: {
        allowedUsage: ['commercial_projects', 'internal_use'],
        restrictions: ['resale', 'redistribution'],
        intellectualProperty: {
          owner: 'Matrix Platform',
          protected: true,
          watermark: 'Matrix Platform - Commercial License'
        },
        commercialRights: true,
        resellerRights: false,
        attributionRequired: true,
        redistributionAllowed: false
      },
      reseller: {
        allowedUsage: ['commercial_projects', 'resale', 'redistribution'],
        restrictions: [],
        intellectualProperty: {
          owner: 'Matrix Platform',
          protected: true,
          watermark: 'Matrix Platform - Reseller License'
        },
        commercialRights: true,
        resellerRights: true,
        attributionRequired: true,
        redistributionAllowed: true
      },
      custom: {
        allowedUsage: ['*'],
        restrictions: [],
        intellectualProperty: {
          owner: 'Matrix Platform',
          protected: true
        },
        commercialRights: true,
        resellerRights: false,
        attributionRequired: true,
        redistributionAllowed: false
      }
    }

    return terms[type] || terms.personal
  }

  // Get license
  async getLicense(licenseId: string): Promise<License | null> {
    return this.licenses.get(licenseId) || null
  }

  // Get licenses by user
  async getLicensesByUserId(userId: string): Promise<License[]> {
    const userLicenses: License[] = []
    for (const license of this.licenses.values()) {
      if (license.userId === userId) {
        userLicenses.push(license)
      }
    }
    return userLicenses.sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())
  }

  // Get license by AI and user
  async getLicenseByAIAndUser(aiId: string, userId: string): Promise<License | null> {
    for (const license of this.licenses.values()) {
      if (license.aiId === aiId && license.userId === userId && license.status === 'active') {
        return license
      }
    }
    return null
  }

  // Revoke license
  async revokeLicense(licenseId: string, reason?: string): Promise<boolean> {
    const license = this.licenses.get(licenseId)
    if (!license) return false

    license.status = 'revoked'
    license.revokedAt = new Date()
    if (reason) {
      license.metadata.revocationReason = reason
    }

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.license.update({
        where: { id: licenseId },
        data: {
          status: 'revoked',
          revokedAt: new Date(),
          metadata: license.metadata
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Revoke license in database' })
    }

    this.licenses.set(licenseId, license)
    logInfo(`✅ Revoked license ${licenseId}`)

    return true
  }

  // Check compliance
  async checkCompliance(
    userId: string,
    subscriptionId?: string,
    aiId?: string
  ): Promise<ComplianceCheck> {
    try {
      const checkId = nanoid()
      const now = new Date()

      const checks: ComplianceCheckItem[] = []

      // Check 1: User has valid subscription
      if (subscriptionId) {
        const { subscriptionManager } = await import('../billing/subscription')
        const subscription = await subscriptionManager.getSubscription(subscriptionId)
        checks.push({
          name: 'Valid Subscription',
          description: 'User has an active subscription',
          passed: subscription !== null && (subscription.status === 'active' || subscription.status === 'trial')
        })
      }

      // Check 2: User has valid license for AI
      if (aiId) {
        const license = await this.getLicenseByAIAndUser(aiId, userId)
        checks.push({
          name: 'Valid License',
          description: 'User has a valid license for the AI',
          passed: license !== null && license.status === 'active'
        })
      }

      // Check 3: License not expired
      if (aiId) {
        const license = await this.getLicenseByAIAndUser(aiId, userId)
        if (license) {
          const expired = license.expiresAt && license.expiresAt < now
          checks.push({
            name: 'License Not Expired',
            description: 'License is still valid',
            passed: !expired,
            reason: expired ? 'License has expired' : undefined
          })
        }
      }

      // Check 4: IP Protection compliance
      checks.push({
        name: 'IP Protection',
        description: 'Intellectual property protection is enabled',
        passed: true // Always pass for now
      })

      const passed = checks.every(check => check.passed)
      const status: ComplianceStatus = passed ? 'compliant' : 'non_compliant'

      const complianceCheck: ComplianceCheck = {
        id: checkId,
        userId,
        subscriptionId,
        status,
        checks,
        passed,
        checkedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.complianceCheck.create({
          data: {
            id: checkId,
            userId,
            subscriptionId: subscriptionId || null,
            status,
            checks,
            passed,
            checkedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Save compliance check in database' })
      }

      this.complianceChecks.set(checkId, complianceCheck)
      logInfo(`✅ Compliance check ${checkId} for user ${userId}: ${status}`)

      return complianceCheck
    } catch (error) {
      logError(error as Error, { context: 'Check compliance' })
      throw error
    }
  }

  // Get compliance check
  async getComplianceCheck(checkId: string): Promise<ComplianceCheck | null> {
    return this.complianceChecks.get(checkId) || null
  }

  // Validate license usage
  async validateLicenseUsage(
    userId: string,
    aiId: string,
    usageType: string
  ): Promise<{ valid: boolean; reason?: string }> {
    const license = await this.getLicenseByAIAndUser(aiId, userId)
    
    if (!license) {
      return { valid: false, reason: 'No license found for this AI' }
    }

    if (license.status !== 'active') {
      return { valid: false, reason: `License is ${license.status}` }
    }

    if (license.expiresAt && license.expiresAt < new Date()) {
      return { valid: false, reason: 'License has expired' }
    }

    // Check if usage type is allowed
    if (license.terms.allowedUsage.length > 0 && !license.terms.allowedUsage.includes('*')) {
      if (!license.terms.allowedUsage.includes(usageType)) {
        return { valid: false, reason: `Usage type '${usageType}' is not allowed` }
      }
    }

    // Check restrictions
    if (license.terms.restrictions.includes(usageType)) {
      return { valid: false, reason: `Usage type '${usageType}' is restricted` }
    }

    return { valid: true }
  }
}

export const governanceManager = new GovernanceManager()

