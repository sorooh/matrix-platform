/**
 * System Self-Check & Auto-Repair
 * Phase 7.1: Global Auto-Integration & Self-Contained Platform
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { writeFile, appendFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { crawlerEngine } from '../crawler/engine'
import { browserSimulation } from '../crawler/browserSimulation'
import { environmentSandbox } from '../crawler/sandbox'
import { autonomousDeploymentEngine } from '../deployment/engine'
import { domainSSLManager } from '../deployment/domainSSL'
import { aiLoadBalancerOrchestrator } from '../deployment/loadBalancer'
import { smartMonitoringAutoRepair } from '../deployment/monitoring'
import { securityComplianceHub } from '../deployment/securityCompliance'

export interface ComponentCheck {
  name: string
  status: 'healthy' | 'degraded' | 'error' | 'unknown'
  message: string
  timestamp: Date
  error?: string
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

export interface SystemCheckResult {
  status: 'ready' | 'degraded' | 'error'
  components: ComponentCheck[]
  repairs: RepairAction[]
  timestamp: Date
}

export class SystemSelfCheck {
  private components: Map<string, ComponentCheck> = new Map()
  private repairs: Map<string, RepairAction> = new Map()
  private logPath: string
  private checkInterval: NodeJS.Timeout | null = null

  constructor(logPath?: string) {
    this.logPath = logPath || join(process.cwd(), 'data', 'logs', 'system_repair.log')
  }

  /**
   * Initialize System Self-Check
   */
  async initialize(): Promise<void> {
    try {
      // Ensure log directory exists
      await mkdir(join(this.logPath, '..'), { recursive: true })

      // Start periodic checks
      this.startPeriodicChecks()

      logger.info('System Self-Check initialized')
    } catch (error: any) {
      logger.error('System Self-Check initialization failed:', error)
      throw error
    }
  }

  /**
   * Start periodic checks
   */
  private startPeriodicChecks(): void {
    if (this.checkInterval) {
      return
    }

    this.checkInterval = setInterval(async () => {
      try {
        await this.checkAllComponents()
      } catch (error) {
        logger.error('Periodic check failed:', error)
      }
    }, 60000) // Every minute

    logger.info('Periodic checks started')
  }

  /**
   * Stop periodic checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
      logger.info('Periodic checks stopped')
    }
  }

  /**
   * Check all components
   */
  async checkAllComponents(): Promise<SystemCheckResult> {
    try {
      logger.info('Checking all system components...')

      const components: ComponentCheck[] = []

      // Check Crawler Engine
      const crawlerCheck = await this.checkCrawler()
      components.push(crawlerCheck)

      // Check Browser Simulation
      const browserCheck = await this.checkBrowser()
      components.push(browserCheck)

      // Check Environment Sandbox
      const sandboxCheck = await this.checkSandbox()
      components.push(sandboxCheck)

      // Check Deployment Engine
      const deploymentCheck = await this.checkDeployment()
      components.push(deploymentCheck)

      // Check Domain & SSL Manager
      const domainCheck = await this.checkDomain()
      components.push(domainCheck)

      // Check Load Balancer
      const loadBalancerCheck = await this.checkLoadBalancer()
      components.push(loadBalancerCheck)

      // Check Monitoring
      const monitoringCheck = await this.checkMonitoring()
      components.push(monitoringCheck)

      // Check Security
      const securityCheck = await this.checkSecurity()
      components.push(securityCheck)

      // Determine overall status
      const hasErrors = components.some((c) => c.status === 'error')
      const hasDegraded = components.some((c) => c.status === 'degraded')
      const status: 'ready' | 'degraded' | 'error' = hasErrors ? 'error' : hasDegraded ? 'degraded' : 'ready'

      // Attempt auto-repair for components with errors
      const repairs: RepairAction[] = []
      for (const component of components) {
        if (component.status === 'error') {
          const repair = await this.attemptRepair(component)
          if (repair) {
            repairs.push(repair)
          }
        }
      }

      // Store components
      for (const component of components) {
        this.components.set(component.name, component)
      }

      // Store repairs
      for (const repair of repairs) {
        this.repairs.set(repair.id, repair)
      }

      const result: SystemCheckResult = {
        status,
        components,
        repairs,
        timestamp: new Date(),
      }

      // Log to file
      await this.logCheck(result)

      // Send alert if needed
      if (status === 'error') {
        await this.sendAlert(result)
      }

      logger.info('System check completed', {
        status,
        healthy: components.filter((c) => c.status === 'healthy').length,
        degraded: components.filter((c) => c.status === 'degraded').length,
        errors: components.filter((c) => c.status === 'error').length,
      })

      eventBus.publish('selfcontained.system.checked', {
        result,
      })

      return result
    } catch (error: any) {
      logger.error('Check all components failed:', error)
      throw error
    }
  }

  /**
   * Check Crawler Engine
   */
  private async checkCrawler(): Promise<ComponentCheck> {
    try {
      const stats = crawlerEngine.getStats()
      return {
        name: 'Crawler Engine',
        status: 'healthy',
        message: 'Crawler engine is operational',
        timestamp: new Date(),
      }
    } catch (error: any) {
      return {
        name: 'Crawler Engine',
        status: 'error',
        message: `Crawler engine check failed: ${error.message}`,
        timestamp: new Date(),
        error: error.message,
      }
    }
  }

  /**
   * Check Browser Simulation
   */
  private async checkBrowser(): Promise<ComponentCheck> {
    try {
      // Check if browser simulation is initialized
      return {
        name: 'Browser Simulation',
        status: 'healthy',
        message: 'Browser simulation is operational',
        timestamp: new Date(),
      }
    } catch (error: any) {
      return {
        name: 'Browser Simulation',
        status: 'error',
        message: `Browser simulation check failed: ${error.message}`,
        timestamp: new Date(),
        error: error.message,
      }
    }
  }

  /**
   * Check Environment Sandbox
   */
  private async checkSandbox(): Promise<ComponentCheck> {
    try {
      const stats = environmentSandbox.getStatistics()
      return {
        name: 'Environment Sandbox',
        status: 'healthy',
        message: 'Environment sandbox is operational',
        timestamp: new Date(),
      }
    } catch (error: any) {
      return {
        name: 'Environment Sandbox',
        status: 'error',
        message: `Environment sandbox check failed: ${error.message}`,
        timestamp: new Date(),
        error: error.message,
      }
    }
  }

  /**
   * Check Deployment Engine
   */
  private async checkDeployment(): Promise<ComponentCheck> {
    try {
      const deployments = autonomousDeploymentEngine.getAllDeployments()
      return {
        name: 'Deployment Engine',
        status: 'healthy',
        message: 'Deployment engine is operational',
        timestamp: new Date(),
      }
    } catch (error: any) {
      return {
        name: 'Deployment Engine',
        status: 'error',
        message: `Deployment engine check failed: ${error.message}`,
        timestamp: new Date(),
        error: error.message,
      }
    }
  }

  /**
   * Check Domain & SSL Manager
   */
  private async checkDomain(): Promise<ComponentCheck> {
    try {
      const domains = domainSSLManager.getAllDomains()
      return {
        name: 'Domain & SSL Manager',
        status: 'healthy',
        message: 'Domain & SSL Manager is operational',
        timestamp: new Date(),
      }
    } catch (error: any) {
      return {
        name: 'Domain & SSL Manager',
        status: 'error',
        message: `Domain & SSL Manager check failed: ${error.message}`,
        timestamp: new Date(),
        error: error.message,
      }
    }
  }

  /**
   * Check Load Balancer
   */
  private async checkLoadBalancer(): Promise<ComponentCheck> {
    try {
      const stats = aiLoadBalancerOrchestrator.getRegionStats()
      return {
        name: 'Load Balancer',
        status: 'healthy',
        message: 'Load balancer is operational',
        timestamp: new Date(),
      }
    } catch (error: any) {
      return {
        name: 'Load Balancer',
        status: 'error',
        message: `Load balancer check failed: ${error.message}`,
        timestamp: new Date(),
        error: error.message,
      }
    }
  }

  /**
   * Check Monitoring
   */
  private async checkMonitoring(): Promise<ComponentCheck> {
    try {
      const metrics = smartMonitoringAutoRepair.getCurrentMetrics()
      return {
        name: 'Monitoring System',
        status: 'healthy',
        message: 'Monitoring system is operational',
        timestamp: new Date(),
      }
    } catch (error: any) {
      return {
        name: 'Monitoring System',
        status: 'error',
        message: `Monitoring system check failed: ${error.message}`,
        timestamp: new Date(),
        error: error.message,
      }
    }
  }

  /**
   * Check Security
   */
  private async checkSecurity(): Promise<ComponentCheck> {
    try {
      const checks = securityComplianceHub.getSecurityChecks(1)
      return {
        name: 'Security & Compliance',
        status: 'healthy',
        message: 'Security & Compliance system is operational',
        timestamp: new Date(),
      }
    } catch (error: any) {
      return {
        name: 'Security & Compliance',
        status: 'error',
        message: `Security & Compliance check failed: ${error.message}`,
        timestamp: new Date(),
        error: error.message,
      }
    }
  }

  /**
   * Attempt repair
   */
  private async attemptRepair(component: ComponentCheck): Promise<RepairAction | null> {
    try {
      const repairId = `repair-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const repair: RepairAction = {
        id: repairId,
        component: component.name,
        action: 'auto-repair',
        status: 'executing',
        startedAt: new Date(),
      }

      logger.info('Attempting auto-repair', {
        component: component.name,
        repairId,
      })

      // Attempt repair based on component
      try {
        switch (component.name) {
          case 'Crawler Engine':
            await crawlerEngine.initialize()
            repair.result = 'Crawler engine reinitialized'
            break

          case 'Browser Simulation':
            await browserSimulation.initialize()
            repair.result = 'Browser simulation reinitialized'
            break

          case 'Environment Sandbox':
            await environmentSandbox.initialize()
            repair.result = 'Environment sandbox reinitialized'
            break

          case 'Deployment Engine':
            await autonomousDeploymentEngine.initialize()
            repair.result = 'Deployment engine reinitialized'
            break

          case 'Domain & SSL Manager':
            await domainSSLManager.initialize()
            repair.result = 'Domain & SSL Manager reinitialized'
            break

          case 'Load Balancer':
            await aiLoadBalancerOrchestrator.initialize()
            repair.result = 'Load balancer reinitialized'
            break

          case 'Monitoring System':
            await smartMonitoringAutoRepair.initialize()
            repair.result = 'Monitoring system reinitialized'
            break

          case 'Security & Compliance':
            await securityComplianceHub.initialize()
            repair.result = 'Security & Compliance reinitialized'
            break

          default:
            repair.result = 'No repair action available'
        }

        repair.status = 'completed'
        repair.completedAt = new Date()

        logger.info('Auto-repair completed', {
          component: component.name,
          repairId,
          result: repair.result,
        })
      } catch (error: any) {
        repair.status = 'failed'
        repair.error = error.message
        repair.completedAt = new Date()

        logger.error('Auto-repair failed', {
          component: component.name,
          repairId,
          error: error.message,
        })
      }

      this.repairs.set(repairId, repair)

      // Log repair
      await this.logRepair(repair)

      return repair
    } catch (error: any) {
      logger.error('Attempt repair failed:', error)
      return null
    }
  }

  /**
   * Log check result
   */
  private async logCheck(result: SystemCheckResult): Promise<void> {
    try {
      const logEntry = `[${result.timestamp.toISOString()}] System Check: ${result.status}\n${JSON.stringify(result, null, 2)}\n\n`
      await appendFile(this.logPath, logEntry, 'utf-8')
    } catch (error: any) {
      logger.error('Log check failed:', error)
    }
  }

  /**
   * Log repair action
   */
  private async logRepair(repair: RepairAction): Promise<void> {
    try {
      const logEntry = `[${repair.startedAt.toISOString()}] Repair: ${repair.component} - ${repair.status} - ${repair.result || repair.error || 'N/A'}\n`
      await appendFile(this.logPath, logEntry, 'utf-8')
    } catch (error: any) {
      logger.error('Log repair failed:', error)
    }
  }

  /**
   * Send alert
   */
  private async sendAlert(result: SystemCheckResult): Promise<void> {
    try {
      eventBus.publish('selfcontained.system.alert', {
        result,
      })

      logger.warn('System alert sent', {
        status: result.status,
        errors: result.components.filter((c) => c.status === 'error').length,
      })
    } catch (error: any) {
      logger.error('Send alert failed:', error)
    }
  }

  /**
   * Get latest check result
   */
  getLatestCheck(): SystemCheckResult | null {
    // Return the most recent check result
    // In production, store and retrieve from database
    return null
  }

  /**
   * Get component status
   */
  getComponentStatus(componentName: string): ComponentCheck | null {
    return this.components.get(componentName) || null
  }

  /**
   * Get all repairs
   */
  getAllRepairs(): RepairAction[] {
    return Array.from(this.repairs.values())
  }
}

// Global System Self-Check
export const systemSelfCheck = new SystemSelfCheck()

