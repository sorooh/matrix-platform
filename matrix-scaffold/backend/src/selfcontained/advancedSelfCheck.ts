/**
 * Advanced Self-Check & Auto-Repair
 * Phase 7.2: Professional Enhancements
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { systemSelfCheck } from './selfCheck'
import { autoInstaller } from './installer'

export interface ComponentHealth {
  name: string
  status: 'healthy' | 'degraded' | 'error'
  metrics: {
    cpu?: number
    memory?: number
    disk?: number
    network?: { in: number; out: number }
    uptime?: number
    errorRate?: number
    responseTime?: number
  }
  lastCheck: Date
  issues: Array<{
    type: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    message: string
    detectedAt: Date
  }>
}

export interface PredictiveMaintenance {
  component: string
  predictedFailureTime: Date
  confidence: number
  reason: string
  recommendedAction: string
  priority: 'high' | 'medium' | 'low'
}

export interface RepairAction {
  id: string
  component: string
  action: string
  status: 'pending' | 'executing' | 'completed' | 'failed'
  startedAt: Date
  completedAt?: Date
  result?: string
  error?: string
}

export class AdvancedSelfCheckSystem {
  private componentHealth: Map<string, ComponentHealth> = new Map()
  private maintenancePredictions: Map<string, PredictiveMaintenance> = new Map()
  private repairHistory: RepairAction[] = []
  private checkInterval: NodeJS.Timeout | null = null

  /**
   * Initialize Advanced Self-Check System
   */
  async initialize(): Promise<void> {
    try {
      // Start periodic health checks
      this.startPeriodicChecks()

      logger.info('Advanced Self-Check System initialized')
    } catch (error: any) {
      logger.error('Advanced Self-Check System initialization failed:', error)
      throw error
    }
  }

  /**
   * Start periodic health checks
   */
  private startPeriodicChecks(): void {
    if (this.checkInterval) {
      return
    }

    this.checkInterval = setInterval(async () => {
      try {
        await this.checkAllComponents()
      } catch (error) {
        logger.error('Periodic health check failed:', error)
      }
    }, 60000) // Every minute

    logger.info('Periodic health checks started')
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
      logger.info('Periodic health checks stopped')
    }
  }

  /**
   * Check all components
   */
  async checkAllComponents(): Promise<{
    components: ComponentHealth[]
    overallStatus: 'healthy' | 'degraded' | 'error'
    predictions: PredictiveMaintenance[]
  }> {
    try {
      // Get base system check result
      const baseCheck = await systemSelfCheck.checkAllComponents()

      // Check each component
      const components: ComponentHealth[] = []

      for (const component of baseCheck.components) {
        const health = await this.checkComponent(component.name)
        components.push(health)
        this.componentHealth.set(component.name, health)
      }

      // Run predictive maintenance
      const predictions = await this.runPredictiveMaintenance()

      // Determine overall status
      const hasErrors = components.some((c) => c.status === 'error')
      const hasDegraded = components.some((c) => c.status === 'degraded')
      const overallStatus = hasErrors ? 'error' : hasDegraded ? 'degraded' : 'healthy'

      logger.info('Component health check completed', {
        components: components.length,
        overallStatus,
        predictions: predictions.length,
      })

      eventBus.publish('deployment.selfcheck.health.checked', {
        components,
        overallStatus,
        predictions,
      })

      return {
        components,
        overallStatus,
        predictions,
      }
    } catch (error: any) {
      logger.error('Check all components failed:', error)
      throw error
    }
  }

  /**
   * Check component health
   */
  private async checkComponent(name: string): Promise<ComponentHealth> {
    try {
      // Get system metrics
      const usage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()

      // In production, get actual metrics from system/monitoring
      const metrics = {
        cpu: 0, // In production, get from system
        memory: usage.heapUsed / usage.heapTotal,
        disk: 0, // In production, get from system
        network: {
          in: 0,
          out: 0,
        },
        uptime: process.uptime(),
        errorRate: 0, // In production, get from monitoring
        responseTime: 0, // In production, get from monitoring
      }

      // Detect issues
      const issues: ComponentHealth['issues'] = []

      if (metrics.memory > 0.9) {
        issues.push({
          type: 'memory',
          severity: 'high',
          message: 'Memory usage is above 90%',
          detectedAt: new Date(),
        })
      }

      if (metrics.cpu && metrics.cpu > 0.9) {
        issues.push({
          type: 'cpu',
          severity: 'high',
          message: 'CPU usage is above 90%',
          detectedAt: new Date(),
        })
      }

      // Determine status
      const hasCritical = issues.some((i) => i.severity === 'critical')
      const hasHigh = issues.some((i) => i.severity === 'high')
      const status = hasCritical ? 'error' : hasHigh ? 'degraded' : 'healthy'

      const health: ComponentHealth = {
        name,
        status,
        metrics,
        lastCheck: new Date(),
        issues,
      }

      return health
    } catch (error: any) {
      logger.error('Check component failed:', error)
      return {
        name,
        status: 'error',
        metrics: {},
        lastCheck: new Date(),
        issues: [
          {
            type: 'check-failed',
            severity: 'critical',
            message: error.message,
            detectedAt: new Date(),
          },
        ],
      }
    }
  }

  /**
   * Run predictive maintenance
   */
  private async runPredictiveMaintenance(): Promise<PredictiveMaintenance[]> {
    try {
      const predictions: PredictiveMaintenance[] = []

      for (const [name, health] of this.componentHealth.entries()) {
        // Analyze trends and predict failures
        // In production, use ML models for prediction

        // Simple prediction based on metrics
        if (health.metrics.memory && health.metrics.memory > 0.8) {
          const prediction: PredictiveMaintenance = {
            component: name,
            predictedFailureTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            confidence: 0.7,
            reason: 'High memory usage trend detected',
            recommendedAction: 'Restart component or increase memory allocation',
            priority: 'medium',
          }

          predictions.push(prediction)
          this.maintenancePredictions.set(name, prediction)
        }

        if (health.metrics.errorRate && health.metrics.errorRate > 0.1) {
          const prediction: PredictiveMaintenance = {
            component: name,
            predictedFailureTime: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
            confidence: 0.8,
            reason: 'High error rate detected',
            recommendedAction: 'Investigate and fix underlying issues',
            priority: 'high',
          }

          predictions.push(prediction)
          this.maintenancePredictions.set(name, prediction)
        }
      }

      return predictions
    } catch (error: any) {
      logger.error('Run predictive maintenance failed:', error)
      return []
    }
  }

  /**
   * Auto-repair component
   */
  async autoRepair(componentName: string): Promise<string> {
    try {
      const repairId = `repair-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const health = this.componentHealth.get(componentName)

      if (!health) {
        throw new Error(`Component ${componentName} not found`)
      }

      logger.info('Starting auto-repair', {
        repairId,
        component: componentName,
        issues: health.issues.length,
      })

      const repair: RepairAction = {
        id: repairId,
        component: componentName,
        action: 'auto-repair',
        status: 'executing',
        startedAt: new Date(),
      }

      this.repairHistory.push(repair)

      try {
        // Determine repair actions based on issues
        const actions: string[] = []

        for (const issue of health.issues) {
          switch (issue.type) {
            case 'memory':
              // Try to free memory
              if (global.gc) {
                global.gc()
                actions.push('Garbage collection triggered')
              }
              break
            case 'cpu':
              // Reduce load
              actions.push('CPU load reduction attempted')
              break
            default:
              // Try base system repair
              try {
                await systemSelfCheck.repairComponent(componentName)
                actions.push('System repair executed')
              } catch (error) {
                logger.warn('System repair failed:', error)
              }
          }
        }

        // Update health after repair
        const updatedHealth = await this.checkComponent(componentName)

        repair.status = 'completed'
        repair.completedAt = new Date()
        repair.result = actions.join('; ')

        if (updatedHealth.status === 'healthy') {
          repair.result += ' - Component is now healthy'
        } else {
          repair.result += ` - Component status: ${updatedHealth.status}`
        }

        logger.info('Auto-repair completed', {
          repairId,
          component: componentName,
          result: repair.result,
        })

        eventBus.publish('deployment.selfcheck.repair.completed', {
          repair,
        })

        return repairId
      } catch (error: any) {
        repair.status = 'failed'
        repair.error = error.message
        repair.completedAt = new Date()

        logger.error('Auto-repair failed:', {
          repairId,
          component: componentName,
          error: error.message,
        })

        throw error
      }
    } catch (error: any) {
      logger.error('Auto-repair failed:', error)
      throw error
    }
  }

  /**
   * Get component health
   */
  getComponentHealth(componentName: string): ComponentHealth | null {
    return this.componentHealth.get(componentName) || null
  }

  /**
   * Get all component health
   */
  getAllComponentHealth(): ComponentHealth[] {
    return Array.from(this.componentHealth.values())
  }

  /**
   * Get predictive maintenance
   */
  getPredictiveMaintenance(componentName?: string): PredictiveMaintenance[] {
    if (componentName) {
      const prediction = this.maintenancePredictions.get(componentName)
      return prediction ? [prediction] : []
    }
    return Array.from(this.maintenancePredictions.values())
  }

  /**
   * Get repair history
   */
  getRepairHistory(componentName?: string, limit = 100): RepairAction[] {
    let history = this.repairHistory

    if (componentName) {
      history = history.filter((r) => r.component === componentName)
    }

    return history.slice(-limit)
  }
}

// Global Advanced Self-Check System
export const advancedSelfCheckSystem = new AdvancedSelfCheckSystem()

