/**
 * Auto-Scaling & Resource Allocation System
 * Phase 5: Multi-Model & Advanced Intelligence Stage
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { multiModelSystem } from './multimodel'
import { gpuAccelerationSystem } from './gpu'
import { performanceProfilingSystem } from './profiling'
import { neuralLoadBalancer } from './loadbalancer'

export interface AutoScalingConfig {
  enabled: boolean
  minInstances: number
  maxInstances: number
  scaleUpThreshold: number // CPU/GPU utilization percentage
  scaleDownThreshold: number // CPU/GPU utilization percentage
  scaleUpCooldown: number // milliseconds
  scaleDownCooldown: number // milliseconds
  checkInterval: number // milliseconds
  targetResponseTime: number // milliseconds
}

export interface ScalingMetrics {
  cpuUtilization: number
  gpuUtilization: number
  memoryUsage: number
  activeRequests: number
  averageResponseTime: number
  requestsPerSecond: number
}

export interface ScalingDecision {
  action: 'scale-up' | 'scale-down' | 'no-action'
  reason: string
  currentInstances: number
  targetInstances: number
  metrics: ScalingMetrics
}

export class AutoScalingSystem {
  private config: AutoScalingConfig
  private currentInstances: number = 1
  private lastScaleUpTime: number = 0
  private lastScaleDownTime: number = 0
  private scalingInterval: NodeJS.Timeout | null = null
  private metricsHistory: ScalingMetrics[] = []

  constructor(config?: Partial<AutoScalingConfig>) {
    this.config = {
      enabled: config?.enabled !== false,
      minInstances: config?.minInstances || 1,
      maxInstances: config?.maxInstances || 10,
      scaleUpThreshold: config?.scaleUpThreshold || 80,
      scaleDownThreshold: config?.scaleDownThreshold || 30,
      scaleUpCooldown: config?.scaleUpCooldown || 60000, // 1 minute
      scaleDownCooldown: config?.scaleDownCooldown || 300000, // 5 minutes
      checkInterval: config?.checkInterval || 30000, // 30 seconds
      targetResponseTime: config?.targetResponseTime || 200,
    }

    if (this.config.enabled) {
      this.startScaling()
    }
  }

  /**
   * Start auto-scaling
   */
  startScaling(): void {
    if (this.scalingInterval) {
      return
    }

    this.scalingInterval = setInterval(async () => {
      try {
        await this.evaluateScaling()
      } catch (error) {
        logger.error('Auto-scaling evaluation failed:', error)
      }
    }, this.config.checkInterval)

    logger.info('Auto-scaling started', {
      config: this.config,
    })
  }

  /**
   * Stop auto-scaling
   */
  stopScaling(): void {
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval)
      this.scalingInterval = null
      logger.info('Auto-scaling stopped')
    }
  }

  /**
   * Evaluate scaling decision
   */
  async evaluateScaling(): Promise<ScalingDecision> {
    try {
      // Collect current metrics
      const metrics = await this.collectMetrics()

      // Store metrics history
      this.metricsHistory.push(metrics)
      if (this.metricsHistory.length > 10) {
        this.metricsHistory.shift()
      }

      // Make scaling decision
      const decision = this.makeScalingDecision(metrics)

      // Execute scaling if needed
      if (decision.action !== 'no-action') {
        await this.executeScaling(decision)
      }

      // Publish event
      eventBus.publish('neural.autoscaling.evaluated', {
        decision,
        metrics,
      })

      return decision
    } catch (error: any) {
      logger.error('Scaling evaluation failed:', error)
      return {
        action: 'no-action',
        reason: 'Evaluation failed',
        currentInstances: this.currentInstances,
        targetInstances: this.currentInstances,
        metrics: {
          cpuUtilization: 0,
          gpuUtilization: 0,
          memoryUsage: 0,
          activeRequests: 0,
          averageResponseTime: 0,
          requestsPerSecond: 0,
        },
      }
    }
  }

  /**
   * Collect current metrics
   */
  private async collectMetrics(): Promise<ScalingMetrics> {
    try {
      // Get load balancer stats
      const lbStats = neuralLoadBalancer.getStats()

      // Get GPU utilization
      const gpuStats = gpuAccelerationSystem.getActiveDevice()
        ? gpuAccelerationSystem.getStats(gpuAccelerationSystem.getActiveDevice()!.id)
        : null

      // Get performance stats
      const perfStats = performanceProfilingSystem.getPerformanceStats()

      // Get CPU utilization (simplified - in production, use actual CPU monitoring)
      const cpuUsage = process.cpuUsage()
      const cpuUtilization = Math.min(100, (cpuUsage.user + cpuUsage.system) / 1000000) // Simplified

      // Get memory usage
      const memoryUsage = process.memoryUsage().heapUsed

      return {
        cpuUtilization,
        gpuUtilization: gpuStats?.utilization || 0,
        memoryUsage,
        activeRequests: lbStats.activeConnections,
        averageResponseTime: perfStats.averageResponseTime,
        requestsPerSecond: lbStats.requestsPerSecond,
      }
    } catch (error: any) {
      logger.error('Collect metrics failed:', error)
      return {
        cpuUtilization: 0,
        gpuUtilization: 0,
        memoryUsage: 0,
        activeRequests: 0,
        averageResponseTime: 0,
        requestsPerSecond: 0,
      }
    }
  }

  /**
   * Make scaling decision
   */
  private makeScalingDecision(metrics: ScalingMetrics): ScalingDecision {
    try {
      const now = Date.now()
      const currentInstances = this.currentInstances

      // Check cooldown periods
      const canScaleUp = now - this.lastScaleUpTime >= this.config.scaleUpCooldown
      const canScaleDown = now - this.lastScaleDownTime >= this.config.scaleDownCooldown

      // Calculate average utilization
      const avgUtilization = Math.max(metrics.cpuUtilization, metrics.gpuUtilization)

      // Scale up conditions
      if (
        canScaleUp &&
        currentInstances < this.config.maxInstances &&
        (avgUtilization > this.config.scaleUpThreshold ||
          metrics.averageResponseTime > this.config.targetResponseTime ||
          metrics.activeRequests > currentInstances * 10)
      ) {
        const targetInstances = Math.min(
          this.config.maxInstances,
          currentInstances + Math.ceil((avgUtilization - this.config.scaleUpThreshold) / 20)
        )

        return {
          action: 'scale-up',
          reason: `High utilization (${avgUtilization.toFixed(1)}%) or slow response time (${metrics.averageResponseTime.toFixed(0)}ms)`,
          currentInstances,
          targetInstances,
          metrics,
        }
      }

      // Scale down conditions
      if (
        canScaleDown &&
        currentInstances > this.config.minInstances &&
        avgUtilization < this.config.scaleDownThreshold &&
        metrics.averageResponseTime < this.config.targetResponseTime * 0.8 &&
        metrics.activeRequests < currentInstances * 5
      ) {
        const targetInstances = Math.max(
          this.config.minInstances,
          currentInstances - Math.ceil((this.config.scaleDownThreshold - avgUtilization) / 20)
        )

        return {
          action: 'scale-down',
          reason: `Low utilization (${avgUtilization.toFixed(1)}%) and good performance`,
          currentInstances,
          targetInstances,
          metrics,
        }
      }

      return {
        action: 'no-action',
        reason: 'No scaling needed',
        currentInstances,
        targetInstances: currentInstances,
        metrics,
      }
    } catch (error: any) {
      logger.error('Make scaling decision failed:', error)
      return {
        action: 'no-action',
        reason: 'Decision failed',
        currentInstances: this.currentInstances,
        targetInstances: this.currentInstances,
        metrics,
      }
    }
  }

  /**
   * Execute scaling decision
   */
  private async executeScaling(decision: ScalingDecision): Promise<void> {
    try {
      if (decision.action === 'no-action') {
        return
      }

      const targetInstances = decision.targetInstances
      const difference = targetInstances - this.currentInstances

      if (decision.action === 'scale-up') {
        // Scale up: Enable more models or increase capacity
        logger.info('Scaling up', {
          from: this.currentInstances,
          to: targetInstances,
          reason: decision.reason,
        })

        // Enable additional models if available
        const models = multiModelSystem.getModels()
        const disabledModels = models.filter((m) => !m.config.enabled)

        for (let i = 0; i < Math.min(difference, disabledModels.length); i++) {
          await multiModelSystem.toggleModel(disabledModels[i].config.id, true)
        }

        this.currentInstances = targetInstances
        this.lastScaleUpTime = Date.now()
      } else if (decision.action === 'scale-down') {
        // Scale down: Disable models or decrease capacity
        logger.info('Scaling down', {
          from: this.currentInstances,
          to: targetInstances,
          reason: decision.reason,
        })

        // Disable least-used models
        const models = multiModelSystem.getModels()
        const enabledModels = models.filter((m) => m.config.enabled && m.loaded)
        enabledModels.sort((a, b) => a.stats.totalRequests - b.stats.totalRequests)

        for (let i = 0; i < Math.min(-difference, enabledModels.length); i++) {
          await multiModelSystem.toggleModel(enabledModels[i].config.id, false)
        }

        this.currentInstances = targetInstances
        this.lastScaleDownTime = Date.now()
      }

      eventBus.publish('neural.autoscaling.scaled', {
        action: decision.action,
        from: decision.currentInstances,
        to: targetInstances,
        reason: decision.reason,
      })

      logger.info('Scaling executed', {
        action: decision.action,
        from: decision.currentInstances,
        to: targetInstances,
      })
    } catch (error: any) {
      logger.error('Execute scaling failed:', error)
    }
  }

  /**
   * Get current metrics
   */
  async getCurrentMetrics(): Promise<ScalingMetrics> {
    return await this.collectMetrics()
  }

  /**
   * Get scaling history
   */
  getScalingHistory(): ScalingMetrics[] {
    return [...this.metricsHistory]
  }

  /**
   * Get configuration
   */
  getConfig(): AutoScalingConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AutoScalingConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    }

    // Restart scaling if interval changed
    if (config.checkInterval) {
      this.stopScaling()
      if (this.config.enabled) {
        this.startScaling()
      }
    }

    logger.info('Auto-scaling config updated', { config: this.config })
  }

  /**
   * Enable/disable auto-scaling
   */
  toggle(enabled: boolean): void {
    this.config.enabled = enabled

    if (enabled) {
      this.startScaling()
    } else {
      this.stopScaling()
    }

    logger.info('Auto-scaling toggled', { enabled })
  }
}

// Global Auto-Scaling System
export const autoScalingSystem = new AutoScalingSystem({
  enabled: true,
  minInstances: 1,
  maxInstances: 10,
  scaleUpThreshold: 80,
  scaleDownThreshold: 30,
  scaleUpCooldown: 60000,
  scaleDownCooldown: 300000,
  checkInterval: 30000,
  targetResponseTime: 200,
})

