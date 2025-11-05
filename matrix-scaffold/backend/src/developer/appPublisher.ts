/**
 * Phase 8.4 - App Publishing & Licensing System
 * 
 * App publishing system with approval pipeline
 * - App upload and description
 * - Pricing and access level configuration
 * - License key management
 * - Usage tokens and tier-based access
 * - Open/closed source support
 * - Approval pipeline before public release
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type AppStatus = 'draft' | 'pending' | 'reviewing' | 'approved' | 'rejected' | 'published' | 'suspended'
export type AccessLevel = 'public' | 'private' | 'premium' | 'enterprise'
export type LicenseType = 'open_source' | 'closed_source' | 'commercial' | 'custom'
export type PricingModel = 'free' | 'one_time' | 'subscription' | 'usage_based' | 'freemium'

export interface App {
  id: string
  developerId: string
  name: string
  slug: string
  description: string
  longDescription?: string
  category: string
  tags: string[]
  version: string
  status: AppStatus
  accessLevel: AccessLevel
  licenseType: LicenseType
  pricing: Pricing
  sourceCode?: string // URL to source code
  repository?: string // GitHub/GitLab URL
  icon?: string
  screenshots: string[]
  video?: string
  documentation?: string
  requirements?: string[]
  features: string[]
  changelog?: string
  licenseKey?: string
  usageTokens?: number
  totalDownloads: number
  totalRevenue: number
  rating: number
  reviews: number
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

export interface Pricing {
  model: PricingModel
  price?: number
  currency?: string
  subscriptionPeriod?: 'monthly' | 'yearly'
  usagePrice?: number // Per request/token
  freeTier?: {
    requests: number
    tokens: number
  }
  tiers?: PricingTier[]
}

export interface PricingTier {
  name: string
  price: number
  features: string[]
  limits: {
    requests: number
    tokens: number
    instances: number
  }
}

export interface AppVersion {
  id: string
  appId: string
  version: string
  changelog?: string
  sourceCode: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date
}

class AppPublisher {
  private apps: Map<string, App> = new Map()
  private versions: Map<string, AppVersion[]> = new Map()

  async initialize() {
    logInfo('Initializing App Publishing & Licensing System...')

    // Load apps from database
    try {
      const { prisma } = await import('../config/database')
      const apps = await prisma.app.findMany()
      
      for (const app of apps) {
        this.apps.set(app.id, {
          id: app.id,
          developerId: app.developerId,
          name: app.name,
          slug: app.slug,
          description: app.description,
          longDescription: app.longDescription || undefined,
          category: app.category,
          tags: app.tags,
          version: app.version,
          status: app.status as AppStatus,
          accessLevel: app.accessLevel as AccessLevel,
          licenseType: app.licenseType as LicenseType,
          pricing: app.pricing as Pricing,
          sourceCode: app.sourceCode || undefined,
          repository: app.repository || undefined,
          icon: app.icon || undefined,
          screenshots: app.screenshots,
          video: app.video || undefined,
          documentation: app.documentation || undefined,
          requirements: app.requirements || [],
          features: app.features,
          changelog: app.changelog || undefined,
          licenseKey: app.licenseKey || undefined,
          usageTokens: app.usageTokens || undefined,
          totalDownloads: app.totalDownloads,
          totalRevenue: app.totalRevenue,
          rating: app.rating,
          reviews: app.reviews,
          metadata: app.metadata as Record<string, any>,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
          publishedAt: app.publishedAt || undefined
        })
      }
      
      logInfo(`✅ Loaded ${apps.length} apps from database`)
    } catch (error) {
      logError(error as Error, { context: 'App publisher initialization' })
    }

    logInfo('✅ App Publishing & Licensing System initialized')
  }

  // Create app
  async createApp(
    developerId: string,
    name: string,
    description: string,
    category: string,
    pricing: Pricing
  ): Promise<App> {
    try {
      const appId = nanoid()
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const now = new Date()

      const app: App = {
        id: appId,
        developerId,
        name,
        slug,
        description,
        category,
        tags: [],
        version: '1.0.0',
        status: 'draft',
        accessLevel: 'private',
        licenseType: 'closed_source',
        pricing,
        screenshots: [],
        features: [],
        totalDownloads: 0,
        totalRevenue: 0,
        rating: 0,
        reviews: 0,
        metadata: {},
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.app.create({
          data: {
            id: appId,
            developerId,
            name,
            slug,
            description,
            category,
            tags: [],
            version: '1.0.0',
            status: 'draft',
            accessLevel: 'private',
            licenseType: 'closed_source',
            pricing: pricing,
            screenshots: [],
            features: [],
            totalDownloads: 0,
            totalRevenue: 0,
            rating: 0,
            reviews: 0,
            metadata: {}
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create app in database' })
      }

      this.apps.set(appId, app)
      logInfo(`✅ Created app ${appId} for developer ${developerId}`)

      return app
    } catch (error) {
      logError(error as Error, { context: 'Create app' })
      throw error
    }
  }

  // Update app
  async updateApp(
    appId: string,
    updates: Partial<App>
  ): Promise<App | null> {
    try {
      const app = this.apps.get(appId)
      if (!app) return null

      const updated = {
        ...app,
        ...updates,
        updatedAt: new Date()
      }

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.app.update({
          where: { id: appId },
          data: {
            name: updated.name,
            description: updated.description,
            longDescription: updated.longDescription || null,
            category: updated.category,
            tags: updated.tags,
            version: updated.version,
            status: updated.status,
            accessLevel: updated.accessLevel,
            licenseType: updated.licenseType,
            pricing: updated.pricing,
            sourceCode: updated.sourceCode || null,
            repository: updated.repository || null,
            icon: updated.icon || null,
            screenshots: updated.screenshots,
            video: updated.video || null,
            documentation: updated.documentation || null,
            requirements: updated.requirements || [],
            features: updated.features,
            changelog: updated.changelog || null,
            licenseKey: updated.licenseKey || null,
            usageTokens: updated.usageTokens || null,
            metadata: updated.metadata
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Update app in database' })
      }

      this.apps.set(appId, updated)
      logInfo(`✅ Updated app ${appId}`)

      return updated
    } catch (error) {
      logError(error as Error, { context: 'Update app' })
      return null
    }
  }

  // Submit for review
  async submitForReview(appId: string): Promise<boolean> {
    try {
      const app = this.apps.get(appId)
      if (!app) return false

      if (app.status !== 'draft') {
        throw new Error('App must be in draft status to submit for review')
      }

      // Validate required fields
      if (!app.description || !app.category || !app.pricing) {
        throw new Error('Missing required fields')
      }

      app.status = 'pending'
      app.updatedAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.app.update({
          where: { id: appId },
          data: { status: 'pending' }
        })
      } catch (error) {
        logError(error as Error, { context: 'Submit for review in database' })
      }

      this.apps.set(appId, app)
      logInfo(`✅ Submitted app ${appId} for review`)

      // Start approval pipeline
      await this.startApprovalPipeline(appId)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Submit for review' })
      return false
    }
  }

  // Start approval pipeline
  private async startApprovalPipeline(appId: string): Promise<void> {
    try {
      const app = this.apps.get(appId)
      if (!app) return

      app.status = 'reviewing'

      // In production, trigger code scanner and review process
      const { codeScanner } = await import('../codeScanner/codeScanner')
      const scanResult = await codeScanner.scanApp(appId)

      if (scanResult.riskLevel === 'high' || scanResult.issues.length > 0) {
        app.status = 'rejected'
        logInfo(`⚠️ App ${appId} rejected due to security issues`)
      } else {
        app.status = 'approved'
        logInfo(`✅ App ${appId} approved`)
      }

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.app.update({
          where: { id: appId },
          data: { status: app.status }
        })
      } catch (error) {
        logError(error as Error, { context: 'Update approval status in database' })
      }

      this.apps.set(appId, app)
    } catch (error) {
      logError(error as Error, { context: 'Start approval pipeline' })
    }
  }

  // Publish app
  async publishApp(appId: string): Promise<boolean> {
    try {
      const app = this.apps.get(appId)
      if (!app) return false

      if (app.status !== 'approved') {
        throw new Error('App must be approved before publishing')
      }

      app.status = 'published'
      app.publishedAt = new Date()
      app.updatedAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.app.update({
          where: { id: appId },
          data: {
            status: 'published',
            publishedAt: app.publishedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Publish app in database' })
      }

      this.apps.set(appId, app)
      logInfo(`✅ Published app ${appId}`)

      // Emit webhook event
      const { advancedWebhookSystem } = await import('../webhooks/webhookSystem')
      await advancedWebhookSystem.emitEvent('app.published', {
        appId: app.id,
        name: app.name,
        developerId: app.developerId
      }, 'app-store')

      return true
    } catch (error) {
      logError(error as Error, { context: 'Publish app' })
      return false
    }
  }

  // Get app
  async getApp(appId: string): Promise<App | null> {
    return this.apps.get(appId) || null
  }

  // Get apps by developer
  async getAppsByDeveloper(developerId: string): Promise<App[]> {
    const developerApps: App[] = []
    for (const app of this.apps.values()) {
      if (app.developerId === developerId) {
        developerApps.push(app)
      }
    }
    return developerApps.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Get published apps
  async getPublishedApps(
    category?: string,
    limit: number = 50
  ): Promise<App[]> {
    const published: App[] = []
    for (const app of this.apps.values()) {
      if (app.status === 'published') {
        if (category && app.category !== category) continue
        published.push(app)
      }
    }
    return published
      .sort((a, b) => b.totalDownloads - a.totalDownloads)
      .slice(0, limit)
  }

  // Create version
  async createVersion(
    appId: string,
    version: string,
    sourceCode: string,
    changelog?: string
  ): Promise<AppVersion | null> {
    try {
      const app = this.apps.get(appId)
      if (!app) return null

      const versionId = nanoid()
      const appVersion: AppVersion = {
        id: versionId,
        appId,
        version,
        changelog,
        sourceCode,
        status: 'pending',
        createdAt: new Date()
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.appVersion.create({
          data: {
            id: versionId,
            appId,
            version,
            changelog: changelog || null,
            sourceCode,
            status: 'pending'
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create version in database' })
      }

      const versions = this.versions.get(appId) || []
      versions.push(appVersion)
      this.versions.set(appId, versions)

      logInfo(`✅ Created version ${version} for app ${appId}`)

      return appVersion
    } catch (error) {
      logError(error as Error, { context: 'Create version' })
      return null
    }
  }
}

export const appPublisher = new AppPublisher()

