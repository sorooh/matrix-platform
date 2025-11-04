/**
 * API Gateway System
 * Phase 3: Advanced Integration Capabilities
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { securitySystem } from '../enterprise/security'
import { advancedCache } from '../performance/cache'
import { recordHTTPRequest } from '../monitoring/prometheus'

export interface APIGatewayConfig {
  rateLimit: {
    enabled: boolean
    maxRequests: number
    windowMs: number
  }
  caching: {
    enabled: boolean
    defaultTTL: number
  }
  security: {
    enabled: boolean
    threatDetection: boolean
  }
}

export interface GatewayRequest {
  method: string
  path: string
  headers: Record<string, string>
  query: Record<string, string>
  body?: any
  ip?: string
  userAgent?: string
}

export interface GatewayResponse {
  status: number
  headers: Record<string, string>
  body: any
  cached: boolean
}

export class APIGateway {
  private config: APIGatewayConfig = {
    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000
    },
    caching: {
      enabled: true,
      defaultTTL: 300
    },
    security: {
      enabled: true,
      threatDetection: true
    }
  }

  /**
   * Process request through gateway
   */
  async processRequest(request: GatewayRequest): Promise<GatewayResponse> {
    const startTime = Date.now()

    try {
      // Security check
      if (this.config.security.enabled) {
        // Check if IP is blocked
        if (request.ip && securitySystem.isIPBlocked(request.ip)) {
          return {
            status: 403,
            headers: {},
            body: { error: 'IP blocked' },
            cached: false
          }
        }

        // Threat detection
        if (this.config.security.threatDetection) {
          const input = JSON.stringify(request.body || request.query)
          const threat = securitySystem.detectThreat(input, request.ip || 'unknown')

          if (threat.threat && threat.action === 'block') {
            return {
              status: 403,
              headers: {},
              body: { error: 'Threat detected', type: threat.detection?.description },
              cached: false
            }
          }
        }
      }

      // Rate limiting
      if (this.config.rateLimit.enabled && request.ip) {
        const allowed = securitySystem.checkRateLimit(
          request.ip,
          this.config.rateLimit.maxRequests,
          this.config.rateLimit.windowMs
        )

        if (!allowed) {
          return {
            status: 429,
            headers: { 'Retry-After': '60' },
            body: { error: 'Rate limit exceeded' },
            cached: false
          }
        }
      }

      // Cache check
      if (this.config.caching.enabled && request.method === 'GET') {
        const cacheKey = `gateway:${request.method}:${request.path}:${JSON.stringify(request.query)}`
        const cached = await advancedCache.get(cacheKey)

        if (cached) {
          const duration = Date.now() - startTime
          recordHTTPRequest(request.method, request.path, 200, duration)

          return {
            status: 200,
            headers: { 'X-Cache': 'HIT' },
            body: cached,
            cached: true
          }
        }
      }

      // Process request (simplified - in production, route to actual handler)
      const response = {
        status: 200,
        headers: {},
        body: { message: 'Request processed' },
        cached: false
      }

      // Cache response
      if (this.config.caching.enabled && request.method === 'GET' && response.status === 200) {
        const cacheKey = `gateway:${request.method}:${request.path}:${JSON.stringify(request.query)}`
        await advancedCache.set(cacheKey, response.body, {
          ttl: this.config.caching.defaultTTL
        })
      }

      const duration = Date.now() - startTime
      recordHTTPRequest(request.method, request.path, response.status, duration)

      return response
    } catch (error: any) {
      logger.error('API Gateway processing failed:', error)
      const duration = Date.now() - startTime
      recordHTTPRequest(request.method, request.path, 500, duration)

      return {
        status: 500,
        headers: {},
        body: { error: 'Internal server error' },
        cached: false
      }
    }
  }

  /**
   * Get gateway statistics
   */
  getStats(): {
    config: APIGatewayConfig
    security: {
      blockedIPs: number
      threatsDetected: number
    }
    cache: {
      hitRate: number
    }
  } {
    const securityStats = securitySystem.getSecurityStats()
    const cacheStats = advancedCache.getStats()

    return {
      config: this.config,
      security: {
        blockedIPs: securityStats.blockedIPs,
        threatsDetected: securityStats.threatsDetected
      },
      cache: {
        hitRate: cacheStats.hitRate
      }
    }
  }
}

// Global API Gateway
export const apiGateway = new APIGateway()

