/**
 * Redis Configuration
 * Global-Ready Architecture with Redis for caching and event bus
 */

import Redis from 'ioredis'
import dotenv from 'dotenv'

dotenv.config()

// Redis Client
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  }
})

// Redis connection events
redis.on('connect', () => {
  console.log('✅ Redis connected')
})

redis.on('error', (error) => {
  console.error('❌ Redis error:', error)
})

redis.on('close', () => {
  console.log('⚠️ Redis connection closed')
})

// Cache helper functions
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key)
    if (!value) return null
    return JSON.parse(value) as T
  } catch (error) {
    console.error(`❌ Cache get error for key ${key}:`, error)
    return null
  }
}

export async function setCache<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value))
  } catch (error) {
    console.error(`❌ Cache set error for key ${key}:`, error)
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (error) {
    console.error(`❌ Cache delete error for key ${key}:`, error)
  }
}

// Event bus (Pub/Sub)
export async function publishEvent(channel: string, data: any): Promise<void> {
  try {
    await redis.publish(channel, JSON.stringify(data))
  } catch (error) {
    console.error(`❌ Publish event error for channel ${channel}:`, error)
  }
}

export function subscribeEvent(channel: string, callback: (data: any) => void): void {
  const subscriber = redis.duplicate()
  subscriber.subscribe(channel)
  
  subscriber.on('message', (ch, message) => {
    if (ch === channel) {
      try {
        const data = JSON.parse(message)
        callback(data)
      } catch (error) {
        console.error(`❌ Parse event data error:`, error)
      }
    }
  })
}

// Health check
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping()
    return true
  } catch (error) {
    console.error('❌ Redis health check failed:', error)
    return false
  }
}

// Graceful shutdown
export async function disconnectRedis() {
  await redis.quit()
}

