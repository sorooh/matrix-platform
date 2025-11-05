/**
 * Phase 8 - AI Public Gateway
 * 
 * API Gateway for accessing Matrix AI intelligences
 * - API key management (create / revoke / renew)
 * - Rate limiting
 * - Usage tracking per key (Requests / Tokens / Cost)
 * - API Playground interface for testing intelligences
 * - Dashboard integration for key status and usage
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'
import { subscriptionManager } from '../billing/subscription'

export type APIKeyStatus = 'active' | 'revoked' | 'expired' | 'suspended'
export type RateLimitType = 'requests_per_minute' | 'requests_per_hour' | 'requests_per_day' | 'tokens_per_minute'

export interface APIKey {
  id: string
  userId: string
  subscriptionId?: string
  key: string
  name: string
  status: APIKeyStatus
  rateLimit: RateLimit
  usage: UsageStats
  allowedAIs: string[] // AI IDs that can be accessed
  metadata: Record<string, any>
  createdAt: Date
  lastUsedAt?: Date
  expiresAt?: Date
}

export interface RateLimit {
  requestsPerMinute?: number
  requestsPerHour?: number
  requestsPerDay?: number
  tokensPerMinute?: number
}

export interface UsageStats {
  requests: number
  tokens: number
  cost: number
  periodStart: Date
  periodEnd: Date
  lastResetAt: Date
}

export interface APIRequest {
  keyId: string
  aiId: string
  endpoint: string
  method: string
  tokens?: number
  cost?: number
  timestamp: Date
}

class APIGatewayManager {
  private apiKeys: Map<string, APIKey> = new Map()
  private keyLookup: Map<string, string> = new Map() // key -> keyId
  private requestHistory: APIRequest[] = []
  private rateLimitCounters: Map<string, Map<string, number>> = new Map() // keyId -> type -> count

  async initialize() {
    logInfo('Initializing AI Public Gateway...')

    // Load API keys from database
    try {
      const { prisma } = await import('../config/database')
      const keys = await prisma.apiKey.findMany()
      for (const key of keys) {
        const apiKey: APIKey = {
          id: key.id,
          userId: key.userId,
          subscriptionId: key.subscriptionId || undefined,
          key: key.key,
          name: key.name,
          status: key.status as APIKeyStatus,
          rateLimit: key.rateLimit as RateLimit,
          usage: key.usage as UsageStats,
          allowedAIs: key.allowedAIs as string[],
          metadata: key.metadata as Record<string, any>,
          createdAt: key.createdAt,
          lastUsedAt: key.lastUsedAt || undefined,
          expiresAt: key.expiresAt || undefined
        }
        this.apiKeys.set(key.id, apiKey)
        this.keyLookup.set(key.key, key.id)
      }
      logInfo(`✅ Loaded ${keys.length} API keys from database`)
    } catch (error) {
      logError(error as Error, { context: 'API Gateway initialization' })
    }

    logInfo('✅ AI Public Gateway initialized')
  }

  // Create API key
  async createAPIKey(
    userId: string,
    name: string,
    subscriptionId?: string,
    allowedAIs?: string[],
    rateLimit?: RateLimit,
    expiresInDays?: number
  ): Promise<APIKey> {
    try {
      const keyId = nanoid()
      const apiKey = `mp_${nanoid(32)}`
      const now = new Date()

      // Get subscription limits if subscription exists
      let defaultRateLimit: RateLimit = {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        tokensPerMinute: 100000
      }

      if (subscriptionId) {
        const subscription = await subscriptionManager.getSubscription(subscriptionId)
        if (subscription) {
          const limits = subscriptionManager.getTierLimits(subscription.tier)
          defaultRateLimit = {
            requestsPerMinute: limits.requests === -1 ? undefined : Math.floor(limits.requests / 1440),
            requestsPerHour: limits.requests === -1 ? undefined : Math.floor(limits.requests / 24),
            requestsPerDay: limits.requests === -1 ? undefined : limits.requests,
            tokensPerMinute: limits.tokens === -1 ? undefined : Math.floor(limits.tokens / 1440)
          }
        }
      }

      const expiresAt = expiresInDays ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000) : undefined

      const apiKeyObj: APIKey = {
        id: keyId,
        userId,
        subscriptionId,
        key: apiKey,
        name,
        status: 'active',
        rateLimit: rateLimit || defaultRateLimit,
        usage: {
          requests: 0,
          tokens: 0,
          cost: 0,
          periodStart: now,
          periodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
          lastResetAt: now
        },
        allowedAIs: allowedAIs || [],
        metadata: {},
        createdAt: now,
        expiresAt
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.apiKey.create({
          data: {
            id: keyId,
            userId,
            subscriptionId: subscriptionId || null,
            key: apiKey,
            name,
            status: 'active',
            rateLimit: apiKeyObj.rateLimit,
            usage: apiKeyObj.usage,
            allowedAIs: apiKeyObj.allowedAIs,
            metadata: apiKeyObj.metadata,
            expiresAt: expiresAt || null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create API key in database' })
      }

      this.apiKeys.set(keyId, apiKeyObj)
      this.keyLookup.set(apiKey, keyId)
      logInfo(`✅ Created API key ${keyId} for user ${userId}`)

      return apiKeyObj
    } catch (error) {
      logError(error as Error, { context: 'Create API key' })
      throw error
    }
  }

  // Get API key by key string
  async getAPIKeyByKey(key: string): Promise<APIKey | null> {
    const keyId = this.keyLookup.get(key)
    if (!keyId) return null
    return this.apiKeys.get(keyId) || null
  }

  // Get API key by ID
  async getAPIKey(keyId: string): Promise<APIKey | null> {
    return this.apiKeys.get(keyId) || null
  }

  // Get API keys by user
  async getAPIKeysByUserId(userId: string): Promise<APIKey[]> {
    const userKeys: APIKey[] = []
    for (const key of this.apiKeys.values()) {
      if (key.userId === userId) {
        userKeys.push(key)
      }
    }
    return userKeys.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Revoke API key
  async revokeAPIKey(keyId: string): Promise<boolean> {
    const apiKey = this.apiKeys.get(keyId)
    if (!apiKey) return false

    apiKey.status = 'revoked'
    this.keyLookup.delete(apiKey.key)

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.apiKey.update({
        where: { id: keyId },
        data: { status: 'revoked' }
      })
    } catch (error) {
      logError(error as Error, { context: 'Revoke API key in database' })
    }

    this.apiKeys.set(keyId, apiKey)
    logInfo(`✅ Revoked API key ${keyId}`)
    return true
  }

  // Renew API key
  async renewAPIKey(keyId: string, expiresInDays: number): Promise<APIKey | null> {
    const apiKey = this.apiKeys.get(keyId)
    if (!apiKey) return null

    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    apiKey.expiresAt = expiresAt
    apiKey.status = 'active'

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.apiKey.update({
        where: { id: keyId },
        data: { expiresAt, status: 'active' }
      })
    } catch (error) {
      logError(error as Error, { context: 'Renew API key in database' })
    }

    this.apiKeys.set(keyId, apiKey)
    logInfo(`✅ Renewed API key ${keyId}`)
    return apiKey
  }

  // Check rate limit
  async checkRateLimit(keyId: string, type: RateLimitType): Promise<boolean> {
    const apiKey = this.apiKeys.get(keyId)
    if (!apiKey || apiKey.status !== 'active') return false

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      apiKey.status = 'expired'
      return false
    }

    const rateLimit = apiKey.rateLimit
    let limit: number | undefined
    let period: string

    switch (type) {
      case 'requests_per_minute':
        limit = rateLimit.requestsPerMinute
        period = 'minute'
        break
      case 'requests_per_hour':
        limit = rateLimit.requestsPerHour
        period = 'hour'
        break
      case 'requests_per_day':
        limit = rateLimit.requestsPerDay
        period = 'day'
        break
      case 'tokens_per_minute':
        limit = rateLimit.tokensPerMinute
        period = 'minute'
        break
      default:
        return true
    }

    if (limit === undefined) return true // No limit

    // Get counter
    const counters = this.rateLimitCounters.get(keyId) || new Map()
    const counterKey = `${type}:${period}`
    const count = counters.get(counterKey) || 0

    if (count >= limit) {
      return false
    }

    // Increment counter
    counters.set(counterKey, count + 1)
    this.rateLimitCounters.set(keyId, counters)

    return true
  }

  // Track usage
  async trackUsage(
    keyId: string,
    aiId: string,
    tokens: number = 0,
    cost: number = 0
  ): Promise<void> {
    const apiKey = this.apiKeys.get(keyId)
    if (!apiKey) return

    apiKey.usage.requests += 1
    apiKey.usage.tokens += tokens
    apiKey.usage.cost += cost
    apiKey.lastUsedAt = new Date()

    // Track in subscription if exists
    if (apiKey.subscriptionId) {
      await subscriptionManager.trackUsage(apiKey.subscriptionId, 1, tokens, cost)
    }

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.apiKey.update({
        where: { id: keyId },
        data: {
          usage: apiKey.usage,
          lastUsedAt: apiKey.lastUsedAt
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Track usage in database' })
    }

    this.apiKeys.set(keyId, apiKey)
  }

  // Record API request
  async recordRequest(
    keyId: string,
    aiId: string,
    endpoint: string,
    method: string,
    tokens?: number,
    cost?: number
  ): Promise<void> {
    const request: APIRequest = {
      keyId,
      aiId,
      endpoint,
      method,
      tokens,
      cost,
      timestamp: new Date()
    }

    this.requestHistory.push(request)

    // Keep only last 10000 requests
    if (this.requestHistory.length > 10000) {
      this.requestHistory = this.requestHistory.slice(-10000)
    }

    // Track usage
    await this.trackUsage(keyId, aiId, tokens || 0, cost || 0)
  }

  // Get usage stats
  async getUsageStats(keyId: string): Promise<UsageStats | null> {
    const apiKey = this.apiKeys.get(keyId)
    return apiKey?.usage || null
  }

  // Get request history
  async getRequestHistory(keyId: string, limit: number = 100): Promise<APIRequest[]> {
    return this.requestHistory
      .filter(r => r.keyId === keyId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  // Validate API key
  async validateAPIKey(key: string, aiId?: string): Promise<{ valid: boolean; apiKey?: APIKey; reason?: string }> {
    const apiKey = await this.getAPIKeyByKey(key)
    
    if (!apiKey) {
      return { valid: false, reason: 'API key not found' }
    }

    if (apiKey.status !== 'active') {
      return { valid: false, reason: `API key is ${apiKey.status}` }
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      apiKey.status = 'expired'
      return { valid: false, reason: 'API key expired' }
    }

    if (aiId && apiKey.allowedAIs.length > 0 && !apiKey.allowedAIs.includes(aiId)) {
      return { valid: false, reason: 'AI not allowed for this API key' }
    }

    return { valid: true, apiKey }
  }
}

export const apiGatewayManager = new APIGatewayManager()

