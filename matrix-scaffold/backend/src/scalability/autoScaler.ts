/**
 * Auto-Scaler System
 * Phase 3: Advanced Scalability
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { getHealthStatus } from '../core/health'

export interface AutoScalerConfig {
  minInstances: number
  maxInstances: number
  targetCPU: number // Target CPU utilization (0-100)
  targetMemory: number // Target memory utilization (0-100)
  scaleUpThreshold: number
  scaleDownThreshold: number
  cooldownPeriod: number // Cooldown period in ms
}

export interface ScalingDecision {
  action: 'scale-up' | 'scale-down' | 'no-action'
  reason: string
  currentInstances: number
  targetInstances: number
  metrics: {
    cpu: number
    memory: number
    requests: number
  }
}

export class AutoScaler {
  private config: AutoScalerConfig = {
    minInstances: 1,
    maxInstances: 10,
    targetCPU: 70,
    targetMemory: 70,
    scaleUpThreshold: 80,
    scaleDownThreshold: 50,
    cooldownPeriod: 300000 // 5 minutes
  }
  private lastScalingAction: Date | null = null
  private currentInstances: number = 1

  constructor(config?: Partial<AutoScalerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
      this.currentInstances = this.config.minInstances
    }
  }

  /**
   * Evaluate scaling decision
   */
  async evaluate(): Promise<ScalingDecision> {
    try {
      // Check cooldown period
      if (this.lastScalingAction) {
        const timeSinceLastAction = Date.now() - this.lastScalingAction.getTime()
        if (timeSinceLastAction < this.config.cooldownPeriod) {
          return {
            action: 'no-action',
            reason: 'Cooldown period active',
            currentInstances: this.currentInstances,
            targetInstances: this.currentInstances,
            metrics: { cpu: 0, memory: 0, requests: 0 }
          }
        }
      }

      // Get current metrics
      const health = await getHealthStatus()
      const metrics = {
        cpu: this.getCPUUtilization(),
        memory: this.getMemoryUtilization(),
        requests: this.getRequestRate()
      }

      // Evaluate scaling decision
      const shouldScaleUp =
        metrics.cpu > this.config.scaleUpThreshold ||
        metrics.memory > this.config.scaleUpThreshold ||
        metrics.requests > 100 // High request rate

      const shouldScaleDown =
        metrics.cpu < this.config.scaleDownThreshold &&
        metrics.memory < this.config.scaleDownThreshold &&
        metrics.requests < 10 &&
        this.currentInstances > this.config.minInstances

      if (shouldScaleUp && this.currentInstances < this.config.maxInstances) {
        const targetInstances = Math.min(
          this.config.maxInstances,
          this.currentInstances + 1
        )

        return {
          action: 'scale-up',
          reason: `High resource utilization: CPU=${metrics.cpu}%, Memory=${metrics.memory}%`,
          currentInstances: this.currentInstances,
          targetInstances,
          metrics
        }
      }

      if (shouldScaleDown && this.currentInstances > this.config.minInstances) {
        const targetInstances = Math.max(
          this.config.minInstances,
          this.currentInstances - 1
        )

        return {
          action: 'scale-down',
          reason: `Low resource utilization: CPU=${metrics.cpu}%, Memory=${metrics.memory}%`,
          currentInstances: this.currentInstances,
          targetInstances,
          metrics
        }
      }

      return {
        action: 'no-action',
        reason: 'Metrics within thresholds',
        currentInstances: this.currentInstances,
        targetInstances: this.currentInstances,
        metrics
      }
    } catch (error: any) {
      logger.error('Auto-scaling evaluation failed:', error)
      return {
        action: 'no-action',
        reason: 'Evaluation failed',
        currentInstances: this.currentInstances,
        targetInstances: this.currentInstances,
        metrics: { cpu: 0, memory: 0, requests: 0 }
      }
    }
  }

  /**
   * Execute scaling action
   */
  async scale(decision: ScalingDecision): Promise<{ success: boolean; error?: string }> {
    try {
      if (decision.action === 'no-action') {
        return { success: true }
      }

      // In production, this would trigger actual scaling (e.g., Kubernetes, Cloud Run, etc.)
      logger.info(`Auto-scaling: ${decision.action}`, {
        currentInstances: decision.currentInstances,
        targetInstances: decision.targetInstances,
        reason: decision.reason
      })

      this.currentInstances = decision.targetInstances
      this.lastScalingAction = new Date()

      return { success: true }
    } catch (error: any) {
      logger.error('Auto-scaling execution failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Start auto-scaling monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    setInterval(async () => {
      try {
        const decision = await this.evaluate()

        if (decision.action !== 'no-action') {
          await this.scale(decision)
        }
      } catch (error) {
        logger.error('Auto-scaling monitoring error:', error)
      }
    }, intervalMs)

    logger.info('Auto-scaling monitoring started', {
      interval: intervalMs,
      config: this.config
    })
  }

  /**
   * Get CPU utilization (simplified)
   */
  private getCPUUtilization(): number {
    // In production, get actual CPU usage from system metrics
    const usage = process.cpuUsage()
    return Math.min(100, (usage.user + usage.system) / 1000000) // Simplified
  }

  /**
   * Get memory utilization
   */
  private getMemoryUtilization(): number {
    const usage = process.memoryUsage()
    const total = usage.heapTotal + usage.external
    const used = usage.heapUsed + usage.external
    return Math.min(100, (used / total) * 100)
  }

  /**
   * Get request rate (simplified)
   */
  private getRequestRate(): number {
    // In production, get actual request rate from metrics
    return 0 // Simplified
  }

  /**
   * Get auto-scaler statistics
   */
  getStats(): {
    currentInstances: number
    config: AutoScalerConfig
    lastScalingAction: string | null
  } {
    return {
      currentInstances: this.currentInstances,
      config: this.config,
      lastScalingAction: this.lastScalingAction?.toISOString() || null
    }
  }
}

// Global Auto-Scaler
export const autoScaler = new AutoScaler()

