/**
 * Advanced Caching for Admin Module
 * Phase 7.3.1: Professional Enhancements
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { redis } from '../config/redis'
import { eventBus } from '../core/eventBus'

export interface CacheEntry<T = unknown> {
  key: string
  value: T
  tags: string[]
  expiresAt?: Date
  createdAt: Date
  accessedAt: Date
  accessCount: number
}

export interface CacheStatistics {
  totalEntries: number
  hitCount: number
  missCount: number
  hitRate: number
  totalSize: number
  entriesByTag: Record<string, number>
  evictions: number
}

export class AdvancedAdminCache {
  private cache: Map<string, CacheEntry> = new Map()
  private tagIndex: Map<string, Set<string>> = new Map() // tag -> Set of keys
  private hitCount = 0
  private missCount = 0
  private evictions = 0
  private maxSize = 10000 // Maximum cache entries
  private ttl: number = 60 * 60 * 1000 // 1 hour default TTL

  /**
   * Initialize Advanced Cache
   */
  async initialize(): Promise<void> {
    try {
      // Start periodic cleanup
      this.startPeriodicCleanup()

      // Subscribe to invalidation events
      this.subscribeToEvents()

      logger.info('Advanced Admin Cache initialized')
    } catch (error: any) {
      logger.error('Advanced Admin Cache initialization failed:', error)
      throw error
    }
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    // Clean expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries()
    }, 5 * 60 * 1000)

    // Cleanup LRU entries if cache is too large
    setInterval(() => {
      this.cleanupLRUEntries()
    }, 10 * 60 * 1000) // Every 10 minutes

    logger.debug('Periodic cleanup started')
  }

  /**
   * Subscribe to events
   */
  private subscribeToEvents(): void {
    // Subscribe to cache invalidation events
    eventBus.subscribe('admin.cache.invalidate', (data: any) => {
      try {
        if (data.tags) {
          this.invalidateByTags(data.tags)
        } else if (data.key) {
          this.delete(data.key)
        }
      } catch (err: any) {
        logger.error('Cache invalidation subscription failed:', err)
      }
    })

    logger.debug('Cache event subscriptions initialized')
  }

  /**
   * Set cache entry
   */
  async set<T>(key: string, value: T, options?: { ttl?: number; tags?: string[] }): Promise<void> {
    try {
      const ttl = options?.ttl || this.ttl
      const tags = options?.tags || []
      const expiresAt = ttl > 0 ? new Date(Date.now() + ttl) : undefined

      const entry: CacheEntry<T> = {
        key,
        value,
        tags,
        expiresAt,
        createdAt: new Date(),
        accessedAt: new Date(),
        accessCount: 0,
      }

      // Remove old entry if exists
      const oldEntry = this.cache.get(key)
      if (oldEntry) {
        this.removeFromTagIndex(key, oldEntry.tags)
      }

      // Add to cache
      this.cache.set(key, entry)

      // Add to tag index
      this.addToTagIndex(key, tags)

      // Check if cache is too large
      if (this.cache.size > this.maxSize) {
        this.evictLRUEntry()
      }

      // Also cache in Redis if available
      if (redis) {
        try {
          const serialized = JSON.stringify(value)
          if (expiresAt) {
            const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000)
            await redis.setex(key, ttlSeconds, serialized)
          } else {
            await redis.set(key, serialized)
          }

          // Store tags in Redis
          if (tags.length > 0) {
            for (const tag of tags) {
              await redis.sadd(`cache:tag:${tag}`, key)
            }
          }
        } catch (err: any) {
          logger.warn('Redis cache set failed, using in-memory only:', err.message)
        }
      }

      logger.debug('Cache entry set', {
        key,
        tags,
        hasExpiry: !!expiresAt,
      })
    } catch (error: any) {
      logger.error('Set cache entry failed:', error)
      throw error
    }
  }

  /**
   * Get cache entry
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check in-memory cache first
      const entry = this.cache.get(key)

      if (entry) {
        // Check if expired
        if (entry.expiresAt && entry.expiresAt < new Date()) {
          this.delete(key)
          this.missCount++
          return null
        }

        // Update access info
        entry.accessedAt = new Date()
        entry.accessCount++
        this.cache.set(key, entry)

        this.hitCount++
        logger.debug('Cache hit', {
          key,
        })

        return entry.value as T
      }

      // Check Redis if available
      if (redis) {
        try {
          const serialized = await redis.get(key)
          if (serialized) {
            const value = JSON.parse(serialized) as T

            // Restore to in-memory cache
            await this.set(key, value)

            this.hitCount++
            logger.debug('Cache hit (Redis)', {
              key,
            })

            return value
          }
        } catch (err: any) {
          logger.warn('Redis cache get failed:', err.message)
        }
      }

      this.missCount++
      logger.debug('Cache miss', {
        key,
      })

      return null
    } catch (error: any) {
      logger.error('Get cache entry failed:', error)
      this.missCount++
      return null
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key)
      if (!entry) {
        return false
      }

      // Remove from cache
      this.cache.delete(key)

      // Remove from tag index
      this.removeFromTagIndex(key, entry.tags)

      // Delete from Redis
      if (redis) {
        try {
          await redis.del(key)
          // Remove from tag sets
          for (const tag of entry.tags) {
            await redis.srem(`cache:tag:${tag}`, key)
          }
        } catch (err: any) {
          logger.warn('Redis cache delete failed:', err.message)
        }
      }

      logger.debug('Cache entry deleted', {
        key,
      })

      return true
    } catch (error: any) {
      logger.error('Delete cache entry failed:', error)
      return false
    }
  }

  /**
   * Invalidate by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let invalidated = 0

      for (const tag of tags) {
        const keys = this.tagIndex.get(tag)
        if (keys) {
          for (const key of keys) {
            await this.delete(key)
            invalidated++
          }
        }

        // Also invalidate in Redis
        if (redis) {
          try {
            const redisKeys = await redis.smembers(`cache:tag:${tag}`)
            if (redisKeys.length > 0) {
              await redis.del(...redisKeys)
              await redis.del(`cache:tag:${tag}`)
            }
          } catch (err: any) {
            logger.warn('Redis tag invalidation failed:', err.message)
          }
        }
      }

      logger.info('Cache invalidated by tags', {
        tags,
        invalidated,
      })

      // Publish event
      eventBus.publish('admin.cache.invalidated', {
        tags,
        invalidated,
      })

      return invalidated
    } catch (error: any) {
      logger.error('Invalidate by tags failed:', error)
      return 0
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      this.cache.clear()
      this.tagIndex.clear()

      // Clear Redis cache
      if (redis) {
        try {
          const keys = await redis.keys('cache:*')
          if (keys.length > 0) {
            await redis.del(...keys)
          }
        } catch (err: any) {
          logger.warn('Redis cache clear failed:', err.message)
        }
      }

      logger.info('Cache cleared')
    } catch (error: any) {
      logger.error('Clear cache failed:', error)
      throw error
    }
  }

  /**
   * Add to tag index
   */
  private addToTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set())
      }
      this.tagIndex.get(tag)!.add(key)
    }
  }

  /**
   * Remove from tag index
   */
  private removeFromTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag)
      if (keys) {
        keys.delete(key)
        if (keys.size === 0) {
          this.tagIndex.delete(tag)
        }
      }
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanupExpiredEntries(): void {
    try {
      const now = new Date()
      let cleaned = 0

      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt && entry.expiresAt < now) {
          this.cache.delete(key)
          this.removeFromTagIndex(key, entry.tags)
          cleaned++
        }
      }

      if (cleaned > 0) {
        logger.debug('Expired cache entries cleaned', {
          cleaned,
        })
      }
    } catch (error: any) {
      logger.error('Cleanup expired entries failed:', error)
    }
  }

  /**
   * Cleanup LRU entries
   */
  private cleanupLRUEntries(): void {
    try {
      if (this.cache.size <= this.maxSize) {
        return
      }

      const entries = Array.from(this.cache.entries())
      // Sort by access time (least recently used first)
      entries.sort((a, b) => a[1].accessedAt.getTime() - b[1].accessedAt.getTime())

      const toRemove = this.cache.size - this.maxSize
      for (let i = 0; i < toRemove; i++) {
        const [key, entry] = entries[i]
        this.cache.delete(key)
        this.removeFromTagIndex(key, entry.tags)
      }

      this.evictions += toRemove

      logger.debug('LRU cache entries cleaned', {
        removed: toRemove,
      })
    } catch (error: any) {
      logger.error('Cleanup LRU entries failed:', error)
    }
  }

  /**
   * Evict LRU entry
   */
  private evictLRUEntry(): void {
    try {
      if (this.cache.size === 0) {
        return
      }

      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].accessedAt.getTime() - b[1].accessedAt.getTime())

      const [key, entry] = entries[0]
      this.cache.delete(key)
      this.removeFromTagIndex(key, entry.tags)
      this.evictions++

      logger.debug('LRU entry evicted', {
        key,
      })
    } catch (error: any) {
      logger.error('Evict LRU entry failed:', error)
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): CacheStatistics {
    const total = this.hitCount + this.missCount
    const hitRate = total > 0 ? (this.hitCount / total) * 100 : 0

    const entriesByTag: Record<string, number> = {}
    for (const [tag, keys] of this.tagIndex.entries()) {
      entriesByTag[tag] = keys.size
    }

    return {
      totalEntries: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate,
      totalSize: this.cache.size,
      entriesByTag,
      evictions: this.evictions,
    }
  }

  /**
   * Warm cache
   */
  async warmCache(entries: Array<{ key: string; value: unknown; tags?: string[] }>): Promise<void> {
    try {
      for (const entry of entries) {
        await this.set(entry.key, entry.value, {
          tags: entry.tags,
        })
      }

      logger.info('Cache warmed', {
        entries: entries.length,
      })
    } catch (error: any) {
      logger.error('Warm cache failed:', error)
      throw error
    }
  }
}

// Global Advanced Admin Cache
export const advancedAdminCache = new AdvancedAdminCache()

