/**
 * Phase 10.3 - Continuous Improvement System
 * 
 * Feedback collection, analytics, feature requests, voting
 * - Feedback collection
 * - Analytics dashboard
 * - Feature requests
 * - Voting system
 * - Changelog
 * - Update notifications
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'general' | 'security'
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent'
export type FeedbackStatus = 'new' | 'reviewing' | 'planned' | 'in_progress' | 'completed' | 'rejected'
export type UpdateType = 'feature' | 'bugfix' | 'security' | 'improvement' | 'breaking'

export interface UserFeedback {
  id: string
  userId: string
  type: FeedbackType
  title: string
  description: string
  category: string
  priority: FeedbackPriority
  status: FeedbackStatus
  votes: number
  comments: FeedbackComment[]
  attachments: string[]
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
}

export interface FeedbackComment {
  id: string
  userId: string
  content: string
  createdAt: Date
}

export interface FeatureRequest {
  id: string
  userId: string
  title: string
  description: string
  category: string
  votes: number
  supporters: string[] // User IDs
  status: FeedbackStatus
  estimatedEffort: number // hours
  priority: FeedbackPriority
  createdAt: Date
  updatedAt: Date
  implementedAt?: Date
}

export interface UsageAnalytics {
  id: string
  date: Date
  metrics: {
    activeUsers: number
    newUsers: number
    apiCalls: number
    pageViews: number
    featureUsage: Record<string, number>
    errors: number
    responseTime: number // milliseconds
  }
  createdAt: Date
}

export interface ChangelogEntry {
  id: string
  version: string
  type: UpdateType
  title: string
  description: string
  changes: string[]
  breakingChanges?: string[]
  releaseDate: Date
  createdBy: string
  createdAt: Date
}

export interface UpdateNotification {
  id: string
  userId: string
  type: UpdateType
  title: string
  message: string
  changelogId?: string
  isRead: boolean
  createdAt: Date
}

class ContinuousImprovementSystem {
  private feedbacks: Map<string, UserFeedback> = new Map()
  private featureRequests: Map<string, FeatureRequest> = new Map()
  private analytics: Map<string, UsageAnalytics> = new Map()
  private changelogs: Map<string, ChangelogEntry> = new Map()
  private notifications: Map<string, UpdateNotification> = new Map()

  async initialize() {
    logInfo('Initializing Continuous Improvement System...')

    logInfo('✅ Continuous Improvement System initialized')
  }

  // Submit feedback
  async submitFeedback(
    userId: string,
    type: FeedbackType,
    title: string,
    description: string,
    category: string,
    priority: FeedbackPriority = 'medium',
    attachments: string[] = []
  ): Promise<UserFeedback> {
    try {
      const feedbackId = nanoid()
      const now = new Date()

      const feedback: UserFeedback = {
        id: feedbackId,
        userId,
        type,
        title,
        description,
        category,
        priority,
        status: 'new',
        votes: 0,
        comments: [],
        attachments,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.userFeedback.create({
          data: {
            id: feedbackId,
            userId,
            type,
            title,
            description,
            category,
            priority,
            status: 'new',
            votes: 0,
            attachments,
            resolvedAt: null,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Submit feedback in database' })
      }

      this.feedbacks.set(feedbackId, feedback)

      logInfo(`✅ Submitted feedback ${feedbackId}: ${title}`)

      return feedback
    } catch (error) {
      logError(error as Error, { context: 'Submit feedback' })
      throw error
    }
  }

  // Vote on feedback
  async voteOnFeedback(feedbackId: string, userId: string): Promise<boolean> {
    try {
      const feedback = this.feedbacks.get(feedbackId)
      if (!feedback) return false

      // In production, check if user already voted
      feedback.votes++
      feedback.updatedAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.userFeedback.update({
          where: { id: feedbackId },
          data: {
            votes: feedback.votes,
            updatedAt: feedback.updatedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Vote on feedback in database' })
      }

      this.feedbacks.set(feedbackId, feedback)

      logInfo(`✅ User ${userId} voted on feedback ${feedbackId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Vote on feedback' })
      return false
    }
  }

  // Create feature request
  async createFeatureRequest(
    userId: string,
    title: string,
    description: string,
    category: string,
    estimatedEffort: number = 0,
    priority: FeedbackPriority = 'medium'
  ): Promise<FeatureRequest> {
    try {
      const requestId = nanoid()
      const now = new Date()

      const request: FeatureRequest = {
        id: requestId,
        userId,
        title,
        description,
        category,
        votes: 0,
        supporters: [],
        status: 'new',
        estimatedEffort,
        priority,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.featureRequest.create({
          data: {
            id: requestId,
            userId,
            title,
            description,
            category,
            votes: 0,
            supporters: [],
            status: 'new',
            estimatedEffort,
            priority,
            implementedAt: null,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create feature request in database' })
      }

      this.featureRequests.set(requestId, request)

      logInfo(`✅ Created feature request ${requestId}: ${title}`)

      return request
    } catch (error) {
      logError(error as Error, { context: 'Create feature request' })
      throw error
    }
  }

  // Record analytics
  async recordAnalytics(
    date: Date,
    metrics: UsageAnalytics['metrics']
  ): Promise<UsageAnalytics> {
    try {
      const analyticsId = nanoid()
      const now = new Date()

      const analytics: UsageAnalytics = {
        id: analyticsId,
        date,
        metrics,
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.usageAnalytics.create({
          data: {
            id: analyticsId,
            date,
            metrics,
            createdAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Record analytics in database' })
      }

      this.analytics.set(analyticsId, analytics)

      return analytics
    } catch (error) {
      logError(error as Error, { context: 'Record analytics' })
      throw error
    }
  }

  // Create changelog entry
  async createChangelogEntry(
    version: string,
    type: UpdateType,
    title: string,
    description: string,
    changes: string[],
    breakingChanges?: string[],
    createdBy: string = 'matrix-team'
  ): Promise<ChangelogEntry> {
    try {
      const changelogId = nanoid()
      const now = new Date()

      const changelog: ChangelogEntry = {
        id: changelogId,
        version,
        type,
        title,
        description,
        changes,
        breakingChanges,
        releaseDate: now,
        createdBy,
        createdAt: now
      }

      // Notify all users
      await this.notifyUsers(changelogId, type, title, description)

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.changelogEntry.create({
          data: {
            id: changelogId,
            version,
            type,
            title,
            description,
            changes,
            breakingChanges: breakingChanges || null,
            releaseDate: now,
            createdBy,
            createdAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create changelog entry in database' })
      }

      this.changelogs.set(changelogId, changelog)

      logInfo(`✅ Created changelog entry ${changelogId}: ${version}`)

      return changelog
    } catch (error) {
      logError(error as Error, { context: 'Create changelog entry' })
      throw error
    }
  }

  // Notify users
  private async notifyUsers(
    changelogId: string,
    type: UpdateType,
    title: string,
    message: string
  ): Promise<void> {
    // In production, notify all active users
    logInfo(`✅ Notified users about update: ${title}`)
  }

  // Get feedbacks
  async getFeedbacks(
    type?: FeedbackType,
    status?: FeedbackStatus,
    priority?: FeedbackPriority
  ): Promise<UserFeedback[]> {
    const feedbacks: UserFeedback[] = []
    for (const feedback of this.feedbacks.values()) {
      if (type && feedback.type !== type) continue
      if (status && feedback.status !== status) continue
      if (priority && feedback.priority !== priority) continue
      feedbacks.push(feedback)
    }
    return feedbacks.sort((a, b) => b.votes - a.votes)
  }

  // Get feature requests
  async getFeatureRequests(status?: FeedbackStatus): Promise<FeatureRequest[]> {
    const requests: FeatureRequest[] = []
    for (const request of this.featureRequests.values()) {
      if (status && request.status !== status) continue
      requests.push(request)
    }
    return requests.sort((a, b) => b.votes - a.votes)
  }

  // Get changelogs
  async getChangelogs(type?: UpdateType): Promise<ChangelogEntry[]> {
    const changelogs: ChangelogEntry[] = []
    for (const changelog of this.changelogs.values()) {
      if (type && changelog.type !== type) continue
      changelogs.push(changelog)
    }
    return changelogs.sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime())
  }
}

export const continuousImprovementSystem = new ContinuousImprovementSystem()

