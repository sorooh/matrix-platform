/**
 * Neural Load Balancer System
 * Phase 5: Multi-Model & Advanced Intelligence Stage
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { multiModelSystem } from './multimodel'
import { gpuAccelerationSystem } from './gpu'
import { performanceProfilingSystem } from './profiling'

export interface LoadBalancerConfig {
  strategy: 'round-robin' | 'least-connections' | 'weighted' | 'performance-based'
  healthCheckInterval: number // milliseconds
  maxRetries: number
  timeout: number // milliseconds
  enableHealthChecks: boolean
}

export interface LoadBalancerStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  requestsPerSecond: number
  activeConnections: number
  modelDistribution: Record<string, number> // Model ID -> Request count
}

export class NeuralLoadBalancer {
  private config: LoadBalancerConfig
  private requestCount: number = 0
  private successfulRequests: number = 0
  private failedRequests: number = 0
  private totalResponseTime: number = 0
  private modelDistribution: Map<string, number> = new Map()
  private activeConnections: number = 0
  private healthCheckInterval: NodeJS.Timeout | null = null
  private startTime: Date = new Date()

  constructor(config?: Partial<LoadBalancerConfig>) {
    this.config = {
      strategy: config?.strategy || 'performance-based',
      healthCheckInterval: config?.healthCheckInterval || 30000, // 30 seconds
      maxRetries: config?.maxRetries || 3,
      timeout: config?.timeout || 5000, // 5 seconds
      enableHealthChecks: config?.enableHealthChecks !== false,
    }

    if (this.config.enableHealthChecks) {
      this.startHealthChecks()
    }
  }

  /**
   * Route request to best model
   */
  async routeRequest(
    prompt: string,
    requirements?: {
      type?: 'general' | 'specialized' | 'fine-tuned'
      capability?: string
      maxTokens?: number
      temperature?: number
      systemPrompt?: string
      context?: string[]
    }
  ): Promise<{
    success: boolean
    response?: any
    modelId?: string
    retries?: number
    error?: string
  }> {
    const startTime = Date.now()
    this.requestCount++
    this.activeConnections++

    try {
      let retries = 0
      let lastError: Error | null = null

      while (retries < this.config.maxRetries) {
        try {
          // Select model based on strategy
          const modelId = this.selectModel(requirements)

          if (!modelId) {
            throw new Error('No available model found')
          }

          // Generate response
          const result = await multiModelSystem.generate(prompt, {
            ...requirements,
            type: requirements?.type,
            capability: requirements?.capability,
          })

          if (!result.success) {
            throw new Error(result.error || 'Generation failed')
          }

          const responseTime = Date.now() - startTime
          this.totalResponseTime += responseTime
          this.successfulRequests++

          // Update model distribution
          const currentCount = this.modelDistribution.get(modelId) || 0
          this.modelDistribution.set(modelId, currentCount + 1)

          // Record metrics
          this.recordMetrics(modelId, responseTime, true)

          logger.info('Request routed successfully', {
            modelId,
            responseTime,
            retries,
          })

          return {
            success: true,
            response: result.response,
            modelId,
            retries,
          }
        } catch (error: any) {
          lastError = error
          retries++

          if (retries < this.config.maxRetries) {
            logger.warn('Request failed, retrying', {
              retry: retries,
              maxRetries: this.config.maxRetries,
              error: error.message,
            })

            // Wait before retry (exponential backoff)
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 100))
          }
        }
      }

      // All retries failed
      const responseTime = Date.now() - startTime
      this.failedRequests++
      this.recordMetrics('unknown', responseTime, false)

      logger.error('Request failed after all retries', {
        retries,
        error: lastError?.message,
      })

      return {
        success: false,
        retries,
        error: lastError?.message || 'Request failed after all retries',
      }
    } finally {
      this.activeConnections--
    }
  }

  /**
   * Select model based on strategy
   */
  private selectModel(requirements?: {
    type?: 'general' | 'specialized' | 'fine-tuned'
    capability?: string
    maxTokens?: number
  }): string | null {
    try {
      const models = multiModelSystem.getModels().filter((m) => m.config.enabled && m.loaded)

      if (models.length === 0) {
        return null
      }

      switch (this.config.strategy) {
        case 'round-robin':
          return this.roundRobinSelection(models)
        case 'least-connections':
          return this.leastConnectionsSelection(models)
        case 'weighted':
          return this.weightedSelection(models)
        case 'performance-based':
          return this.performanceBasedSelection(models, requirements)
        default:
          return this.performanceBasedSelection(models, requirements)
      }
    } catch (error: any) {
      logger.error('Model selection failed:', error)
      return null
    }
  }

  /**
   * Round-robin selection
   */
  private roundRobinSelection(models: any[]): string {
    const index = this.requestCount % models.length
    return models[index].config.id
  }

  /**
   * Least connections selection
   */
  private leastConnectionsSelection(models: any[]): string {
    const sorted = [...models].sort((a, b) => a.activeRequests - b.activeRequests)
    return sorted[0].config.id
  }

  /**
   * Weighted selection (based on priority)
   */
  private weightedSelection(models: any[]): string {
    const totalWeight = models.reduce((sum, m) => sum + m.config.priority, 0)
    let random = Math.random() * totalWeight

    for (const model of models) {
      random -= model.config.priority
      if (random <= 0) {
        return model.config.id
      }
    }

    return models[0].config.id
  }

  /**
   * Performance-based selection
   */
  private performanceBasedSelection(
    models: any[],
    requirements?: {
      type?: 'general' | 'specialized' | 'fine-tuned'
      capability?: string
      maxTokens?: number
    }
  ): string {
    // Filter by requirements
    let filtered = models

    if (requirements?.type) {
      filtered = filtered.filter((m) => m.config.type === requirements.type)
    }

    if (requirements?.capability) {
      filtered = filtered.filter((m) => {
        const capabilities = (m.config.metadata?.capabilities as string[]) || []
        return capabilities.includes(requirements.capability!)
      })
    }

    if (requirements?.maxTokens) {
      filtered = filtered.filter((m) => m.config.maxTokens >= requirements.maxTokens!)
    }

    if (filtered.length === 0) {
      filtered = models
    }

    // Sort by performance (lower response time, lower error rate, lower active requests)
    filtered.sort((a, b) => {
      // First by error rate (lower is better)
      if (a.stats.errorRate !== b.stats.errorRate) {
        return a.stats.errorRate - b.stats.errorRate
      }

      // Then by average response time (lower is better)
      if (a.stats.averageResponseTime !== b.stats.averageResponseTime) {
        return a.stats.averageResponseTime - b.stats.averageResponseTime
      }

      // Then by active requests (lower is better)
      if (a.activeRequests !== b.activeRequests) {
        return a.activeRequests - b.activeRequests
      }

      // Finally by priority (higher is better)
      return b.config.priority - a.config.priority
    })

    return filtered[0].config.id
  }

  /**
   * Record metrics
   */
  private recordMetrics(modelId: string, responseTime: number, success: boolean): void {
    try {
      performanceProfilingSystem.recordMetrics({
        requestId: `request-${Date.now()}`,
        endpoint: '/api/neural/loadbalancer/route',
        method: 'POST',
        responseTime,
        tokens: 0,
        model: modelId,
        device: 'auto',
        memoryUsage: 0,
        timestamp: new Date(),
        metadata: {
          success,
          loadBalancer: true,
        },
      })
    } catch (error: any) {
      logger.error('Record metrics failed:', error)
    }
  }

  /**
   * Start health checks
   */
  startHealthChecks(): void {
    if (this.healthCheckInterval) {
      return
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks()
      } catch (error) {
        logger.error('Health check failed:', error)
      }
    }, this.config.healthCheckInterval)

    logger.info('Load balancer health checks started', {
      interval: this.config.healthCheckInterval,
    })
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
      logger.info('Load balancer health checks stopped')
    }
  }

  /**
   * Perform health checks
   */
  private async performHealthChecks(): Promise<void> {
    try {
      const models = multiModelSystem.getModels()

      for (const model of models) {
        if (!model.config.enabled) {
          continue
        }

        // Check if model is healthy
        const isHealthy = this.checkModelHealth(model)

        if (!isHealthy && model.loaded) {
          logger.warn('Model health check failed, unloading', {
            modelId: model.config.id,
          })

          // Unload unhealthy model
          await multiModelSystem.unloadModel(model.config.id)
        } else if (isHealthy && !model.loaded) {
          logger.info('Model health check passed, loading', {
            modelId: model.config.id,
          })

          // Load healthy model
          await multiModelSystem.loadModel(model.config.id)
        }
      }

      eventBus.publish('neural.loadbalancer.healthcheck', {
        timestamp: new Date(),
      })
    } catch (error: any) {
      logger.error('Health check failed:', error)
    }
  }

  /**
   * Check model health
   */
  private checkModelHealth(model: any): boolean {
    try {
      // Check if model has too many errors
      if (model.stats.errorRate > 0.5) {
        return false
      }

      // Check if model response time is too high
      if (model.stats.averageResponseTime > 1000) {
        return false
      }

      // Check if GPU is required but not available
      if (model.config.gpuRequired && !gpuAccelerationSystem.isGPUAvailable()) {
        return false
      }

      return true
    } catch (error: any) {
      logger.error('Model health check failed:', error)
      return false
    }
  }

  /**
   * Get load balancer statistics
   */
  getStats(): LoadBalancerStats {
    const uptime = (Date.now() - this.startTime.getTime()) / 1000 // seconds
    const requestsPerSecond = uptime > 0 ? this.requestCount / uptime : 0

    return {
      totalRequests: this.requestCount,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      averageResponseTime:
        this.successfulRequests > 0 ? this.totalResponseTime / this.successfulRequests : 0,
      requestsPerSecond,
      activeConnections: this.activeConnections,
      modelDistribution: Object.fromEntries(this.modelDistribution),
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoadBalancerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    }

    // Restart health checks if interval changed
    if (config.healthCheckInterval && this.config.enableHealthChecks) {
      this.stopHealthChecks()
      this.startHealthChecks()
    }

    logger.info('Load balancer config updated', { config: this.config })
  }

  /**
   * Get configuration
   */
  getConfig(): LoadBalancerConfig {
    return { ...this.config }
  }
}

// Global Neural Load Balancer
export const neuralLoadBalancer = new NeuralLoadBalancer({
  strategy: 'performance-based',
  healthCheckInterval: 30000,
  maxRetries: 3,
  timeout: 5000,
  enableHealthChecks: true,
})

