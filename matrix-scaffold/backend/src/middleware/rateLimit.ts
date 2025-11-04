/**
 * Rate Limiting Middleware
 * Global-Ready Architecture with rate limiting
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { redis, getCache, setCache } from '../config/redis'
import { logger } from '../config/logger'
import { config } from '../config/app'

interface RateLimitOptions {
  max: number
  windowMs: number
  keyGenerator?: (request: FastifyRequest) => string
  skipSuccessfulRequests?: boolean
}

export function rateLimit(options: RateLimitOptions) {
  const { max, windowMs, keyGenerator, skipSuccessfulRequests = false } = options

  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Generate key (default: IP address)
      const key = keyGenerator
        ? keyGenerator(request)
        : `rate_limit:${request.ip || 'unknown'}:${request.url}`

      // Check current count
      const cached = await getCache<{ count: number; reset: number }>(key)

      if (cached) {
        // Check if window expired
        if (Date.now() > cached.reset) {
          // Reset window
          await setCache(key, { count: 1, reset: Date.now() + windowMs }, Math.floor(windowMs / 1000))
          return
        }

        // Check if limit exceeded
        if (cached.count >= max) {
          logger.warn('Rate limit exceeded', { key, count: cached.count, max })
          return reply.status(429).send({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Maximum ${max} requests per ${windowMs}ms`,
            retryAfter: Math.ceil((cached.reset - Date.now()) / 1000)
          })
        }

        // Increment count
        await setCache(
          key,
          { count: cached.count + 1, reset: cached.reset },
          Math.floor((cached.reset - Date.now()) / 1000)
        )
      } else {
        // First request in window
        await setCache(key, { count: 1, reset: Date.now() + windowMs }, Math.floor(windowMs / 1000))
      }
    } catch (error) {
      // If Redis fails, allow request (fail open)
      logger.warn('Rate limit check failed, allowing request', { error })
    }
  }
}

// Default rate limiter
export const defaultRateLimit = rateLimit({
  max: config.api.rateLimit.max,
  windowMs: config.api.rateLimit.windowMs,
  keyGenerator: (request) => `rate_limit:${request.ip || 'unknown'}:${request.method}:${request.url}`
})

