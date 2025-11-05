/**
 * Production Health Checks - Matrix Platform v11
 * 
 * Comprehensive health checks for production
 */

import { FastifyInstance } from 'fastify'
import { prisma } from '../config/database'
import { redis } from '../config/redis'
import { logger, logInfo } from '../config/logger'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  timestamp: Date
  checks: {
    database: {
      status: 'healthy' | 'unhealthy'
      latency: number
    }
    redis: {
      status: 'healthy' | 'unhealthy'
      latency: number
    }
    modules: {
      phase1: 'active' | 'inactive'
      phase2: 'active' | 'inactive'
      phase11: 'active' | 'inactive'
    }
    services: {
      api: 'healthy' | 'unhealthy'
      security: 'healthy' | 'unhealthy'
      observability: 'healthy' | 'unhealthy'
    }
  }
}

class ProductionHealth {
  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now()
    
    // Check database
    const dbCheck = await this.checkDatabase()
    
    // Check Redis
    const redisCheck = await this.checkRedis()
    
    // Check modules
    const modulesCheck = await this.checkModules()
    
    // Check services
    const servicesCheck = await this.checkServices()
    
    const overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 
      dbCheck.status === 'healthy' && redisCheck.status === 'healthy' && 
      servicesCheck.api === 'healthy' ? 'healthy' :
      dbCheck.status === 'unhealthy' || redisCheck.status === 'unhealthy' ? 'unhealthy' : 'degraded'
    
    return {
      status: overallStatus,
      version: '11.0.0',
      timestamp: new Date(),
      checks: {
        database: dbCheck,
        redis: redisCheck,
        modules: modulesCheck,
        services: servicesCheck
      }
    }
  }

  private async checkDatabase(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    try {
      const startTime = Date.now()
      await prisma.$queryRaw`SELECT 1`
      const latency = Date.now() - startTime
      return { status: 'healthy', latency }
    } catch (error) {
      logError(error as Error, { context: 'Database health check' })
      return { status: 'unhealthy', latency: 0 }
    }
  }

  private async checkRedis(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    try {
      const startTime = Date.now()
      await redis.ping()
      const latency = Date.now() - startTime
      return { status: 'healthy', latency }
    } catch (error) {
      logError(error as Error, { context: 'Redis health check' })
      return { status: 'unhealthy', latency: 0 }
    }
  }

  private async checkModules(): Promise<{
    phase1: 'active' | 'inactive'
    phase2: 'active' | 'inactive'
    phase11: 'active' | 'inactive'
  }> {
    try {
      // Check if modules are loaded
      const phase1 = await this.checkModule('phase1')
      const phase2 = await this.checkModule('phase2')
      const phase11 = await this.checkModule('phase11')
      
      return {
        phase1: phase1 ? 'active' : 'inactive',
        phase2: phase2 ? 'active' : 'inactive',
        phase11: phase11 ? 'active' : 'inactive'
      }
    } catch (error) {
      logError(error as Error, { context: 'Modules health check' })
      return {
        phase1: 'inactive',
        phase2: 'inactive',
        phase11: 'inactive'
      }
    }
  }

  private async checkModule(moduleName: string): Promise<boolean> {
    try {
      await import(`../${moduleName}/index`)
      return true
    } catch {
      return false
    }
  }

  private async checkServices(): Promise<{
    api: 'healthy' | 'unhealthy'
    security: 'healthy' | 'unhealthy'
    observability: 'healthy' | 'unhealthy'
  }> {
    try {
      const apiHealthy = await this.checkService('api')
      const securityHealthy = await this.checkService('security')
      const observabilityHealthy = await this.checkService('observability')
      
      return {
        api: apiHealthy ? 'healthy' : 'unhealthy',
        security: securityHealthy ? 'healthy' : 'unhealthy',
        observability: observabilityHealthy ? 'healthy' : 'unhealthy'
      }
    } catch (error) {
      logError(error as Error, { context: 'Services health check' })
      return {
        api: 'unhealthy',
        security: 'unhealthy',
        observability: 'unhealthy'
      }
    }
  }

  private async checkService(serviceName: string): Promise<boolean> {
    try {
      // Simple check - in production, implement actual service checks
      return true
    } catch {
      return false
    }
  }
}

export const productionHealth = new ProductionHealth()

