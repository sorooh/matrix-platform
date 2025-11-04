import { redisManager } from './connection'
import { Types } from 'mongoose'

// Cache key prefixes
const CACHE_KEYS = {
  USER: 'user:',
  PROJECT: 'project:',
  DEPLOYMENT: 'deployment:',
  SESSION: 'session:',
  RATE_LIMIT: 'rate_limit:',
  ANALYTICS: 'analytics:',
  NOTIFICATION: 'notification:',
  TEMPORARY: 'temp:'
} as const

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400 // 24 hours
} as const

export class CacheService {
  private static instance: CacheService
  
  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  private getRedis() {
    const redis = redisManager.getClient()
    if (!redis) throw new Error('Redis client not available')
    return redis
  }

  // Generic cache operations
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const redis = this.getRedis()
      const value = await redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  async set(key: string, value: any, ttl: number = CACHE_TTL.MEDIUM): Promise<boolean> {
    try {
      const redis = this.getRedis()
      const serialized = JSON.stringify(value)
      await redis.setex(key, ttl, serialized)
      return true
    } catch (error) {
      console.error('Cache set error:', error)
      return false
    }
  }

  async del(key: string | string[]): Promise<boolean> {
    try {
      const redis = this.getRedis()
      const keys = Array.isArray(key) ? key : [key]
      await redis.del(...keys)
      return true
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const redis = this.getRedis()
      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  }

  async getPattern(pattern: string): Promise<string[]> {
    try {
      const redis = this.getRedis()
      return await redis.keys(pattern)
    } catch (error) {
      console.error('Cache pattern error:', error)
      return []
    }
  }

  async flushPattern(pattern: string): Promise<boolean> {
    try {
      const keys = await this.getPattern(pattern)
      if (keys.length > 0) {
        await this.del(keys)
      }
      return true
    } catch (error) {
      console.error('Cache flush pattern error:', error)
      return false
    }
  }

  // User-specific cache operations
  async cacheUser(userId: string, userData: any, ttl: number = CACHE_TTL.LONG): Promise<boolean> {
    const key = `${CACHE_KEYS.USER}${userId}`
    return this.set(key, userData, ttl)
  }

  async getCachedUser(userId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.USER}${userId}`
    return this.get(key)
  }

  async invalidateUser(userId: string): Promise<boolean> {
    const key = `${CACHE_KEYS.USER}${userId}`
    return this.del(key)
  }

  // Project-specific cache operations
  async cacheProject(projectId: string, projectData: any, ttl: number = CACHE_TTL.MEDIUM): Promise<boolean> {
    const key = `${CACHE_KEYS.PROJECT}${projectId}`
    return this.set(key, projectData, ttl)
  }

  async getCachedProject(projectId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.PROJECT}${projectId}`
    return this.get(key)
  }

  async invalidateProject(projectId: string): Promise<boolean> {
    const key = `${CACHE_KEYS.PROJECT}${projectId}`
    return this.del(key)
  }

  async cacheUserProjects(userId: string, projects: any[], ttl: number = CACHE_TTL.MEDIUM): Promise<boolean> {
    const key = `${CACHE_KEYS.PROJECT}user:${userId}`
    return this.set(key, projects, ttl)
  }

  async getCachedUserProjects(userId: string): Promise<any[] | null> {
    const key = `${CACHE_KEYS.PROJECT}user:${userId}`
    return this.get(key)
  }

  // Session management
  async setSession(sessionId: string, sessionData: any, ttl: number = CACHE_TTL.VERY_LONG): Promise<boolean> {
    const key = `${CACHE_KEYS.SESSION}${sessionId}`
    return this.set(key, sessionData, ttl)
  }

  async getSession(sessionId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.SESSION}${sessionId}`
    return this.get(key)
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const key = `${CACHE_KEYS.SESSION}${sessionId}`
    return this.del(key)
  }

  async deleteUserSessions(userId: string): Promise<boolean> {
    const pattern = `${CACHE_KEYS.SESSION}*:${userId}`
    return this.flushPattern(pattern)
  }

  // Rate limiting
  async incrementRateLimit(identifier: string, window: number = 60): Promise<{ count: number; ttl: number }> {
    try {
      const redis = this.getRedis()
      const key = `${CACHE_KEYS.RATE_LIMIT}${identifier}`
      
      const multi = redis.multi()
      multi.incr(key)
      multi.expire(key, window)
      
      const results = await multi.exec()
      const count = results?.[0]?.[1] as number || 0
      const ttl = await redis.ttl(key)
      
      return { count, ttl }
    } catch (error) {
      console.error('Rate limit error:', error)
      return { count: 0, ttl: 0 }
    }
  }

  async getRateLimit(identifier: string): Promise<{ count: number; ttl: number }> {
    try {
      const redis = this.getRedis()
      const key = `${CACHE_KEYS.RATE_LIMIT}${identifier}`
      
      const count = await redis.get(key)
      const ttl = await redis.ttl(key)
      
      return { 
        count: count ? parseInt(count) : 0, 
        ttl: ttl > 0 ? ttl : 0 
      }
    } catch (error) {
      console.error('Get rate limit error:', error)
      return { count: 0, ttl: 0 }
    }
  }

  // Analytics caching
  async cacheAnalytics(key: string, data: any, ttl: number = CACHE_TTL.MEDIUM): Promise<boolean> {
    const cacheKey = `${CACHE_KEYS.ANALYTICS}${key}`
    return this.set(cacheKey, data, ttl)
  }

  async getCachedAnalytics(key: string): Promise<any | null> {
    const cacheKey = `${CACHE_KEYS.ANALYTICS}${key}`
    return this.get(cacheKey)
  }

  // Notification queue
  async queueNotification(userId: string, notification: any): Promise<boolean> {
    try {
      const redis = this.getRedis()
      const key = `${CACHE_KEYS.NOTIFICATION}${userId}`
      await redis.lpush(key, JSON.stringify(notification))
      await redis.expire(key, CACHE_TTL.VERY_LONG)
      return true
    } catch (error) {
      console.error('Queue notification error:', error)
      return false
    }
  }

  async getNotifications(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const redis = this.getRedis()
      const key = `${CACHE_KEYS.NOTIFICATION}${userId}`
      const notifications = await redis.lrange(key, 0, limit - 1)
      return notifications.map(n => JSON.parse(n))
    } catch (error) {
      console.error('Get notifications error:', error)
      return []
    }
  }

  async markNotificationRead(userId: string, notificationId: string): Promise<boolean> {
    try {
      const redis = this.getRedis()
      const key = `${CACHE_KEYS.NOTIFICATION}${userId}`
      const notifications = await redis.lrange(key, 0, -1)
      
      for (let i = 0; i < notifications.length; i++) {
        const notification = JSON.parse(notifications[i])
        if (notification.id === notificationId) {
          notification.read = true
          await redis.lset(key, i, JSON.stringify(notification))
          break
        }
      }
      
      return true
    } catch (error) {
      console.error('Mark notification read error:', error)
      return false
    }
  }

  // Temporary data storage
  async setTemporary(key: string, data: any, ttl: number = CACHE_TTL.SHORT): Promise<boolean> {
    const tempKey = `${CACHE_KEYS.TEMPORARY}${key}`
    return this.set(tempKey, data, ttl)
  }

  async getTemporary(key: string): Promise<any | null> {
    const tempKey = `${CACHE_KEYS.TEMPORARY}${key}`
    return this.get(tempKey)
  }

  // Deployment status caching
  async cacheDeploymentStatus(deploymentId: string, status: any, ttl: number = CACHE_TTL.SHORT): Promise<boolean> {
    const key = `${CACHE_KEYS.DEPLOYMENT}${deploymentId}`
    return this.set(key, status, ttl)
  }

  async getCachedDeploymentStatus(deploymentId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.DEPLOYMENT}${deploymentId}`
    return this.get(key)
  }

  // Bulk operations
  async mget(keys: string[]): Promise<(any | null)[]> {
    try {
      const redis = this.getRedis()
      const values = await redis.mget(...keys)
      return values.map(value => value ? JSON.parse(value) : null)
    } catch (error) {
      console.error('Cache mget error:', error)
      return new Array(keys.length).fill(null)
    }
  }

  async mset(keyValuePairs: { key: string; value: any; ttl?: number }[]): Promise<boolean> {
    try {
      const redis = this.getRedis()
      const multi = redis.multi()
      
      for (const { key, value, ttl = CACHE_TTL.MEDIUM } of keyValuePairs) {
        const serialized = JSON.stringify(value)
        multi.setex(key, ttl, serialized)
      }
      
      await multi.exec()
      return true
    } catch (error) {
      console.error('Cache mset error:', error)
      return false
    }
  }

  // Cache statistics
  async getCacheStats(): Promise<{
    totalKeys: number
    memoryUsage: string
    hitRate: number
    keysByPrefix: Record<string, number>
  }> {
    try {
      const redis = this.getRedis()
      const info = await redis.info('memory')
      const keyspace = await redis.info('keyspace')
      const allKeys = await redis.keys('*')
      
      const keysByPrefix: Record<string, number> = {}
      Object.values(CACHE_KEYS).forEach(prefix => {
        keysByPrefix[prefix] = allKeys.filter(key => key.startsWith(prefix)).length
      })
      
      const memoryMatch = info.match(/used_memory_human:(.+)/)
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown'
      
      return {
        totalKeys: allKeys.length,
        memoryUsage,
        hitRate: 0, // Would need additional tracking
        keysByPrefix
      }
    } catch (error) {
      console.error('Cache stats error:', error)
      return {
        totalKeys: 0,
        memoryUsage: 'unknown',
        hitRate: 0,
        keysByPrefix: {}
      }
    }
  }

  // Clear all cache
  async flushAll(): Promise<boolean> {
    try {
      const redis = this.getRedis()
      await redis.flushdb()
      return true
    } catch (error) {
      console.error('Cache flush all error:', error)
      return false
    }
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance()

// Export cache constants
export { CACHE_KEYS, CACHE_TTL }