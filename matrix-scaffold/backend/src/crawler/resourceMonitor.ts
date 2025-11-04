/**
 * Resource Monitor
 * Phase 6: AI Crawler & Simulation Environment
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'

export interface ResourceMetrics {
  timestamp: Date
  cpu: {
    usage: number // percentage
    loadAverage?: number[]
  }
  memory: {
    used: number // bytes
    free: number // bytes
    total: number // bytes
    percentage: number // percentage
  }
  network: {
    bytesIn: number
    bytesOut: number
    requests: number
  }
}

export interface ResourceLimits {
  maxMemory: number // bytes
  maxCpu: number // percentage
  maxNetwork: number // bytes per second
}

export class ResourceMonitor {
  private metrics: ResourceMetrics[] = []
  private limits: ResourceLimits
  private monitoring: boolean = false
  private interval: NodeJS.Timeout | null = null
  private checkInterval: number = 5000 // 5 seconds

  constructor(limits?: Partial<ResourceLimits>) {
    this.limits = {
      maxMemory: limits?.maxMemory || 2 * 1024 * 1024 * 1024, // 2GB default
      maxCpu: limits?.maxCpu || 80, // 80% default
      maxNetwork: limits?.maxNetwork || 10 * 1024 * 1024, // 10MB/s default
    }
  }

  /**
   * Start monitoring
   */
  startMonitoring(): void {
    if (this.monitoring) {
      return
    }

    this.monitoring = true

    this.interval = setInterval(() => {
      try {
        const metrics = this.collectMetrics()
        this.metrics.push(metrics)

        // Keep only last 100 metrics
        if (this.metrics.length > 100) {
          this.metrics.shift()
        }

        // Check limits
        this.checkLimits(metrics)

        eventBus.publish('crawler.resources.monitored', {
          metrics,
        })
      } catch (error: any) {
        logger.error('Resource monitoring failed:', error)
      }
    }, this.checkInterval)

    logger.info('Resource monitoring started', {
      interval: this.checkInterval,
      limits: this.limits,
    })
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.monitoring) {
      return
    }

    this.monitoring = false

    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }

    logger.info('Resource monitoring stopped')
  }

  /**
   * Collect current metrics
   */
  collectMetrics(): ResourceMetrics {
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    // Calculate CPU percentage (simplified)
    const cpuPercentage = Math.min(100, (cpuUsage.user + cpuUsage.system) / 1000000)

    const metrics: ResourceMetrics = {
      timestamp: new Date(),
      cpu: {
        usage: cpuPercentage,
      },
      memory: {
        used: memUsage.heapUsed,
        free: memUsage.heapTotal - memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      },
      network: {
        bytesIn: 0, // TODO: Implement actual network monitoring
        bytesOut: 0,
        requests: 0,
      },
    }

    return metrics
  }

  /**
   * Check resource limits
   */
  private checkLimits(metrics: ResourceMetrics): void {
    const warnings: string[] = []

    // Check memory
    if (metrics.memory.used > this.limits.maxMemory) {
      warnings.push(`Memory usage ${(metrics.memory.used / 1024 / 1024).toFixed(0)}MB exceeds limit ${(this.limits.maxMemory / 1024 / 1024).toFixed(0)}MB`)
      logger.warn('Memory limit exceeded', {
        used: metrics.memory.used,
        limit: this.limits.maxMemory,
      })

      eventBus.publish('crawler.resources.limit.exceeded', {
        type: 'memory',
        used: metrics.memory.used,
        limit: this.limits.maxMemory,
      })
    }

    // Check CPU
    if (metrics.cpu.usage > this.limits.maxCpu) {
      warnings.push(`CPU usage ${metrics.cpu.usage.toFixed(1)}% exceeds limit ${this.limits.maxCpu}%`)
      logger.warn('CPU limit exceeded', {
        usage: metrics.cpu.usage,
        limit: this.limits.maxCpu,
      })

      eventBus.publish('crawler.resources.limit.exceeded', {
        type: 'cpu',
        used: metrics.cpu.usage,
        limit: this.limits.maxCpu,
      })
    }

    if (warnings.length > 0) {
      logger.warn('Resource limits exceeded', { warnings })
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): ResourceMetrics {
    return this.collectMetrics()
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): ResourceMetrics[] {
    return [...this.metrics]
  }

  /**
   * Get average metrics
   */
  getAverageMetrics(): {
    cpu: number
    memory: number
    network: { bytesIn: number; bytesOut: number }
  } {
    if (this.metrics.length === 0) {
      return {
        cpu: 0,
        memory: 0,
        network: { bytesIn: 0, bytesOut: 0 },
      }
    }

    const avgCpu = this.metrics.reduce((sum, m) => sum + m.cpu.usage, 0) / this.metrics.length
    const avgMemory = this.metrics.reduce((sum, m) => sum + m.memory.percentage, 0) / this.metrics.length
    const avgBytesIn = this.metrics.reduce((sum, m) => sum + m.network.bytesIn, 0) / this.metrics.length
    const avgBytesOut = this.metrics.reduce((sum, m) => sum + m.network.bytesOut, 0) / this.metrics.length

    return {
      cpu: avgCpu,
      memory: avgMemory,
      network: {
        bytesIn: avgBytesIn,
        bytesOut: avgBytesOut,
      },
    }
  }

  /**
   * Update limits
   */
  updateLimits(limits: Partial<ResourceLimits>): void {
    this.limits = {
      ...this.limits,
      ...limits,
    }

    logger.info('Resource limits updated', { limits: this.limits })
  }

  /**
   * Get limits
   */
  getLimits(): ResourceLimits {
    return { ...this.limits }
  }
}

// Global Resource Monitor
export const resourceMonitor = new ResourceMonitor()

