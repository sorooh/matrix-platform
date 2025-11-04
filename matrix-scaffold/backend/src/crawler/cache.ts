/**
 * Cache
 * Phase 6: AI Crawler & Simulation Environment
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { CrawlResult } from './engine'

export interface CacheEntry {
  url: string
  result: CrawlResult
  cachedAt: Date
  expiresAt: Date
  hits: number
}

export interface CacheConfig {
  maxSize: number
  ttl: number // milliseconds
  checkInterval: number // milliseconds
}

export class Cache {
  private cache: Map<string, CacheEntry> = new Map()
  private config: CacheConfig
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: config?.maxSize || 1000,
      ttl: config?.ttl || 24 * 60 * 60 * 1000, // 24 hours default
      checkInterval: config?.checkInterval || 60 * 60 * 1000, // 1 hour
    }

    this.startCleanup()
  }

  /**
   * Get cached result
   */
  get(url: string): CrawlResult | null {
    const entry = this.cache.get(url)

    if (!entry) {
      return null
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(url)
      logger.debug('Cache entry expired', { url })
      return null
    }

    // Update hits
    entry.hits++

    logger.debug('Cache hit', {
      url,
      hits: entry.hits,
      age: Date.now() - entry.cachedAt.getTime(),
    })

    return entry.result
  }

  /**
   * Set cache entry
   */
  set(url: string, result: CrawlResult): void {
    // Check max size
    if (this.cache.size >= this.config.maxSize) {
      // Remove oldest entry
      const oldestKey = this.getOldestKey()
      if (oldestKey) {
        this.cache.delete(oldestKey)
        logger.debug('Cache entry evicted (max size)', { url: oldestKey })
      }
    }

    const entry: CacheEntry = {
      url,
      result,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.ttl),
      hits: 0,
    }

    this.cache.set(url, entry)

    logger.debug('Cache entry set', {
      url,
      ttl: this.config.ttl,
      size: this.cache.size,
    })
  }

  /**
   * Check if URL is cached
   */
  has(url: string): boolean {
    const entry = this.cache.get(url)
    if (!entry) {
      return false
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(url)
      return false
    }

    return true
  }

  /**
   * Delete cache entry
   */
  delete(url: string): void {
    this.cache.delete(url)
    logger.debug('Cache entry deleted', { url })
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    logger.info('Cache cleared', { size })
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    maxSize: number
    hits: number
    misses: number
    hitRate: number
    oldestEntry: Date | null
    newestEntry: Date | null
  } {
    const entries = Array.from(this.cache.values())
    const hits = entries.reduce((sum, e) => sum + e.hits, 0)
    const misses = this.cache.size > 0 ? this.cache.size - hits : 0
    const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0

    const dates = entries.map((e) => e.cachedAt.getTime())
    const oldestEntry = dates.length > 0 ? new Date(Math.min(...dates)) : null
    const newestEntry = dates.length > 0 ? new Date(Math.max(...dates)) : null

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits,
      misses,
      hitRate,
      oldestEntry,
      newestEntry,
    }
  }

  /**
   * Get oldest key
   */
  private getOldestKey(): string | null {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      const time = entry.cachedAt.getTime()
      if (time < oldestTime) {
        oldestTime = time
        oldestKey = key
      }
    }

    return oldestKey
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, this.config.checkInterval)

    logger.info('Cache cleanup started', {
      interval: this.config.checkInterval,
    })
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      logger.info('Cache cleanup stopped')
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = new Date()
    let cleaned = 0

    for (const [url, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(url)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.info('Cache cleanup completed', {
        cleaned,
        remaining: this.cache.size,
      })
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    }

    // Restart cleanup if interval changed
    if (config.checkInterval) {
      this.stopCleanup()
      this.startCleanup()
    }

    logger.info('Cache config updated', { config: this.config })
  }
}

// Global Cache
export const cache = new Cache({
  maxSize: 1000,
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  checkInterval: 60 * 60 * 1000, // 1 hour
})

