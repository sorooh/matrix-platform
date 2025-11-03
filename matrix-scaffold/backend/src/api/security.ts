import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import Redis from 'ioredis'
import { getVersionRateLimits, ApiVersion } from './versioning'

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number
  max: number
  keyGenerator?: (req: FastifyRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  onLimitReached?: (req: FastifyRequest, reply: FastifyReply) => void
}

// Rate limit tiers based on user subscription
export const RATE_LIMIT_TIERS = {
  free: {
    requests: 1000,
    window: 3600000, // 1 hour in ms
    burst: 10, // requests per minute
    concurrent: 5
  },
  pro: {
    requests: 10000,
    window: 3600000,
    burst: 100,
    concurrent: 20
  },
  enterprise: {
    requests: 100000,
    window: 3600000,
    burst: 1000,
    concurrent: 100
  }
}

// API endpoint specific limits
export const ENDPOINT_LIMITS = {
  '/auth/login': {
    requests: 5,
    window: 900000, // 15 minutes
    tier: 'strict'
  },
  '/auth/register': {
    requests: 3,
    window: 3600000, // 1 hour
    tier: 'strict'
  },
  '/projects/deploy': {
    requests: 100,
    window: 3600000,
    tier: 'deployment'
  },
  '/webhooks': {
    requests: 1000,
    window: 3600000,
    tier: 'webhook'
  }
}

// Security configuration
export const SECURITY_CONFIG = {
  // CORS settings
  cors: {
    origin: [
      'https://matrix-platform.com',
      'https://app.matrix-platform.com',
      'https://dashboard.matrix-platform.com',
      /^https:\/\/.*\.matrix-platform\.com$/,
      // Development origins
      'http://localhost:3000',
      'http://localhost:3001'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Version',
      'Accept-Version',
      'X-Request-ID',
      'X-Client-Version'
    ],
    credentials: true,
    maxAge: 86400 // 24 hours
  },

  // Security headers
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.matrix-platform.com"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },

  // Request validation
  validation: {
    maxBodySize: 10 * 1024 * 1024, // 10MB
    maxParamLength: 100,
    maxQueryLength: 1000,
    allowedFileTypes: [
      'application/json',
      'application/javascript',
      'text/html',
      'text/css',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp'
    ]
  }
}

export class RateLimiter {
  private redis: Redis
  private enabled: boolean

  constructor(redis: Redis, enabled: boolean = true) {
    this.redis = redis
    this.enabled = enabled
  }

  // Create rate limiting middleware
  createMiddleware(config: RateLimitConfig) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!this.enabled) return

      const key = config.keyGenerator 
        ? config.keyGenerator(request)
        : this.defaultKeyGenerator(request)

      const apiVersion = (request as any).apiVersion as ApiVersion
      const versionLimits = getVersionRateLimits(apiVersion)

      // Use version-specific limits if available
      const finalConfig = {
        ...config,
        max: versionLimits.requests || config.max,
        windowMs: (versionLimits.window * 1000) || config.windowMs
      }

      const allowed = await this.isAllowed(key, finalConfig)

      if (!allowed.success) {
        // Add rate limit headers
        reply.header('X-RateLimit-Limit', finalConfig.max)
        reply.header('X-RateLimit-Remaining', Math.max(0, finalConfig.max - allowed.count))
        reply.header('X-RateLimit-Reset', new Date(allowed.resetTime).toISOString())
        reply.header('Retry-After', Math.ceil(allowed.retryAfter / 1000))

        if (config.onLimitReached) {
          config.onLimitReached(request, reply)
        }

        return reply.status(429).send({
          error: 'Rate Limit Exceeded',
          message: `Too many requests. Limit: ${finalConfig.max} requests per ${Math.floor(finalConfig.windowMs / 1000)} seconds`,
          retryAfter: Math.ceil(allowed.retryAfter / 1000),
          limit: finalConfig.max,
          remaining: Math.max(0, finalConfig.max - allowed.count),
          resetTime: new Date(allowed.resetTime).toISOString()
        })
      }

      // Add success headers
      reply.header('X-RateLimit-Limit', finalConfig.max)
      reply.header('X-RateLimit-Remaining', Math.max(0, finalConfig.max - allowed.count - 1))
      reply.header('X-RateLimit-Reset', new Date(allowed.resetTime).toISOString())
    }
  }

  // Check if request is allowed
  private async isAllowed(key: string, config: RateLimitConfig): Promise<{
    success: boolean
    count: number
    resetTime: number
    retryAfter: number
  }> {
    const now = Date.now()
    const window = Math.floor(now / config.windowMs)
    const redisKey = `rate_limit:${key}:${window}`

    try {
      const pipeline = this.redis.pipeline()
      pipeline.incr(redisKey)
      pipeline.expire(redisKey, Math.ceil(config.windowMs / 1000))
      
      const results = await pipeline.exec()
      const count = results?.[0]?.[1] as number || 0

      const resetTime = (window + 1) * config.windowMs
      const retryAfter = resetTime - now

      return {
        success: count <= config.max,
        count,
        resetTime,
        retryAfter: Math.max(0, retryAfter)
      }
    } catch (error) {
      console.error('Rate limiting error:', error)
      // Fail open - allow request if Redis is down
      return {
        success: true,
        count: 0,
        resetTime: now + config.windowMs,
        retryAfter: 0
      }
    }
  }

  // Default key generator
  private defaultKeyGenerator(request: FastifyRequest): string {
    const userId = (request as any).user?.id
    const ip = request.ip
    const userAgent = request.headers['user-agent'] || 'unknown'
    
    // Use user ID if authenticated, otherwise IP + User-Agent hash
    if (userId) {
      return `user:${userId}`
    }
    
    const hash = this.simpleHash(ip + userAgent)
    return `ip:${hash}`
  }

  // Simple hash function for anonymous users
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  // Create user-specific rate limiter
  createUserRateLimiter() {
    return this.createMiddleware({
      windowMs: 3600000, // 1 hour
      max: 1000,
      keyGenerator: (req) => {
        const user = (req as any).user
        if (!user) return `anonymous:${req.ip}`
        
        const tier = user.tier || 'free'
        const limits = RATE_LIMIT_TIERS[tier as keyof typeof RATE_LIMIT_TIERS]
        
        return `user:${user.id}:${tier}`
      }
    })
  }

  // Create endpoint-specific rate limiter
  createEndpointRateLimiter(endpoint: string) {
    const limits = ENDPOINT_LIMITS[endpoint as keyof typeof ENDPOINT_LIMITS]
    
    if (!limits) {
      return this.createUserRateLimiter()
    }

    return this.createMiddleware({
      windowMs: limits.window,
      max: limits.requests,
      keyGenerator: (req) => {
        const user = (req as any).user
        const baseKey = user ? `user:${user.id}` : `ip:${req.ip}`
        return `${baseKey}:endpoint:${endpoint}`
      }
    })
  }

  // Burst protection for rapid requests
  createBurstProtection() {
    return this.createMiddleware({
      windowMs: 60000, // 1 minute
      max: 60, // 60 requests per minute
      keyGenerator: (req) => {
        const user = (req as any).user
        if (user) {
          const tier = user.tier || 'free'
          const limits = RATE_LIMIT_TIERS[tier as keyof typeof RATE_LIMIT_TIERS]
          return `burst:user:${user.id}:${limits.burst}`
        }
        return `burst:ip:${req.ip}`
      }
    })
  }
}

// Security middleware
export class SecurityMiddleware {
  // Request validation middleware
  static validateRequest() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const config = SECURITY_CONFIG.validation

      // Check body size
      if (request.headers['content-length']) {
        const contentLength = parseInt(request.headers['content-length'])
        if (contentLength > config.maxBodySize) {
          return reply.status(413).send({
            error: 'Request Entity Too Large',
            message: `Request body exceeds maximum size of ${config.maxBodySize} bytes`
          })
        }
      }

      // Validate content type for uploads
      if (request.headers['content-type'] && 
          !config.allowedFileTypes.some(type => 
            request.headers['content-type']?.includes(type)
          )) {
        return reply.status(415).send({
          error: 'Unsupported Media Type',
          message: 'File type not allowed',
          allowedTypes: config.allowedFileTypes
        })
      }

      // Add security headers
      reply.header('X-Content-Type-Options', 'nosniff')
      reply.header('X-Frame-Options', 'DENY')
      reply.header('X-XSS-Protection', '1; mode=block')
      reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    }
  }

  // API key validation
  static validateApiKey() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const apiKey = request.headers['x-api-key'] as string
      
      if (!apiKey) {
        return reply.status(401).send({
          error: 'API Key Required',
          message: 'X-API-Key header is required for this endpoint'
        })
      }

      // Validate API key format (basic validation)
      if (!/^mk_[a-zA-Z0-9]{32}$/.test(apiKey)) {
        return reply.status(401).send({
          error: 'Invalid API Key Format',
          message: 'API key must be in format: mk_[32 alphanumeric characters]'
        })
      }

      // Add API key info to request context
      ;(request as any).apiKey = apiKey
    }
  }

  // Request ID middleware
  static addRequestId() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const requestId = request.headers['x-request-id'] as string || 
                       `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      ;(request as any).requestId = requestId
      reply.header('X-Request-ID', requestId)
    }
  }
}

// Register security and rate limiting
export async function registerSecurity(fastify: FastifyInstance, redis: Redis) {
  const rateLimiter = new RateLimiter(redis)

  // Global security middleware
  fastify.addHook('preHandler', SecurityMiddleware.validateRequest())
  fastify.addHook('preHandler', SecurityMiddleware.addRequestId())

  // Global rate limiting
  fastify.addHook('preHandler', rateLimiter.createUserRateLimiter())
  fastify.addHook('preHandler', rateLimiter.createBurstProtection())

  // Endpoint-specific rate limiting examples
  fastify.addHook('preHandler', async (request, reply) => {
    const url = request.url.split('?')[0] // Remove query params
    
    // Apply endpoint-specific limits
    for (const [endpoint, limits] of Object.entries(ENDPOINT_LIMITS)) {
      if (url.includes(endpoint)) {
        await rateLimiter.createEndpointRateLimiter(endpoint)(request, reply)
        break
      }
    }
  })

  // Rate limit status endpoint
  fastify.get('/api/rate-limit/status', async (request) => {
    const user = (request as any).user
    const tier = user?.tier || 'free'
    const limits = RATE_LIMIT_TIERS[tier as keyof typeof RATE_LIMIT_TIERS]

    return {
      tier,
      limits,
      endpoints: ENDPOINT_LIMITS,
      currentUsage: {
        // This would normally query Redis for actual usage
        requests: 0,
        remaining: limits.requests,
        resetTime: new Date(Date.now() + limits.window).toISOString()
      }
    }
  })

  console.log('🔒 Security and rate limiting configured')
}