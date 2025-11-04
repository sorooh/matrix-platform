/**
 * Health Check System
 * Global-Ready Architecture with comprehensive health monitoring
 */

import { checkDatabaseHealth } from '../config/database'
import { checkRedisHealth } from '../config/redis'
import { logger } from '../config/logger'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    database: boolean
    redis: boolean
    api: boolean
  }
  uptime: number
  region: string
  version: string
}

export async function getHealthStatus(): Promise<HealthStatus> {
  try {
    const dbHealthy = await checkDatabaseHealth()
    const redisHealthy = await checkRedisHealth()
    const apiHealthy = true // API is always healthy if it's running

    const services = {
      database: dbHealthy,
      redis: redisHealthy,
      api: apiHealthy
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (!dbHealthy) {
      status = 'unhealthy' // Database is critical
    } else if (!redisHealthy) {
      status = 'degraded' // Redis is optional
    } else {
      status = 'healthy'
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      services,
      uptime: process.uptime(),
      region: process.env.REGION || 'us-east-1',
      version: process.env.VERSION || '0.1.0'
    }
  } catch (error) {
    logger.error('Failed to get health status:', error)
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: false,
        redis: false,
        api: false
      },
      uptime: process.uptime(),
      region: process.env.REGION || 'us-east-1',
      version: process.env.VERSION || '0.1.0'
    }
  }
}

