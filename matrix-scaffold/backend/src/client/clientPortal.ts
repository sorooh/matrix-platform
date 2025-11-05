/**
 * Phase 8.1 - Client Portal Backend
 * 
 * Client-facing API for Matrix AI Rental Dashboard
 * - Client authentication and session management
 * - Dashboard data aggregation
 * - Client profile management
 * - Multi-language support (EN/AR)
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'
import { subscriptionManager } from '../billing/subscription'
import { apiGatewayManager } from '../gateway/apiGateway'
import { privateInstanceManager } from '../instances/privateInstance'
import { usageTracker } from '../billing/usageTracker'

export type Language = 'en' | 'ar'
export type ClientRole = 'user' | 'admin' | 'viewer'

export interface ClientProfile {
  id: string
  userId: string
  email: string
  name: string
  language: Language
  timezone?: string
  preferences: ClientPreferences
  createdAt: Date
  updatedAt: Date
}

export interface ClientPreferences {
  theme: 'light' | 'dark' | 'auto'
  notifications: NotificationPreferences
  emailNotifications: boolean
  twoFactorEnabled: boolean
}

export interface NotificationPreferences {
  billing: boolean
  usage: boolean
  system: boolean
  support: boolean
}

export interface ClientDashboard {
  subscription: {
    tier: string
    status: string
    periodEnd: Date
    cancelAtPeriodEnd: boolean
  }
  usage: {
    requests: number
    tokens: number
    cost: number
    periodStart: Date
    periodEnd: Date
  }
  instances: {
    total: number
    active: number
    paused: number
  }
  recentInvoices: Array<{
    id: string
    amount: number
    currency: string
    status: string
    dueDate: Date
  }>
  recentPayments: Array<{
    id: string
    amount: number
    currency: string
    status: string
    date: Date
  }>
}

export interface ClientSession {
  id: string
  userId: string
  token: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  expiresAt: Date
  lastActivityAt: Date
}

class ClientPortalManager {
  private profiles: Map<string, ClientProfile> = new Map()
  private sessions: Map<string, ClientSession> = new Map()
  private tokenLookup: Map<string, string> = new Map() // token -> sessionId

  async initialize() {
    logInfo('Initializing Client Portal...')

    // Load client profiles from database
    try {
      const { prisma } = await import('../config/database')
      const profiles = await prisma.clientProfile.findMany()
      for (const profile of profiles) {
        this.profiles.set(profile.id, {
          id: profile.id,
          userId: profile.userId,
          email: profile.email,
          name: profile.name,
          language: profile.language as Language,
          timezone: profile.timezone || undefined,
          preferences: profile.preferences as ClientPreferences,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt
        })
      }
      logInfo(`✅ Loaded ${profiles.length} client profiles from database`)
    } catch (error) {
      logError(error as Error, { context: 'Client Portal initialization' })
    }

    logInfo('✅ Client Portal initialized')
  }

  // Get or create client profile
  async getClientProfile(userId: string): Promise<ClientProfile | null> {
    // Try to find existing profile
    for (const profile of this.profiles.values()) {
      if (profile.userId === userId) {
        return profile
      }
    }

    // Create new profile if not exists
    try {
      const profileId = nanoid()
      const now = new Date()

      const profile: ClientProfile = {
        id: profileId,
        userId,
        email: '', // Will be set from user data
        name: '',
        language: 'en',
        preferences: {
          theme: 'auto',
          notifications: {
            billing: true,
            usage: true,
            system: true,
            support: true
          },
          emailNotifications: true,
          twoFactorEnabled: false
        },
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.clientProfile.create({
          data: {
            id: profileId,
            userId,
            email: profile.email,
            name: profile.name,
            language: profile.language,
            timezone: profile.timezone || null,
            preferences: profile.preferences
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create client profile in database' })
      }

      this.profiles.set(profileId, profile)
      return profile
    } catch (error) {
      logError(error as Error, { context: 'Get client profile' })
      return null
    }
  }

  // Update client profile
  async updateClientProfile(
    userId: string,
    updates: Partial<ClientProfile>
  ): Promise<ClientProfile | null> {
    const profile = await this.getClientProfile(userId)
    if (!profile) return null

    const updated = {
      ...profile,
      ...updates,
      updatedAt: new Date()
    }

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.clientProfile.update({
        where: { userId },
        data: {
          email: updated.email,
          name: updated.name,
          language: updated.language,
          timezone: updated.timezone || null,
          preferences: updated.preferences
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Update client profile in database' })
    }

    this.profiles.set(profile.id, updated)
    return updated
  }

  // Get client dashboard data
  async getClientDashboard(userId: string): Promise<ClientDashboard | null> {
    try {
      // Get subscription
      const subscription = await subscriptionManager.getSubscriptionByUserId(userId)
      if (!subscription) {
        return null
      }

      // Get usage metrics
      const usageMetrics = await subscriptionManager.getUsageMetrics(subscription.id)

      // Get instances
      const instances = await privateInstanceManager.getInstancesByUserId(userId)
      const activeInstances = instances.filter(i => i.status === 'active')
      const pausedInstances = instances.filter(i => i.status === 'suspended')

      // Get recent invoices
      const invoices = await subscriptionManager.getInvoicesByUserId(userId)
      const recentInvoices = invoices
        .slice(0, 5)
        .map(inv => ({
          id: inv.id,
          amount: inv.amount,
          currency: inv.currency,
          status: inv.status,
          dueDate: inv.dueDate
        }))

      // Get recent payments (from invoices)
      const recentPayments = invoices
        .filter(inv => inv.status === 'paid' && inv.paidAt)
        .slice(0, 5)
        .map(inv => ({
          id: inv.id,
          amount: inv.amount,
          currency: inv.currency,
          status: inv.status,
          date: inv.paidAt!
        }))

      const dashboard: ClientDashboard = {
        subscription: {
          tier: subscription.tier,
          status: subscription.status,
          periodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
        },
        usage: usageMetrics ? {
          requests: usageMetrics.requests,
          tokens: usageMetrics.tokens,
          cost: usageMetrics.cost,
          periodStart: usageMetrics.periodStart,
          periodEnd: usageMetrics.periodEnd
        } : {
          requests: 0,
          tokens: 0,
          cost: 0,
          periodStart: subscription.currentPeriodStart,
          periodEnd: subscription.currentPeriodEnd
        },
        instances: {
          total: instances.length,
          active: activeInstances.length,
          paused: pausedInstances.length
        },
        recentInvoices,
        recentPayments
      }

      return dashboard
    } catch (error) {
      logError(error as Error, { context: 'Get client dashboard' })
      return null
    }
  }

  // Create client session
  async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ClientSession> {
    const sessionId = nanoid()
    const token = `client_${nanoid(32)}`
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const session: ClientSession = {
      id: sessionId,
      userId,
      token,
      ipAddress,
      userAgent,
      createdAt: now,
      expiresAt,
      lastActivityAt: now
    }

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.clientSession.create({
        data: {
          id: sessionId,
          userId,
          token,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          expiresAt
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Create client session in database' })
    }

    this.sessions.set(sessionId, session)
    this.tokenLookup.set(token, sessionId)
    return session
  }

  // Get session by token
  async getSessionByToken(token: string): Promise<ClientSession | null> {
    const sessionId = this.tokenLookup.get(token)
    if (!sessionId) return null

    const session = this.sessions.get(sessionId)
    if (!session) return null

    // Check expiration
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId)
      this.tokenLookup.delete(token)
      return null
    }

    // Update last activity
    session.lastActivityAt = new Date()
    this.sessions.set(sessionId, session)

    return session
  }

  // Revoke session
  async revokeSession(token: string): Promise<boolean> {
    const sessionId = this.tokenLookup.get(token)
    if (!sessionId) return false

    this.sessions.delete(sessionId)
    this.tokenLookup.delete(token)

    // Delete from database
    try {
      const { prisma } = await import('../config/database')
      await prisma.clientSession.delete({
        where: { id: sessionId }
      })
    } catch (error) {
      logError(error as Error, { context: 'Revoke client session in database' })
    }

    return true
  }

  // Get active sessions for user
  async getActiveSessions(userId: string): Promise<ClientSession[]> {
    const userSessions: ClientSession[] = []
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.expiresAt > new Date()) {
        userSessions.push(session)
      }
    }
    return userSessions.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
  }
}

export const clientPortalManager = new ClientPortalManager()

