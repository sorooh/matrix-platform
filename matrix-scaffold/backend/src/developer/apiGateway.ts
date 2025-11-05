/**
 * Phase 10.1 - Public API & Developer Gateway
 * 
 * Developer gateway
 * - Swagger / OpenAPI documentation
 * - API Playground
 * - API Keys management
 * - Rate limiting
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type APIKeyType = 'developer' | 'partner' | 'public' | 'trial'
export type APIKeyStatus = 'active' | 'suspended' | 'revoked' | 'expired'
export type RateLimitPeriod = 'second' | 'minute' | 'hour' | 'day'

export interface DeveloperAPIKey {
  id: string
  key: string
  name: string
  type: APIKeyType
  status: APIKeyStatus
  rateLimit: {
    requests: number
    period: RateLimitPeriod
  }
  usageLimits: {
    requestsPerDay?: number
    tokensPerDay?: number
    costPerDay?: number
  }
  permissions: string[]
  isActive: boolean
  expiresAt?: Date
  createdAt: Date
  lastUsed?: Date
  usage: {
    requests: number
    tokens: number
    cost: number
  }
}

export interface APIEndpoint {
  id: string
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  description: string
  parameters: APIParameter[]
  responses: APIResponse[]
  examples: APIExample[]
  tags: string[]
}

export interface APIParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required: boolean
  description: string
  example?: any
}

export interface APIResponse {
  status: number
  description: string
  schema: any
  example?: any
}

export interface APIExample {
  name: string
  description: string
  request: any
  response: any
}

export interface APIPlaygroundRequest {
  id: string
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers: Record<string, string>
  body?: any
  apiKey?: string
  executedAt: Date
  response?: any
  duration?: number
  error?: string
}

class PublicAPIDeveloperGateway {
  private apiKeys: Map<string, DeveloperAPIKey> = new Map()
  private endpoints: Map<string, APIEndpoint> = new Map()
  private playgroundRequests: Map<string, APIPlaygroundRequest> = new Map()

  async initialize() {
    logInfo('Initializing Public API & Developer Gateway...')

    // Initialize API endpoints
    await this.initializeAPIEndpoints()

    logInfo('✅ Public API & Developer Gateway initialized')
  }

  // Initialize API endpoints
  private async initializeAPIEndpoints(): Promise<void> {
    // In production, scan routes and generate OpenAPI spec
    logInfo('✅ API endpoints initialized')
  }

  // Create API key
  async createAPIKey(
    name: string,
    type: APIKeyType = 'developer',
    rateLimit: {
      requests: number
      period: RateLimitPeriod
    } = { requests: 1000, period: 'hour' },
    usageLimits?: {
      requestsPerDay?: number
      tokensPerDay?: number
      costPerDay?: number
    },
    permissions: string[] = [],
    expiresAt?: Date
  ): Promise<DeveloperAPIKey> {
    try {
      const keyId = nanoid()
      const apiKey = `MX-${type.toUpperCase()}-${nanoid(32).toUpperCase()}`
      const now = new Date()

      const developerKey: DeveloperAPIKey = {
        id: keyId,
        key: apiKey,
        name,
        type,
        status: 'active',
        rateLimit,
        usageLimits: usageLimits || {},
        permissions,
        isActive: true,
        expiresAt,
        createdAt: now,
        usage: {
          requests: 0,
          tokens: 0,
          cost: 0
        }
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.developerAPIKey.create({
          data: {
            id: keyId,
            key: apiKey,
            name,
            type,
            status: 'active',
            rateLimit,
            usageLimits: usageLimits || {},
            permissions,
            isActive: true,
            expiresAt: expiresAt || null,
            createdAt: now,
            lastUsed: null,
            usage: developerKey.usage
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create API key in database' })
      }

      this.apiKeys.set(keyId, developerKey)

      logInfo(`✅ Created API key ${keyId}: ${name} (${type})`)

      return developerKey
    } catch (error) {
      logError(error as Error, { context: 'Create API key' })
      throw error
    }
  }

  // Validate API key
  async validateAPIKey(apiKey: string): Promise<DeveloperAPIKey | null> {
    try {
      for (const key of this.apiKeys.values()) {
        if (key.key === apiKey && key.isActive && key.status === 'active') {
          // Check expiration
          if (key.expiresAt && key.expiresAt < new Date()) {
            key.status = 'expired'
            key.isActive = false
            this.apiKeys.set(key.id, key)
            return null
          }

          // Update last used
          key.lastUsed = new Date()
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

  // Check rate limit
  async checkRateLimit(apiKey: string): Promise<boolean> {
    try {
      const key = await this.validateAPIKey(apiKey)
      if (!key) return false

      // In production, check actual rate limit
      // For now, check usage
      if (key.usageLimits.requestsPerDay && key.usage.requests >= key.usageLimits.requestsPerDay) {
        return false
      }

      return true
    } catch (error) {
      logError(error as Error, { context: 'Check rate limit' })
      return false
    }
  }

  // Track API usage
  async trackUsage(
    apiKey: string,
    requests: number = 1,
    tokens: number = 0,
    cost: number = 0
  ): Promise<void> {
    try {
      const key = await this.validateAPIKey(apiKey)
      if (!key) return

      key.usage.requests += requests
      key.usage.tokens += tokens
      key.usage.cost += cost
      key.lastUsed = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.developerAPIKey.update({
          where: { id: key.id },
          data: {
            usage: key.usage,
            lastUsed: key.lastUsed
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Track usage in database' })
      }

      this.apiKeys.set(key.id, key)
    } catch (error) {
      logError(error as Error, { context: 'Track usage' })
    }
  }

  // Execute playground request
  async executePlaygroundRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    headers: Record<string, string> = {},
    body?: any,
    apiKey?: string
  ): Promise<APIPlaygroundRequest> {
    try {
      const requestId = nanoid()
      const startTime = Date.now()
      const now = new Date()

      // Validate API key if provided
      if (apiKey) {
        const key = await this.validateAPIKey(apiKey)
        if (!key) {
          throw new Error('Invalid API key')
        }

        // Check rate limit
        const withinLimit = await this.checkRateLimit(apiKey)
        if (!withinLimit) {
          throw new Error('Rate limit exceeded')
        }
      }

      // Execute request
      const response = await this.executeAPIRequest(endpoint, method, headers, body)
      const duration = Date.now() - startTime

      const playgroundRequest: APIPlaygroundRequest = {
        id: requestId,
        endpoint,
        method,
        headers,
        body,
        apiKey,
        executedAt: now,
        response,
        duration
      }

      // Track usage
      if (apiKey) {
        await this.trackUsage(apiKey, 1, 0, 0)
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.aPIPlaygroundRequest.create({
          data: {
            id: requestId,
            endpoint,
            method,
            headers,
            body: body || null,
            apiKey: apiKey || null,
            executedAt: now,
            response: response || null,
            duration,
            error: null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Execute playground request in database' })
      }

      this.playgroundRequests.set(requestId, playgroundRequest)

      logInfo(`✅ Executed playground request ${requestId}: ${method} ${endpoint}`)

      return playgroundRequest
    } catch (error) {
      logError(error as Error, { context: 'Execute playground request' })
      throw error
    }
  }

  // Execute API request
  private async executeAPIRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    headers: Record<string, string>,
    body?: any
  ): Promise<any> {
    // In production, execute actual API request
    // For now, simulate request
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200))
    return { success: true, data: 'Simulated response' }
  }

  // Generate OpenAPI spec
  async generateOpenAPISpec(): Promise<any> {
    try {
      const spec = {
        openapi: '3.0.0',
        info: {
          title: 'Matrix Platform API',
          version: '1.0.0',
          description: 'Matrix Platform Public API'
        },
        servers: [
          {
            url: 'https://api.matrix.ai/v1',
            description: 'Production server'
          }
        ],
        paths: {} as Record<string, any>,
        components: {
          securitySchemes: {
            ApiKeyAuth: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key'
            }
          }
        }
      }

      // Add endpoints
      for (const endpoint of this.endpoints.values()) {
        spec.paths[endpoint.path] = {
          [endpoint.method.toLowerCase()]: {
            summary: endpoint.description,
            parameters: endpoint.parameters.map(p => ({
              name: p.name,
              in: 'query',
              required: p.required,
              schema: { type: p.type },
              description: p.description,
              example: p.example
            })),
            responses: endpoint.responses.reduce((acc, r) => {
              acc[r.status] = {
                description: r.description,
                content: {
                  'application/json': {
                    schema: r.schema,
                    example: r.example
                  }
                }
              }
              return acc
            }, {} as Record<string, any>),
            tags: endpoint.tags
          }
        }
      }

      return spec
    } catch (error) {
      logError(error as Error, { context: 'Generate OpenAPI spec' })
      throw error
    }
  }

  // Get API keys
  async getAPIKeys(type?: APIKeyType, status?: APIKeyStatus): Promise<DeveloperAPIKey[]> {
    const keys: DeveloperAPIKey[] = []
    for (const key of this.apiKeys.values()) {
      if (type && key.type !== type) continue
      if (status && key.status !== status) continue
      keys.push(key)
    }
    return keys.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Get endpoints
  async getEndpoints(): Promise<APIEndpoint[]> {
    return Array.from(this.endpoints.values())
  }

  // Revoke API key
  async revokeAPIKey(keyId: string): Promise<boolean> {
    try {
      const key = this.apiKeys.get(keyId)
      if (!key) return false

      key.status = 'revoked'
      key.isActive = false

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.developerAPIKey.update({
          where: { id: keyId },
          data: {
            status: 'revoked',
            isActive: false
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Revoke API key in database' })
      }

      this.apiKeys.set(keyId, key)

      logInfo(`✅ Revoked API key ${keyId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Revoke API key' })
      return false
    }
  }
}

export const publicAPIDeveloperGateway = new PublicAPIDeveloperGateway()

