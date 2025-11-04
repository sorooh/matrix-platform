/**
 * Intelligent Load Balancer
 * Phase 7.2: Professional Enhancements
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { aiLoadBalancerOrchestrator } from './loadBalancer'
import { smartMonitoringAutoRepair } from './monitoring'

export type RoutingAlgorithm = 'round-robin' | 'least-connections' | 'geographic' | 'latency-based' | 'cost-based' | 'user-based' | 'content-based' | 'ai-optimized'

export interface Route {
  id: string
  path: string
  method: string
  target: {
    region: string
    instance: string
    weight: number
  }
  algorithm: RoutingAlgorithm
  healthCheck: {
    enabled: boolean
    interval: number
    timeout: number
    path: string
  }
  circuitBreaker: {
    enabled: boolean
    failureThreshold: number
    successThreshold: number
    timeout: number
  }
  rateLimit: {
    enabled: boolean
    requestsPerSecond: number
    burst: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface RequestMetrics {
  routeId: string
  timestamp: Date
  responseTime: number
  statusCode: number
  error: boolean
  region: string
  instance: string
}

export interface LoadBalancerStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  avgResponseTime: number
  p50ResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  routes: Array<{
    routeId: string
    requests: number
    errors: number
    avgResponseTime: number
  }>
  regions: Array<{
    region: string
    requests: number
    avgResponseTime: number
    healthScore: number
  }>
}

export class IntelligentLoadBalancer {
  private routes: Map<string, Route> = new Map()
  private requestMetrics: RequestMetrics[] = []
  private circuitBreakers: Map<string, { failures: number; successes: number; state: 'closed' | 'open' | 'half-open'; lastFailure?: Date }> = new Map()

  /**
   * Initialize Intelligent Load Balancer
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Intelligent Load Balancer initialized')
    } catch (error: any) {
      logger.error('Load Balancer initialization failed:', error)
      throw error
    }
  }

  /**
   * Create route
   */
  async createRoute(config: {
    path: string
    method: string
    target: Route['target']
    algorithm?: RoutingAlgorithm
    healthCheck?: Partial<Route['healthCheck']>
    circuitBreaker?: Partial<Route['circuitBreaker']>
    rateLimit?: Partial<Route['rateLimit']>
  }): Promise<string> {
    try {
      const routeId = `route-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      const route: Route = {
        id: routeId,
        path: config.path,
        method: config.method,
        target: config.target,
        algorithm: config.algorithm || 'ai-optimized',
        healthCheck: {
          enabled: config.healthCheck?.enabled ?? true,
          interval: config.healthCheck?.interval || 30000,
          timeout: config.healthCheck?.timeout || 5000,
          path: config.healthCheck?.path || '/health',
        },
        circuitBreaker: {
          enabled: config.circuitBreaker?.enabled ?? true,
          failureThreshold: config.circuitBreaker?.failureThreshold || 5,
          successThreshold: config.circuitBreaker?.successThreshold || 2,
          timeout: config.circuitBreaker?.timeout || 60000,
        },
        rateLimit: {
          enabled: config.rateLimit?.enabled ?? false,
          requestsPerSecond: config.rateLimit?.requestsPerSecond || 100,
          burst: config.rateLimit?.burst || 200,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      this.routes.set(routeId, route)

      // Initialize circuit breaker
      if (route.circuitBreaker.enabled) {
        this.circuitBreakers.set(routeId, {
          failures: 0,
          successes: 0,
          state: 'closed',
        })
      }

      logger.info('Route created', {
        routeId,
        path: config.path,
        algorithm: route.algorithm,
      })

      eventBus.publish('deployment.loadbalancer.route.created', {
        route: {
          id: route.id,
          path: route.path,
          algorithm: route.algorithm,
        },
      })

      return routeId
    } catch (error: any) {
      logger.error('Create route failed:', error)
      throw error
    }
  }

  /**
   * Route request
   */
  async routeRequest(routeId: string, request: {
    path: string
    method: string
    headers?: Record<string, string>
    body?: unknown
    user?: {
      id: string
      location?: string
      preferences?: Record<string, unknown>
    }
  }): Promise<{
    region: string
    instance: string
    url: string
  }> {
    try {
      const route = this.routes.get(routeId)
      if (!route) {
        throw new Error(`Route ${routeId} not found`)
      }

      // Check circuit breaker
      if (route.circuitBreaker.enabled) {
        const circuitBreaker = this.circuitBreakers.get(routeId)!
        if (circuitBreaker.state === 'open') {
          // Check if timeout expired
          if (circuitBreaker.lastFailure && Date.now() - circuitBreaker.lastFailure.getTime() < route.circuitBreaker.timeout) {
            throw new Error('Circuit breaker is open')
          } else {
            // Transition to half-open
            circuitBreaker.state = 'half-open'
            circuitBreaker.successes = 0
          }
        }
      }

      // Select target based on algorithm
      const target = await this.selectTarget(route, request)

      // Perform health check if enabled
      if (route.healthCheck.enabled) {
        const healthy = await this.healthCheck(target.region, target.instance, route.healthCheck.path)
        if (!healthy) {
          throw new Error(`Target ${target.instance} in ${target.region} is unhealthy`)
        }
      }

      // Build URL
      const url = `https://${target.instance}.${target.region}.matrix-platform.com${request.path}`

      logger.debug('Request routed', {
        routeId,
        algorithm: route.algorithm,
        region: target.region,
        instance: target.instance,
      })

      return {
        region: target.region,
        instance: target.instance,
        url,
      }
    } catch (error: any) {
      logger.error('Route request failed:', error)
      throw error
    }
  }

  /**
   * Select target based on algorithm
   */
  private async selectTarget(route: Route, request: {
    path: string
    method: string
    headers?: Record<string, string>
    user?: {
      id: string
      location?: string
      preferences?: Record<string, unknown>
    }
  }): Promise<{ region: string; instance: string }> {
    try {
      switch (route.algorithm) {
        case 'round-robin':
          return this.roundRobinSelect(route)
        case 'least-connections':
          return this.leastConnectionsSelect(route)
        case 'geographic':
          return this.geographicSelect(route, request.user?.location)
        case 'latency-based':
          return this.latencyBasedSelect(route)
        case 'cost-based':
          return this.costBasedSelect(route)
        case 'user-based':
          return this.userBasedSelect(route, request.user)
        case 'content-based':
          return this.contentBasedSelect(route, request)
        case 'ai-optimized':
        default:
          return this.aiOptimizedSelect(route, request)
      }
    } catch (error: any) {
      logger.error('Select target failed:', error)
      // Fallback to round-robin
      return this.roundRobinSelect(route)
    }
  }

  /**
   * Round-robin selection
   */
  private roundRobinSelect(route: Route): { region: string; instance: string } {
    // Simplified - in production, use actual round-robin logic
    return {
      region: route.target.region,
      instance: route.target.instance,
    }
  }

  /**
   * Least connections selection
   */
  private leastConnectionsSelect(route: Route): { region: string; instance: string } {
    // In production, track active connections per instance
    return {
      region: route.target.region,
      instance: route.target.instance,
    }
  }

  /**
   * Geographic selection
   */
  private geographicSelect(route: Route, userLocation?: string): { region: string; instance: string } {
    // In production, map user location to nearest region
    return {
      region: route.target.region,
      instance: route.target.instance,
    }
  }

  /**
   * Latency-based selection
   */
  private latencyBasedSelect(route: Route): { region: string; instance: string } {
    // In production, measure latency to each region and select lowest
    return {
      region: route.target.region,
      instance: route.target.instance,
    }
  }

  /**
   * Cost-based selection
   */
  private costBasedSelect(route: Route): { region: string; instance: string } {
    // In production, consider cloud costs per region
    return {
      region: route.target.region,
      instance: route.target.instance,
    }
  }

  /**
   * User-based selection
   */
  private userBasedSelect(route: Route, user?: { id: string; location?: string; preferences?: Record<string, unknown> }): { region: string; instance: string } {
    // In production, route based on user preferences or history
    return {
      region: route.target.region,
      instance: route.target.instance,
    }
  }

  /**
   * Content-based selection
   */
  private contentBasedSelect(route: Route, request: { path: string; method: string; headers?: Record<string, string> }): { region: string; instance: string } {
    // In production, route based on request content/headers
    return {
      region: route.target.region,
      instance: route.target.instance,
    }
  }

  /**
   * AI-optimized selection
   */
  private async aiOptimizedSelect(route: Route, request: {
    path: string
    method: string
    headers?: Record<string, string>
    user?: {
      id: string
      location?: string
      preferences?: Record<string, unknown>
    }
  }): Promise<{ region: string; instance: string }> {
    try {
      // Get metrics
      const metrics = smartMonitoringAutoRepair.getCurrentMetrics()
      const regionStats = aiLoadBalancerOrchestrator.getRegionStats()

      // In production, use ML model to predict best region/instance
      // Consider: latency, cost, load, user location, historical performance

      // Simplified: select region with lowest load
      const bestRegion = regionStats.regions.reduce((best, region) => {
        return region.currentLoad < best.currentLoad ? region : best
      }, regionStats.regions[0])

      return {
        region: bestRegion.id,
        instance: 'instance-1', // In production, select actual instance
      }
    } catch (error: any) {
      logger.error('AI-optimized select failed:', error)
      // Fallback
      return {
        region: route.target.region,
        instance: route.target.instance,
      }
    }
  }

  /**
   * Health check
   */
  private async healthCheck(region: string, instance: string, path: string): Promise<boolean> {
    try {
      // In production, perform actual HTTP health check
      const url = `https://${instance}.${region}.matrix-platform.com${path}`
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Record request metrics
   */
  recordRequestMetrics(routeId: string, metrics: {
    responseTime: number
    statusCode: number
    error: boolean
    region: string
    instance: string
  }): void {
    try {
      const requestMetric: RequestMetrics = {
        routeId,
        timestamp: new Date(),
        ...metrics,
      }

      this.requestMetrics.push(requestMetric)

      // Keep only last 100000 metrics
      if (this.requestMetrics.length > 100000) {
        this.requestMetrics = this.requestMetrics.slice(-100000)
      }

      // Update circuit breaker
      const route = this.routes.get(routeId)
      if (route && route.circuitBreaker.enabled) {
        const circuitBreaker = this.circuitBreakers.get(routeId)!
        if (metrics.error) {
          circuitBreaker.failures++
          circuitBreaker.lastFailure = new Date()
          if (circuitBreaker.failures >= route.circuitBreaker.failureThreshold) {
            circuitBreaker.state = 'open'
            logger.warn('Circuit breaker opened', { routeId, failures: circuitBreaker.failures })
          }
        } else {
          circuitBreaker.successes++
          if (circuitBreaker.state === 'half-open' && circuitBreaker.successes >= route.circuitBreaker.successThreshold) {
            circuitBreaker.state = 'closed'
            circuitBreaker.failures = 0
            logger.info('Circuit breaker closed', { routeId })
          }
        }
      }
    } catch (error: any) {
      logger.error('Record request metrics failed:', error)
    }
  }

  /**
   * Get load balancer stats
   */
  getStats(): LoadBalancerStats {
    try {
      const recentMetrics = this.requestMetrics.filter((m) => {
        const age = Date.now() - m.timestamp.getTime()
        return age < 3600000 // Last hour
      })

      const responseTimes = recentMetrics.map((m) => m.responseTime).sort((a, b) => a - b)

      const stats: LoadBalancerStats = {
        totalRequests: recentMetrics.length,
        successfulRequests: recentMetrics.filter((m) => !m.error && m.statusCode < 400).length,
        failedRequests: recentMetrics.filter((m) => m.error || m.statusCode >= 400).length,
        avgResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
        p50ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.5)] || 0,
        p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
        p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,
        routes: [],
        regions: [],
      }

      // Calculate route stats
      const routeStats = new Map<string, { requests: number; errors: number; responseTime: number }>()
      for (const metric of recentMetrics) {
        const routeStat = routeStats.get(metric.routeId) || { requests: 0, errors: 0, responseTime: 0 }
        routeStat.requests++
        if (metric.error || metric.statusCode >= 400) {
          routeStat.errors++
        }
        routeStat.responseTime = (routeStat.responseTime + metric.responseTime) / 2
        routeStats.set(metric.routeId, routeStat)
      }

      stats.routes = Array.from(routeStats.entries()).map(([routeId, stat]) => ({
        routeId,
        ...stat,
      }))

      // Calculate region stats
      const regionStats = new Map<string, { requests: number; responseTime: number }>()
      for (const metric of recentMetrics) {
        const regionStat = regionStats.get(metric.region) || { requests: 0, responseTime: 0 }
        regionStat.requests++
        regionStat.responseTime = (regionStat.responseTime + metric.responseTime) / 2
        regionStats.set(metric.region, regionStat)
      }

      stats.regions = Array.from(regionStats.entries()).map(([region, stat]) => ({
        region,
        ...stat,
        healthScore: 100, // In production, calculate actual health score
      }))

      return stats
    } catch (error: any) {
      logger.error('Get stats failed:', error)
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        routes: [],
        regions: [],
      }
    }
  }

  /**
   * Get route
   */
  getRoute(routeId: string): Route | null {
    return this.routes.get(routeId) || null
  }

  /**
   * Get all routes
   */
  getAllRoutes(): Route[] {
    return Array.from(this.routes.values())
  }
}

// Global Intelligent Load Balancer
export const intelligentLoadBalancer = new IntelligentLoadBalancer()

