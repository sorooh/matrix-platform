/**
 * Phase 9 - Public Access Gateway
 * 
 * Public API gateway for developers and partners
 * - Public API key management
 * - Usage monitoring
 * - Performance statistics
 * - Public reports
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type PublicAPIKeyStatus = 'active' | 'suspended' | 'revoked'
export type APIKeyType = 'developer' | 'partner' | 'public' | 'trial'

export interface PublicAPIKey {
  id: string
  key: string
  type: APIKeyType
  status: PublicAPIKeyStatus
  userId?: string
  partnerId?: string
  name: string
  description?: string
  rateLimit: {
    requestsPerMinute: number
    requestsPerHour: number
    requestsPerDay: number
  }
  permissions: string[]
  usage: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    totalTokens: number
    totalCost: number
  }
  createdAt: Date
  lastUsedAt?: Date
  expiresAt?: Date
}

export interface PublicUsageStats {
  id: string
  keyId: string
  date: Date
  requests: number
  successfulRequests: number
  failedRequests: number
  tokens: number
  cost: number
  latency: number // average milliseconds
  errorRate: number // percentage
}

export interface PublicPerformanceReport {
  id: string
  keyId: string
  period: 'daily' | 'weekly' | 'monthly'
  startDate: Date
  endDate: Date
  stats: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    totalTokens: number
    totalCost: number
    averageLatency: number
    errorRate: number
    peakRequests: number
    peakRequestsTime: Date
  }
  generatedAt: Date
}

class PublicAccessGateway {
  private apiKeys: Map<string, PublicAPIKey> = new Map()
  private usageStats: Map<string, PublicUsageStats[]> = new Map()
  private performanceReports: Map<string, PublicPerformanceReport> = new Map()

  async initialize() {
    logInfo('Initializing Public Access Gateway...')
    logInfo('✅ Public Access Gateway initialized')
  }

  // Create public API key
  async createPublicAPIKey(
    type: APIKeyType,
    name: string,
    userId?: string,
    partnerId?: string,
    description?: string,
    rateLimit?: {
      requestsPerMinute: number
      requestsPerHour: number
      requestsPerDay: number
    },
    permissions?: string[]
  ): Promise<PublicAPIKey> {
    try {
      const keyId = nanoid()
      const apiKey = `mx_${nanoid(32)}`
      const now = new Date()

      const publicAPIKey: PublicAPIKey = {
        id: keyId,
        key: apiKey,
        type,
        status: 'active',
        userId,
        partnerId,
        name,
        description,
        rateLimit: rateLimit || {
          requestsPerMinute: 100,
          requestsPerHour: 1000,
          requestsPerDay: 10000
        },
        permissions: permissions || ['read'],
        usage: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalTokens: 0,
          totalCost: 0
        },
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.publicAPIKey.create({
          data: {
            id: keyId,
            key: apiKey,
            type,
            status: 'active',
            userId: userId || null,
            partnerId: partnerId || null,
            name,
            description: description || null,
            rateLimit: publicAPIKey.rateLimit,
            permissions: publicAPIKey.permissions,
            usage: publicAPIKey.usage,
            expiresAt: null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create public API key in database' })
      }

      this.apiKeys.set(keyId, publicAPIKey)

      logInfo(`✅ Created public API key ${keyId}: ${name}`)

      return publicAPIKey
    } catch (error) {
      logError(error as Error, { context: 'Create public API key' })
      throw error
    }
  }

  // Validate API key
  async validateAPIKey(apiKey: string): Promise<PublicAPIKey | null> {
    try {
      for (const key of this.apiKeys.values()) {
        if (key.key === apiKey && key.status === 'active') {
          // Check expiration
          if (key.expiresAt && key.expiresAt < new Date()) {
            key.status = 'revoked'
            this.apiKeys.set(key.id, key)
            return null
          }

          // Update last used
          key.lastUsedAt = new Date()
          this.apiKeys.set(key.id, key)

          return key
        }
      }
      return null
    } catch (error) {
      logError(error as Error, { context: 'Validate API key' })
      return null
    }
  }

  // Track usage
  async trackUsage(
    keyId: string,
    success: boolean,
    tokens: number = 0,
    cost: number = 0,
    latency: number = 0
  ): Promise<void> {
    try {
      const apiKey = this.apiKeys.get(keyId)
      if (!apiKey) return

      apiKey.usage.totalRequests++
      if (success) {
        apiKey.usage.successfulRequests++
      } else {
        apiKey.usage.failedRequests++
      }
      apiKey.usage.totalTokens += tokens
      apiKey.usage.totalCost += cost
      apiKey.lastUsedAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.publicAPIKey.update({
          where: { id: keyId },
          data: {
            usage: apiKey.usage,
            lastUsedAt: apiKey.lastUsedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Track usage in database' })
      }

      // Record daily stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const statsId = nanoid()
      const stats: PublicUsageStats = {
        id: statsId,
        keyId,
        date: today,
        requests: 1,
        successfulRequests: success ? 1 : 0,
        failedRequests: success ? 0 : 1,
        tokens,
        cost,
        latency,
        errorRate: success ? 0 : 100
      }

      const dailyStats = this.usageStats.get(keyId) || []
      const todayStats = dailyStats.find(s => s.date.getTime() === today.getTime())

      if (todayStats) {
        todayStats.requests++
        if (success) {
          todayStats.successfulRequests++
        } else {
          todayStats.failedRequests++
        }
        todayStats.tokens += tokens
        todayStats.cost += cost
        todayStats.latency = (todayStats.latency + latency) / 2
        todayStats.errorRate = (todayStats.failedRequests / todayStats.requests) * 100
      } else {
        dailyStats.push(stats)
        if (dailyStats.length > 90) dailyStats.shift() // Keep last 90 days
      }

      this.usageStats.set(keyId, dailyStats)
      this.apiKeys.set(keyId, apiKey)
    } catch (error) {
      logError(error as Error, { context: 'Track usage' })
    }
  }

  // Generate performance report
  async generatePerformanceReport(
    keyId: string,
    period: 'daily' | 'weekly' | 'monthly'
  ): Promise<PublicPerformanceReport> {
    try {
      const apiKey = this.apiKeys.get(keyId)
      if (!apiKey) throw new Error('API key not found')

      const reportId = nanoid()
      const now = new Date()
      const endDate = new Date(now)
      let startDate: Date

      if (period === 'daily') {
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      } else if (period === 'weekly') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }

      const stats = this.usageStats.get(keyId) || []
      const periodStats = stats.filter(s => s.date >= startDate && s.date <= endDate)

      const totalRequests = periodStats.reduce((sum, s) => sum + s.requests, 0)
      const successfulRequests = periodStats.reduce((sum, s) => sum + s.successfulRequests, 0)
      const failedRequests = periodStats.reduce((sum, s) => sum + s.failedRequests, 0)
      const totalTokens = periodStats.reduce((sum, s) => sum + s.tokens, 0)
      const totalCost = periodStats.reduce((sum, s) => sum + s.cost, 0)
      const averageLatency = periodStats.reduce((sum, s) => sum + s.latency, 0) / periodStats.length || 0
      const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0

      const peakRequests = Math.max(...periodStats.map(s => s.requests), 0)
      const peakRequestsTime = periodStats.find(s => s.requests === peakRequests)?.date || now

      const report: PublicPerformanceReport = {
        id: reportId,
        keyId,
        period,
        startDate,
        endDate,
        stats: {
          totalRequests,
          successfulRequests,
          failedRequests,
          totalTokens,
          totalCost,
          averageLatency,
          errorRate,
          peakRequests,
          peakRequestsTime
        },
        generatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.publicPerformanceReport.create({
          data: {
            id: reportId,
            keyId,
            period,
            startDate,
            endDate,
            stats: report.stats,
            generatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Generate performance report in database' })
      }

      this.performanceReports.set(reportId, report)

      logInfo(`✅ Generated performance report ${reportId} for key ${keyId}`)

      return report
    } catch (error) {
      logError(error as Error, { context: 'Generate performance report' })
      throw error
    }
  }

  // Get API key
  async getAPIKey(keyId: string): Promise<PublicAPIKey | null> {
    return this.apiKeys.get(keyId) || null
  }

  // Get usage stats
  async getUsageStats(keyId: string, limit: number = 30): Promise<PublicUsageStats[]> {
    const stats = this.usageStats.get(keyId) || []
    return stats.slice(-limit)
  }

  // Revoke API key
  async revokeAPIKey(keyId: string): Promise<boolean> {
    try {
      const apiKey = this.apiKeys.get(keyId)
      if (!apiKey) return false

      apiKey.status = 'revoked'
      this.apiKeys.set(keyId, apiKey)

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.publicAPIKey.update({
          where: { id: keyId },
          data: { status: 'revoked' }
        })
      } catch (error) {
        logError(error as Error, { context: 'Revoke API key in database' })
      }

      logInfo(`✅ Revoked API key ${keyId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Revoke API key' })
      return false
    }
  }
}

export const publicAccessGateway = new PublicAccessGateway()

