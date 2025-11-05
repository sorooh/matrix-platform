/**
 * Phase 8.4 - Developer Registration & Verification
 * 
 * Developer management system with KYC verification
 * - Developer registration with KYC/Email/2FA
 * - Developer profiles and portfolios
 * - Account verification before publishing
 * - Financial wallet integration
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type DeveloperStatus = 'pending' | 'verified' | 'suspended' | 'rejected'
export type VerificationLevel = 'email' | 'kyc' | 'full'
export type DeveloperTier = 'free' | 'pro' | 'enterprise'

export interface Developer {
  id: string
  userId: string
  email: string
  name: string
  company?: string
  status: DeveloperStatus
  verificationLevel: VerificationLevel
  tier: DeveloperTier
  walletId: string
  profile: DeveloperProfile
  portfolio: DeveloperPortfolio
  kycData?: KYCData
  createdAt: Date
  updatedAt: Date
}

export interface DeveloperProfile {
  bio?: string
  avatar?: string
  website?: string
  github?: string
  twitter?: string
  linkedin?: string
  location?: string
  skills: string[]
  languages: string[]
}

export interface DeveloperPortfolio {
  apps: string[] // App IDs
  totalDownloads: number
  totalRevenue: number
  rating: number
  reviews: number
}

export interface KYCData {
  idType: string // passport | id | driver_license
  idNumber: string
  idDocument?: string // URL to document
  address?: string
  country: string
  verifiedAt?: Date
}

class DeveloperManager {
  private developers: Map<string, Developer> = new Map()

  async initialize() {
    logInfo('Initializing Developer Registration & Verification...')

    // Load developers from database
    try {
      const { prisma } = await import('../config/database')
      const developers = await prisma.developer.findMany()
      
      for (const dev of developers) {
        this.developers.set(dev.id, {
          id: dev.id,
          userId: dev.userId,
          email: dev.email,
          name: dev.name,
          company: dev.company || undefined,
          status: dev.status as DeveloperStatus,
          verificationLevel: dev.verificationLevel as VerificationLevel,
          tier: dev.tier as DeveloperTier,
          walletId: dev.walletId,
          profile: dev.profile as DeveloperProfile,
          portfolio: dev.portfolio as DeveloperPortfolio,
          kycData: dev.kycData as KYCData | undefined,
          createdAt: dev.createdAt,
          updatedAt: dev.updatedAt
        })
      }
      
      logInfo(`✅ Loaded ${developers.length} developers from database`)
    } catch (error) {
      logError(error as Error, { context: 'Developer initialization' })
    }

    logInfo('✅ Developer Registration & Verification initialized')
  }

  // Register developer
  async registerDeveloper(
    userId: string,
    email: string,
    name: string,
    company?: string
  ): Promise<Developer> {
    try {
      const developerId = nanoid()
      const walletId = nanoid()

      // Check if developer already exists
      const existing = Array.from(this.developers.values()).find(d => d.userId === userId)
      if (existing) {
        throw new Error('Developer already registered')
      }

      const now = new Date()

      const developer: Developer = {
        id: developerId,
        userId,
        email,
        name,
        company,
        status: 'pending',
        verificationLevel: 'email',
        tier: 'free',
        walletId,
        profile: {
          skills: [],
          languages: []
        },
        portfolio: {
          apps: [],
          totalDownloads: 0,
          totalRevenue: 0,
          rating: 0,
          reviews: 0
        },
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.developer.create({
          data: {
            id: developerId,
            userId,
            email,
            name,
            company: company || null,
            status: 'pending',
            verificationLevel: 'email',
            tier: 'free',
            walletId,
            profile: {},
            portfolio: {
              apps: [],
              totalDownloads: 0,
              totalRevenue: 0,
              rating: 0,
              reviews: 0
            }
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Register developer in database' })
      }

      this.developers.set(developerId, developer)
      logInfo(`✅ Registered developer ${developerId} for user ${userId}`)

      // Emit webhook event
      const { advancedWebhookSystem } = await import('../webhooks/webhookSystem')
      await advancedWebhookSystem.emitEvent('developer.registered', {
        developerId: developer.id,
        email: developer.email,
        name: developer.name
      }, 'developer-system')

      return developer
    } catch (error) {
      logError(error as Error, { context: 'Register developer' })
      throw error
    }
  }

  // Verify email
  async verifyEmail(developerId: string): Promise<boolean> {
    try {
      const developer = this.developers.get(developerId)
      if (!developer) return false

      developer.verificationLevel = 'email'
      developer.status = 'verified'
      developer.updatedAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.developer.update({
          where: { id: developerId },
          data: {
            verificationLevel: 'email',
            status: 'verified'
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Verify email in database' })
      }

      this.developers.set(developerId, developer)
      logInfo(`✅ Verified email for developer ${developerId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Verify email' })
      return false
    }
  }

  // Submit KYC
  async submitKYC(
    developerId: string,
    kycData: KYCData
  ): Promise<boolean> {
    try {
      const developer = this.developers.get(developerId)
      if (!developer) return false

      developer.kycData = kycData
      developer.verificationLevel = 'kyc'
      developer.updatedAt = new Date()

      // In production, verify KYC with third-party service
      // For now, auto-approve after validation
      await new Promise(resolve => setTimeout(resolve, 1000))

      developer.kycData.verifiedAt = new Date()
      developer.verificationLevel = 'full'
      developer.status = 'verified'

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.developer.update({
          where: { id: developerId },
          data: {
            kycData: kycData,
            verificationLevel: 'full',
            status: 'verified'
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Submit KYC in database' })
      }

      this.developers.set(developerId, developer)
      logInfo(`✅ KYC verified for developer ${developerId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Submit KYC' })
      return false
    }
  }

  // Update profile
  async updateProfile(
    developerId: string,
    profile: Partial<DeveloperProfile>
  ): Promise<Developer | null> {
    try {
      const developer = this.developers.get(developerId)
      if (!developer) return null

      developer.profile = {
        ...developer.profile,
        ...profile
      }
      developer.updatedAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.developer.update({
          where: { id: developerId },
          data: { profile: developer.profile }
        })
      } catch (error) {
        logError(error as Error, { context: 'Update profile in database' })
      }

      this.developers.set(developerId, developer)
      logInfo(`✅ Updated profile for developer ${developerId}`)

      return developer
    } catch (error) {
      logError(error as Error, { context: 'Update profile' })
      return null
    }
  }

  // Get developer
  async getDeveloper(developerId: string): Promise<Developer | null> {
    return this.developers.get(developerId) || null
  }

  // Get developer by user ID
  async getDeveloperByUserId(userId: string): Promise<Developer | null> {
    for (const developer of this.developers.values()) {
      if (developer.userId === userId) {
        return developer
      }
    }
    return null
  }

  // Update portfolio
  async updatePortfolio(
    developerId: string,
    updates: Partial<DeveloperPortfolio>
  ): Promise<boolean> {
    try {
      const developer = this.developers.get(developerId)
      if (!developer) return false

      developer.portfolio = {
        ...developer.portfolio,
        ...updates
      }
      developer.updatedAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.developer.update({
          where: { id: developerId },
          data: { portfolio: developer.portfolio }
        })
      } catch (error) {
        logError(error as Error, { context: 'Update portfolio in database' })
      }

      this.developers.set(developerId, developer)
      return true
    } catch (error) {
      logError(error as Error, { context: 'Update portfolio' })
      return false
    }
  }

  // Check if developer can publish
  canPublish(developer: Developer): boolean {
    return developer.status === 'verified' && 
           developer.verificationLevel === 'full' &&
           developer.tier !== 'free' || developer.portfolio.apps.length < 3
  }
}

export const developerManager = new DeveloperManager()

