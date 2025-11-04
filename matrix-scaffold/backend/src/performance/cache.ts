/**
 * Advanced Caching System
 * Phase 3: Advanced Performance Optimization
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { redis } from '../config/redis'
import { config } from '../config/app'

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  tags?: string[] // Cache tags for invalidation
  compress?: boolean // Enable compression
}

export interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  hitRate: number
}

export class AdvancedCache {
  private memoryCache: Map<string, { value: any; expiry: number; tags: string[] }> = new Map()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(key)
      if (memoryEntry && memoryEntry.expiry > Date.now()) {
        this.stats.hits++
        this.updateHitRate()
        return memoryEntry.value as T
      }

      // Remove expired entry
      if (memoryEntry) {
        this.memoryCache.delete(key)
      }

      // Check Redis cache if available
      if (config.features.enableRedis && redis) {
        try {
          const value = await redis.get(key)
          if (value) {
            this.stats.hits++
            this.updateHitRate()

            // Store in memory cache
            const parsed = JSON.parse(value)
            this.memoryCache.set(key, {
              value: parsed,
              expiry: Date.now() + 60000, // 1 minute in memory
              tags: []
            })

            return parsed as T
          }
        } catch (error) {
          logger.warn('Redis cache get failed, falling back to memory:', error)
        }
      }

      this.stats.misses++
      this.updateHitRate()
      return null
    } catch (error: any) {
      logger.error('Cache get failed:', error)
      this.stats.misses++
      return null
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    try {
      const ttl = options.ttl || 3600 // Default 1 hour
      const tags = options.tags || []
      const expiry = Date.now() + ttl * 1000

      // Store in memory cache
      this.memoryCache.set(key, {
        value,
        expiry,
        tags
      })

      // Store in Redis cache if available
      if (config.features.enableRedis && redis) {
        try {
          await redis.setex(key, ttl, JSON.stringify(value))

          // Store tags for invalidation
          if (tags.length > 0) {
            for (const tag of tags) {
              await redis.sadd(`cache:tag:${tag}`, key)
              await redis.expire(`cache:tag:${tag}`, ttl)
            }
          }
        } catch (error) {
          logger.warn('Redis cache set failed:', error)
        }
      }

      this.stats.sets++
      this.updateHitRate()

      // Cleanup expired entries periodically
      if (this.memoryCache.size > 10000) {
        this.cleanupExpired()
      }
    } catch (error: any) {
      logger.error('Cache set failed:', error)
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key)

      if (config.features.enableRedis && redis) {
        try {
          await redis.del(key)
        } catch (error) {
          logger.warn('Redis cache delete failed:', error)
        }
      }

      this.stats.deletes++
    } catch (error: any) {
      logger.error('Cache delete failed:', error)
    }
  }

  /**
   * Invalidate cache by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    try {
      let deleted = 0

      // Invalidate memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.tags.includes(tag)) {
          this.memoryCache.delete(key)
          deleted++
        }
      }

      // Invalidate Redis cache
      if (config.features.enableRedis && redis) {
        try {
          const keys = await redis.smembers(`cache:tag:${tag}`)
          if (keys.length > 0) {
            await redis.del(...keys)
            await redis.del(`cache:tag:${tag}`)
            deleted += keys.length
          }
        } catch (error) {
          logger.warn('Redis cache invalidation failed:', error)
        }
      }

      logger.info(`Cache invalidated by tag: ${tag}`, { tag, deleted })
      return deleted
    } catch (error: any) {
      logger.error('Cache invalidation failed:', error)
      return 0
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      this.memoryCache.clear()

      if (config.features.enableRedis && redis) {
        try {
          const keys = await redis.keys('*')
          if (keys.length > 0) {
            await redis.del(...keys)
          }
        } catch (error) {
          logger.warn('Redis cache clear failed:', error)
        }
      }

      logger.info('Cache cleared')
    } catch (error: any) {
      logger.error('Cache clear failed:', error)
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
  }

  /**
   * Cleanup expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiry <= now) {
        this.memoryCache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cache cleanup: ${cleaned} expired entries removed`)
    }
  }
}

// Global Advanced Cache
export const advancedCache = new AdvancedCache()

