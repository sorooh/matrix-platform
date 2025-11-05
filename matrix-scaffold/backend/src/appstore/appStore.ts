/**
 * Phase 8.4 - Matrix App Store Interface
 * 
 * App store interface for published apps
 * - App listing by category/popularity/developer
 * - User ratings and reviews
 * - Install to workspace functionality
 * - Video and screenshots support
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type AppCategory = 'ai' | 'automation' | 'productivity' | 'developer' | 'data' | 'visual' | 'other'
export type SortBy = 'popularity' | 'rating' | 'newest' | 'downloads' | 'revenue'
export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface AppReview {
  id: string
  appId: string
  userId: string
  rating: number // 1-5
  title?: string
  comment?: string
  status: ReviewStatus
  helpful: number
  createdAt: Date
  updatedAt: Date
}

export interface AppInstallation {
  id: string
  appId: string
  userId: string
  version: string
  instanceId?: string
  status: 'installed' | 'running' | 'stopped' | 'uninstalled'
  installedAt: Date
  lastUsedAt?: Date
}

export interface AppStat {
  appId: string
  downloads: number
  activeInstalls: number
  revenue: number
  rating: number
  reviews: number
  lastUpdated: Date
}

class AppStore {
  private reviews: Map<string, AppReview> = new Map()
  private installations: Map<string, AppInstallation> = new Map()
  private stats: Map<string, AppStat> = new Map()

  async initialize() {
    logInfo('Initializing Matrix App Store Interface...')

    // Load reviews from database
    try {
      const { prisma } = await import('../config/database')
      const reviews = await prisma.appReview.findMany()
      
      for (const review of reviews) {
        this.reviews.set(review.id, {
          id: review.id,
          appId: review.appId,
          userId: review.userId,
          rating: review.rating,
          title: review.title || undefined,
          comment: review.comment || undefined,
          status: review.status as ReviewStatus,
          helpful: review.helpful,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt
        })
      }
      
      logInfo(`✅ Loaded ${reviews.length} reviews from database`)
    } catch (error) {
      logError(error as Error, { context: 'App store initialization' })
    }

    logInfo('✅ Matrix App Store Interface initialized')
  }

  // Get apps
  async getApps(
    category?: AppCategory,
    sortBy: SortBy = 'popularity',
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { appPublisher } = await import('../developer/appPublisher')
      const apps = await appPublisher.getPublishedApps(category, limit)

      // Sort apps
      apps.sort((a, b) => {
        switch (sortBy) {
          case 'popularity':
            return b.totalDownloads - a.totalDownloads
          case 'rating':
            return b.rating - a.rating
          case 'newest':
            return b.createdAt.getTime() - a.createdAt.getTime()
          case 'downloads':
            return b.totalDownloads - a.totalDownloads
          case 'revenue':
            return b.totalRevenue - a.totalRevenue
          default:
            return 0
        }
      })

      return apps
    } catch (error) {
      logError(error as Error, { context: 'Get apps' })
      return []
    }
  }

  // Get app details
  async getAppDetails(appId: string): Promise<any | null> {
    try {
      const { appPublisher } = await import('../developer/appPublisher')
      return await appPublisher.getApp(appId)
    } catch (error) {
      logError(error as Error, { context: 'Get app details' })
      return null
    }
  }

  // Create review
  async createReview(
    appId: string,
    userId: string,
    rating: number,
    title?: string,
    comment?: string
  ): Promise<AppReview> {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5')
      }

      const reviewId = nanoid()
      const now = new Date()

      const review: AppReview = {
        id: reviewId,
        appId,
        userId,
        rating,
        title,
        comment,
        status: 'pending',
        helpful: 0,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.appReview.create({
          data: {
            id: reviewId,
            appId,
            userId,
            rating,
            title: title || null,
            comment: comment || null,
            status: 'pending',
            helpful: 0
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create review in database' })
      }

      this.reviews.set(reviewId, review)

      // Update app stats
      await this.updateAppStats(appId)

      logInfo(`✅ Created review ${reviewId} for app ${appId}`)

      return review
    } catch (error) {
      logError(error as Error, { context: 'Create review' })
      throw error
    }
  }

  // Get reviews
  async getReviews(appId: string, limit: number = 50): Promise<AppReview[]> {
    const appReviews: AppReview[] = []
    for (const review of this.reviews.values()) {
      if (review.appId === appId && review.status === 'approved') {
        appReviews.push(review)
      }
    }
    return appReviews
      .sort((a, b) => b.helpful - a.helpful)
      .slice(0, limit)
  }

  // Install app
  async installApp(
    appId: string,
    userId: string,
    version: string
  ): Promise<AppInstallation> {
    try {
      const installationId = nanoid()
      const now = new Date()

      // Get app
      const { appPublisher } = await import('../developer/appPublisher')
      const app = await appPublisher.getApp(appId)
      if (!app) {
        throw new Error('App not found')
      }

      // Create instance
      const { aiRuntime } = await import('../runtime/aiRuntime')
      const runtimeConfig = {
        language: 'nodejs' as const,
        version: '18',
        memoryLimit: 512,
        cpuLimit: 1,
        storageLimit: 1024,
        timeout: 30,
        envVars: {},
        ports: [3000]
      }

      const instance = await aiRuntime.createInstance(
        appId,
        app.developerId,
        version,
        runtimeConfig
      )

      const installation: AppInstallation = {
        id: installationId,
        appId,
        userId,
        version,
        instanceId: instance.id,
        status: 'installed',
        installedAt: now,
        lastUsedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.appInstallation.create({
          data: {
            id: installationId,
            appId,
            userId,
            version,
            instanceId: instance.id,
            status: 'installed'
          })
      } catch (error) {
        logError(error as Error, { context: 'Install app in database' })
      }

      this.installations.set(installationId, installation)

      // Update app stats
      await this.updateAppStats(appId)

      logInfo(`✅ Installed app ${appId} for user ${userId}`)

      return installation
    } catch (error) {
      logError(error as Error, { context: 'Install app' })
      throw error
    }
  }

  // Get installations
  async getInstallations(userId: string): Promise<AppInstallation[]> {
    const userInstallations: AppInstallation[] = []
    for (const installation of this.installations.values()) {
      if (installation.userId === userId && installation.status !== 'uninstalled') {
        userInstallations.push(installation)
      }
    }
    return userInstallations.sort((a, b) => b.installedAt.getTime() - a.installedAt.getTime())
  }

  // Update app stats
  private async updateAppStats(appId: string): Promise<void> {
    try {
      // Count downloads
      const downloads = Array.from(this.installations.values()).filter(
        i => i.appId === appId
      ).length

      // Count active installs
      const activeInstalls = Array.from(this.installations.values()).filter(
        i => i.appId === appId && i.status === 'running'
      ).length

      // Calculate rating
      const appReviews = Array.from(this.reviews.values()).filter(
        r => r.appId === appId && r.status === 'approved'
      )
      const rating = appReviews.length > 0
        ? appReviews.reduce((sum, r) => sum + r.rating, 0) / appReviews.length
        : 0

      const stats: AppStat = {
        appId,
        downloads,
        activeInstalls,
        revenue: 0, // Will be updated from revenue share
        rating,
        reviews: appReviews.length,
        lastUpdated: new Date()
      }

      this.stats.set(appId, stats)

      // Update app in database
      try {
        const { prisma } = await import('../config/database')
        await prisma.app.update({
          where: { id: appId },
          data: {
            totalDownloads: downloads,
            rating: rating,
            reviews: appReviews.length
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Update app stats in database' })
      }
    } catch (error) {
      logError(error as Error, { context: 'Update app stats' })
    }
  }

  // Get app stats
  async getAppStats(appId: string): Promise<AppStat | null> {
    return this.stats.get(appId) || null
  }
}

export const appStore = new AppStore()

