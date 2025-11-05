/**
 * Phase 8.2 - Partner API Gateway
 * 
 * OAuth 2.0 API Gateway for partners
 * - OAuth 2.0 authentication
 * - Customer registration API
 * - Automatic subscription creation
 * - Usage and sales endpoints
 * - Rate limiting per partner
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'
import { subscriptionManager } from '../billing/subscription'
import { apiGatewayManager } from '../gateway/apiGateway'

export type OAuthGrantType = 'authorization_code' | 'client_credentials' | 'refresh_token'

export interface PartnerOAuthClient {
  id: string
  partnerId: string
  clientId: string
  clientSecret: string
  redirectUris: string[]
  scopes: string[]
  rateLimit: {
    requestsPerMinute: number
    requestsPerHour: number
    requestsPerDay: number
  }
  createdAt: Date
}

export interface OAuthToken {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
  scope: string[]
}

export interface PartnerAPIRequest {
  partnerId: string
  endpoint: string
  method: string
  timestamp: Date
  userId?: string
}

class PartnerAPIGatewayManager {
  private oauthClients: Map<string, PartnerOAuthClient> = new Map()
  private clientIdLookup: Map<string, string> = new Map() // clientId -> id
  private accessTokens: Map<string, { partnerId: string; expiresAt: Date }> = new Map()
  private requestHistory: PartnerAPIRequest[] = []
  private rateLimitCounters: Map<string, Map<string, number>> = new Map() // partnerId -> type -> count

  async initialize() {
    logInfo('Initializing Partner API Gateway...')

    // Load OAuth clients from database
    try {
      const { prisma } = await import('../config/database')
      const clients = await prisma.partnerOAuthClient.findMany()
      for (const client of clients) {
        this.oauthClients.set(client.id, {
          id: client.id,
          partnerId: client.partnerId,
          clientId: client.clientId,
          clientSecret: client.clientSecret,
          redirectUris: client.redirectUris as string[],
          scopes: client.scopes as string[],
          rateLimit: client.rateLimit as any,
          createdAt: client.createdAt
        })
        this.clientIdLookup.set(client.clientId, client.id)
      }
      logInfo(`✅ Loaded ${clients.length} OAuth clients from database`)
    } catch (error) {
      logError(error as Error, { context: 'Partner API Gateway initialization' })
    }

    logInfo('✅ Partner API Gateway initialized')
  }

  // Create OAuth client
  async createOAuthClient(
    partnerId: string,
    redirectUris: string[],
    scopes: string[] = ['read', 'write']
  ): Promise<PartnerOAuthClient> {
    try {
      const clientId = `partner_${nanoid(16)}`
      const clientSecret = `secret_${nanoid(32)}`
      const id = nanoid()

      const client: PartnerOAuthClient = {
        id,
        partnerId,
        clientId,
        clientSecret,
        redirectUris,
        scopes,
        rateLimit: {
          requestsPerMinute: 100,
          requestsPerHour: 5000,
          requestsPerDay: 100000
        },
        createdAt: new Date()
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.partnerOAuthClient.create({
          data: {
            id,
            partnerId,
            clientId,
            clientSecret,
            redirectUris,
            scopes,
            rateLimit: client.rateLimit
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create OAuth client in database' })
      }

      this.oauthClients.set(id, client)
      this.clientIdLookup.set(clientId, id)
      logInfo(`✅ Created OAuth client ${clientId} for partner ${partnerId}`)

      return client
    } catch (error) {
      logError(error as Error, { context: 'Create OAuth client' })
      throw error
    }
  }

  // Generate OAuth token
  async generateToken(
    clientId: string,
    clientSecret: string,
    grantType: OAuthGrantType,
    code?: string
  ): Promise<OAuthToken | null> {
    try {
      const clientKey = this.clientIdLookup.get(clientId)
      if (!clientKey) return null

      const client = this.oauthClients.get(clientKey)
      if (!client || client.clientSecret !== clientSecret) return null

      const accessToken = `access_${nanoid(32)}`
      const refreshToken = `refresh_${nanoid(32)}`
      const expiresIn = 3600 // 1 hour
      const expiresAt = new Date(Date.now() + expiresIn * 1000)

      this.accessTokens.set(accessToken, {
        partnerId: client.partnerId,
        expiresAt
      })

      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn,
        scope: client.scopes
      }
    } catch (error) {
      logError(error as Error, { context: 'Generate OAuth token' })
      return null
    }
  }

  // Validate access token
  async validateToken(accessToken: string): Promise<{ valid: boolean; partnerId?: string }> {
    const tokenData = this.accessTokens.get(accessToken)
    if (!tokenData) {
      return { valid: false }
    }

    if (tokenData.expiresAt < new Date()) {
      this.accessTokens.delete(accessToken)
      return { valid: false }
    }

    return { valid: true, partnerId: tokenData.partnerId }
  }

  // Check rate limit
  async checkRateLimit(partnerId: string, type: 'minute' | 'hour' | 'day'): Promise<boolean> {
    const client = Array.from(this.oauthClients.values()).find(c => c.partnerId === partnerId)
    if (!client) return false

    let limit: number | undefined
    switch (type) {
      case 'minute':
        limit = client.rateLimit.requestsPerMinute
        break
      case 'hour':
        limit = client.rateLimit.requestsPerHour
        break
      case 'day':
        limit = client.rateLimit.requestsPerDay
        break
    }

    if (limit === undefined) return true

    const counters = this.rateLimitCounters.get(partnerId) || new Map()
    const count = counters.get(type) || 0

    if (count >= limit) {
      return false
    }

    counters.set(type, count + 1)
    this.rateLimitCounters.set(partnerId, counters)

    return true
  }

  // Register customer via API
  async registerCustomer(
    partnerId: string,
    email: string,
    name: string,
    tier: 'free' | 'pro' | 'enterprise' = 'free'
  ): Promise<{ userId: string; subscriptionId?: string }> {
    try {
      // In production, create user account
      const userId = nanoid()

      // Create subscription
      const subscription = await subscriptionManager.createSubscription(
        userId,
        tier,
        'stripe', // Default payment provider
        undefined,
        undefined // No trial
      )

      // Record request
      await this.recordRequest(partnerId, '/api/partner/customers/register', 'POST', userId)

      return {
        userId,
        subscriptionId: subscription.id
      }
    } catch (error) {
      logError(error as Error, { context: 'Register customer via API' })
      throw error
    }
  }

  // Create subscription via API
  async createSubscriptionViaAPI(
    partnerId: string,
    userId: string,
    tier: 'free' | 'pro' | 'enterprise',
    paymentProvider: 'stripe' | 'paypal' | 'crypto',
    paymentMethodId?: string
  ): Promise<string> {
    try {
      const subscription = await subscriptionManager.createSubscription(
        userId,
        tier,
        paymentProvider,
        paymentMethodId
      )

      // Record request
      await this.recordRequest(partnerId, '/api/partner/subscriptions/create', 'POST', userId)

      return subscription.id
    } catch (error) {
      logError(error as Error, { context: 'Create subscription via API' })
      throw error
    }
  }

  // Get usage via API
  async getUsageViaAPI(partnerId: string, userId: string): Promise<any> {
    try {
      const subscription = await subscriptionManager.getSubscriptionByUserId(userId)
      if (!subscription) {
        return null
      }

      const metrics = await subscriptionManager.getUsageMetrics(subscription.id)

      // Record request
      await this.recordRequest(partnerId, '/api/partner/usage', 'GET', userId)

      return metrics
    } catch (error) {
      logError(error as Error, { context: 'Get usage via API' })
      return null
    }
  }

  // Record API request
  private async recordRequest(
    partnerId: string,
    endpoint: string,
    method: string,
    userId?: string
  ): Promise<void> {
    const request: PartnerAPIRequest = {
      partnerId,
      endpoint,
      method,
      timestamp: new Date(),
      userId
    }

    this.requestHistory.push(request)

    // Keep only last 10000 requests
    if (this.requestHistory.length > 10000) {
      this.requestHistory = this.requestHistory.slice(-10000)
    }
  }

  // Get request history
  async getRequestHistory(partnerId: string, limit: number = 100): Promise<PartnerAPIRequest[]> {
    return this.requestHistory
      .filter(r => r.partnerId === partnerId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }
}

export const partnerAPIGatewayManager = new PartnerAPIGatewayManager()

