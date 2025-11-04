/**
 * Real-Time Deployment Dashboard
 * Phase 7.2: Professional Enhancements
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { autonomousDeploymentEngine } from './engine'
import { domainSSLManager } from './domainSSL'
import { aiLoadBalancerOrchestrator } from './loadBalancer'
import { smartMonitoringAutoRepair } from './monitoring'
import { securityComplianceHub } from './securityCompliance'
import { advancedDeploymentStrategies } from './strategies'
import { multiCloudSupport } from './multicloud'
import { autoInstaller } from '../selfcontained/installer'
import { systemSelfCheck } from '../selfcontained/selfCheck'

export interface DashboardOverview {
  deployments: {
    total: number
    running: number
    failed: number
    pending: number
    blueGreen: number
    canary: number
    rolling: number
    abTest: number
  }
  domains: {
    total: number
    active: number
    error: number
    sslExpiring: number
  }
  regions: {
    total: number
    active: number
    utilization: number
    regions: Array<{
      id: string
      name: string
      location: string
      status: string
      load: number
      healthScore: number
    }>
  }
  instances: {
    total: number
    running: number
    stopped: number
    degraded: number
  }
  monitoring: {
    metrics: {
      cpu: number
      memory: number
      network: { in: number; out: number }
      uptime: number
      errorRate: number
      responseTime: number
    } | null
    openIncidents: number
    recentIncidents: Array<{
      id: string
      type: string
      severity: string
      status: string
      detectedAt: Date
    }>
  }
  compliance: {
    gdpr: boolean
    iso27001: boolean
    soc2: boolean
    securityChecks: {
      passed: number
      failed: number
      warnings: number
    }
  }
  system: {
    readiness: {
      status: 'ready' | 'missing' | 'error'
      icon: string
      dependencies: Array<{
        name: string
        status: string
        version?: string
      }>
    }
    components: Array<{
      name: string
      status: 'healthy' | 'degraded' | 'error'
      message: string
    }>
  }
  multicloud: {
    providers: string[]
    deployments: number
    activeRegions: number
  }
}

export interface DashboardMetrics {
  deployments: {
    hourly: Array<{ hour: string; count: number }>
    daily: Array<{ day: string; count: number }>
    byStatus: Record<string, number>
  }
  performance: {
    avgDeploymentTime: number
    avgResponseTime: number
    uptime: number
    errorRate: number
  }
  costs: {
    estimated: number
    byProvider: Record<string, number>
    byRegion: Record<string, number>
  }
}

export class RealTimeDashboard {
  private overview: DashboardOverview | null = null
  private metrics: DashboardMetrics | null = null
  private updateInterval: NodeJS.Timeout | null = null

  /**
   * Initialize Real-Time Dashboard
   */
  async initialize(): Promise<void> {
    try {
      // Start periodic updates
      this.startPeriodicUpdates()

      logger.info('Real-Time Dashboard initialized')
    } catch (error: any) {
      logger.error('Dashboard initialization failed:', error)
      throw error
    }
  }

  /**
   * Start periodic updates
   */
  private startPeriodicUpdates(): void {
    if (this.updateInterval) {
      return
    }

    this.updateInterval = setInterval(async () => {
      try {
        await this.updateOverview()
        await this.updateMetrics()
      } catch (error) {
        logger.error('Dashboard update failed:', error)
      }
    }, 30000) // Every 30 seconds

    logger.info('Dashboard periodic updates started')
  }

  /**
   * Stop periodic updates
   */
  stopPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
      logger.info('Dashboard periodic updates stopped')
    }
  }

  /**
   * Get dashboard overview
   */
  async getOverview(): Promise<DashboardOverview> {
    try {
      if (!this.overview) {
        await this.updateOverview()
      }

      return this.overview!
    } catch (error: any) {
      logger.error('Get dashboard overview failed:', error)
      throw error
    }
  }

  /**
   * Update overview
   */
  private async updateOverview(): Promise<void> {
    try {
      // Get deployments
      const deployments = autonomousDeploymentEngine.getAllDeployments()
      const blueGreenDeployments = Array.from(advancedDeploymentStrategies['blueGreenDeployments'].values())
      const canaryDeployments = Array.from(advancedDeploymentStrategies['canaryDeployments'].values())
      const rollingDeployments = Array.from(advancedDeploymentStrategies['rollingDeployments'].values())
      const abTestDeployments = Array.from(advancedDeploymentStrategies['abTestDeployments'].values())

      // Get domains
      const domains = domainSSLManager.getAllDomains()

      // Get regions
      const regionStats = aiLoadBalancerOrchestrator.getRegionStats()

      // Get instances
      const instanceStats = aiLoadBalancerOrchestrator.getInstanceStats()

      // Get monitoring
      const metrics = smartMonitoringAutoRepair.getCurrentMetrics()
      const incidents = smartMonitoringAutoRepair.getOpenIncidents()

      // Get compliance
      const complianceStatus = await securityComplianceHub.getComplianceStatus()
      const securityChecks = securityComplianceHub.getSecurityChecks()

      // Get system readiness
      const readiness = autoInstaller.getSystemReadiness()

      // Get system components
      const checkResult = await systemSelfCheck.checkAllComponents()

      // Get multi-cloud
      const multicloudDeployments = multiCloudSupport.getAllDeployments()

      const overview: DashboardOverview = {
        deployments: {
          total: deployments.length,
          running: deployments.filter((d) => d.status === 'completed').length,
          failed: deployments.filter((d) => d.status === 'failed').length,
          pending: deployments.filter((d) => d.status === 'pending').length,
          blueGreen: blueGreenDeployments.length,
          canary: canaryDeployments.length,
          rolling: rollingDeployments.length,
          abTest: abTestDeployments.length,
        },
        domains: {
          total: domains.length,
          active: domains.filter((d) => d.status === 'active').length,
          error: domains.filter((d) => d.status === 'error').length,
          sslExpiring: domains.filter((d) => {
            const ssl = d.ssl
            if (!ssl || !ssl.expiresAt) return false
            const daysUntilExpiry = (ssl.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            return daysUntilExpiry < 30 && daysUntilExpiry > 0
          }).length,
        },
        regions: {
          total: regionStats.totalRegions,
          active: regionStats.activeRegions,
          utilization: regionStats.utilization,
          regions: regionStats.regions.map((r) => ({
            id: r.id,
            name: r.name,
            location: r.location,
            status: r.status,
            load: r.currentLoad,
            healthScore: r.healthScore,
          })),
        },
        instances: {
          total: instanceStats.totalInstances,
          running: instanceStats.runningInstances,
          stopped: instanceStats.stoppedInstances,
          degraded: instanceStats.degradedInstances,
        },
        monitoring: {
          metrics,
          openIncidents: incidents.length,
          recentIncidents: incidents.slice(0, 10).map((i) => ({
            id: i.id,
            type: i.type,
            severity: i.severity,
            status: i.status,
            detectedAt: i.detectedAt,
          })),
        },
        compliance: {
          gdpr: complianceStatus.gdpr.compliant,
          iso27001: complianceStatus.iso27001.compliant,
          soc2: complianceStatus.soc2.compliant,
          securityChecks: {
            passed: securityChecks.filter((c) => c.status === 'passed').length,
            failed: securityChecks.filter((c) => c.status === 'failed').length,
            warnings: securityChecks.filter((c) => c.status === 'warning').length,
          },
        },
        system: {
          readiness: {
            status: readiness?.status || 'error',
            icon: readiness ? autoInstaller.getReadinessIcon() : '❌',
            dependencies: readiness?.dependencies || [],
          },
          components: checkResult.components.map((c) => ({
            name: c.name,
            status: c.status,
            message: c.message,
          })),
        },
        multicloud: {
          providers: Array.from(new Set(multicloudDeployments.flatMap((d) => d.deployments.map((dep) => dep.provider)))),
          deployments: multicloudDeployments.length,
          activeRegions: Array.from(new Set(multicloudDeployments.flatMap((d) => d.deployments.map((dep) => dep.region)))).length,
        },
      }

      this.overview = overview

      logger.debug('Dashboard overview updated')
    } catch (error: any) {
      logger.error('Update dashboard overview failed:', error)
    }
  }

  /**
   * Get dashboard metrics
   */
  async getMetrics(): Promise<DashboardMetrics> {
    try {
      if (!this.metrics) {
        await this.updateMetrics()
      }

      return this.metrics!
    } catch (error: any) {
      logger.error('Get dashboard metrics failed:', error)
      throw error
    }
  }

  /**
   * Update metrics
   */
  private async updateMetrics(): Promise<void> {
    try {
      const deployments = autonomousDeploymentEngine.getAllDeployments()

      // Calculate hourly deployments (last 24 hours)
      const hourly: Array<{ hour: string; count: number }> = []
      const now = new Date()
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
        const hourStr = hour.toISOString().slice(0, 13) + ':00'
        const count = deployments.filter((d) => {
          const deployHour = new Date(d.startedAt).toISOString().slice(0, 13) + ':00'
          return deployHour === hourStr
        }).length
        hourly.push({ hour: hourStr, count })
      }

      // Calculate daily deployments (last 30 days)
      const daily: Array<{ day: string; count: number }> = []
      for (let i = 29; i >= 0; i--) {
        const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dayStr = day.toISOString().slice(0, 10)
        const count = deployments.filter((d) => {
          const deployDay = new Date(d.startedAt).toISOString().slice(0, 10)
          return deployDay === dayStr
        }).length
        daily.push({ day: dayStr, count })
      }

      // Calculate by status
      const byStatus: Record<string, number> = {}
      for (const deployment of deployments) {
        byStatus[deployment.status] = (byStatus[deployment.status] || 0) + 1
      }

      // Calculate performance metrics
      const completedDeployments = deployments.filter((d) => d.status === 'completed' && d.duration)
      const avgDeploymentTime = completedDeployments.length > 0
        ? completedDeployments.reduce((sum, d) => sum + (d.duration || 0), 0) / completedDeployments.length
        : 0

      const metrics = smartMonitoringAutoRepair.getCurrentMetrics()
      const avgResponseTime = metrics?.responseTime || 0
      const uptime = metrics?.uptime || 0
      const errorRate = metrics?.errorRate || 0

      // Calculate costs (simplified)
      const multicloudDeployments = multiCloudSupport.getAllDeployments()
      const byProvider: Record<string, number> = {}
      const byRegion: Record<string, number> = {}

      for (const deployment of multicloudDeployments) {
        for (const dep of deployment.deployments) {
          byProvider[dep.provider] = (byProvider[dep.provider] || 0) + 1
          byRegion[dep.region] = (byRegion[dep.region] || 0) + 1
        }
      }

      // Estimate costs (simplified - in production, use actual cloud pricing)
      const estimated = deployments.length * 0.1 // $0.1 per deployment estimate

      const dashboardMetrics: DashboardMetrics = {
        deployments: {
          hourly,
          daily,
          byStatus,
        },
        performance: {
          avgDeploymentTime,
          avgResponseTime,
          uptime,
          errorRate,
        },
        costs: {
          estimated,
          byProvider,
          byRegion,
        },
      }

      this.metrics = dashboardMetrics

      logger.debug('Dashboard metrics updated')
    } catch (error: any) {
      logger.error('Update dashboard metrics failed:', error)
    }
  }

  /**
   * Get real-time updates
   */
  async getRealTimeUpdates(): Promise<{
    overview: DashboardOverview
    metrics: DashboardMetrics
    timestamp: Date
  }> {
    try {
      await this.updateOverview()
      await this.updateMetrics()

      return {
        overview: this.overview!,
        metrics: this.metrics!,
        timestamp: new Date(),
      }
    } catch (error: any) {
      logger.error('Get real-time updates failed:', error)
      throw error
    }
  }
}

// Global Real-Time Dashboard
export const realTimeDashboard = new RealTimeDashboard()

