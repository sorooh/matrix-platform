/**
 * Admin Dashboard Controller
 * Phase 7.3: Admin Dashboard & Integration Control
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { realTimeDashboard } from '../deployment/dashboard'
import { autonomousDeploymentEngine } from '../deployment/engine'
import { domainSSLManager } from '../deployment/domainSSL'
import { smartMonitoringAutoRepair } from '../deployment/monitoring'
import { securityComplianceHub } from '../deployment/securityCompliance'
import { advancedDeploymentStrategies } from '../deployment/strategies'
import { multiCloudSupport } from '../deployment/multicloud'
import { advancedVulnerabilityScanner } from '../deployment/vulnerabilityScanner'
import { intelligentLoadBalancer } from '../deployment/intelligentLoadBalancer'

export interface DashboardOverview {
  system: {
    status: 'healthy' | 'degraded' | 'error'
    uptime: number
    version: string
    region: string
  }
  deployments: {
    total: number
    running: number
    failed: number
    pending: number
    strategies: {
      blueGreen: number
      canary: number
      rolling: number
      abTest: number
    }
  }
  domains: {
    total: number
    active: number
    error: number
    sslExpiring: number
  }
  monitoring: {
    cpu: number
    memory: number
    network: { in: number; out: number }
    uptime: number
    errorRate: number
    responseTime: number
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
  integrations: {
    total: number
    connected: number
    invalid: number
    missing: number
  }
  multicloud: {
    providers: string[]
    deployments: number
    activeRegions: number
  }
}

export interface DashboardModule {
  id: string
  name: string
  icon: string
  path: string
  status: 'active' | 'inactive' | 'error'
  lastUpdate: Date
}

export interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: Date
  read: boolean
  action?: {
    label: string
    url: string
  }
}

export class AdminDashboard {
  private modules: Map<string, DashboardModule> = new Map()
  private notifications: Notification[] = []
  private overview: DashboardOverview | null = null
  private updateInterval: NodeJS.Timeout | null = null

  /**
   * Initialize Admin Dashboard
   */
  async initialize(): Promise<void> {
    try {
      // Register dashboard modules
      this.registerModules()

      // Start periodic updates
      this.startPeriodicUpdates()

      // Subscribe to events
      this.subscribeToEvents()

      logger.info('Admin Dashboard initialized')
    } catch (error: any) {
      logger.error('Admin Dashboard initialization failed:', error)
      throw error
    }
  }

  /**
   * Register dashboard modules
   */
  private registerModules(): void {
    const modules: DashboardModule[] = [
      {
        id: 'overview',
        name: 'Overview',
        icon: '📊',
        path: '/admin/overview',
        status: 'active',
        lastUpdate: new Date(),
      },
      {
        id: 'deployments',
        name: 'Deployments',
        icon: '⚙️',
        path: '/admin/deployments',
        status: 'active',
        lastUpdate: new Date(),
      },
      {
        id: 'domains',
        name: 'Domains',
        icon: '🌍',
        path: '/admin/domains',
        status: 'active',
        lastUpdate: new Date(),
      },
      {
        id: 'monitoring',
        name: 'Monitoring',
        icon: '📈',
        path: '/admin/monitoring',
        status: 'active',
        lastUpdate: new Date(),
      },
      {
        id: 'keys',
        name: 'Keys & Integrations',
        icon: '🔑',
        path: '/admin/keys',
        status: 'active',
        lastUpdate: new Date(),
      },
      {
        id: 'governance',
        name: 'Governance & Logs',
        icon: '🧠',
        path: '/admin/governance',
        status: 'active',
        lastUpdate: new Date(),
      },
    ]

    for (const module of modules) {
      this.modules.set(module.id, module)
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
        await this.updateModules()
      } catch (error) {
        logger.error('Dashboard update failed:', error)
      }
    }, 5000) // Every 5 seconds

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
   * Subscribe to events
   */
  private subscribeToEvents(): void {
    // Subscribe to deployment events
    eventBus.subscribe('deployment.completed', (data: any) => {
      this.addNotification({
        type: 'success',
        title: 'Deployment Completed',
        message: `Deployment ${data.deployment?.id} completed successfully`,
        timestamp: new Date(),
      })
    })

    eventBus.subscribe('deployment.failed', (data: any) => {
      this.addNotification({
        type: 'error',
        title: 'Deployment Failed',
        message: `Deployment ${data.deployment?.id} failed: ${data.error}`,
        timestamp: new Date(),
      })
    })

    // Subscribe to monitoring events
    eventBus.subscribe('monitoring.incident', (data: any) => {
      this.addNotification({
        type: 'warning',
        title: 'Incident Detected',
        message: `Incident ${data.incident?.id} detected: ${data.incident?.type}`,
        timestamp: new Date(),
      })
    })

    // Subscribe to security events
    eventBus.subscribe('security.vulnerability', (data: any) => {
      this.addNotification({
        type: 'warning',
        title: 'Vulnerability Detected',
        message: `Vulnerability detected: ${data.vulnerability?.name}`,
        timestamp: new Date(),
      })
    })
  }

  /**
   * Update overview
   */
  private async updateOverview(): Promise<void> {
    try {
      // Get real-time dashboard overview
      const dashboardOverview = await realTimeDashboard.getOverview()

      // Get deployments
      const deployments = autonomousDeploymentEngine.getAllDeployments()
      const blueGreenDeployments = Array.from(advancedDeploymentStrategies.blueGreenDeployments.values())
      const canaryDeployments = Array.from(advancedDeploymentStrategies.canaryDeployments.values())
      const rollingDeployments = Array.from(advancedDeploymentStrategies.rollingDeployments.values())
      const abTestDeployments = Array.from(advancedDeploymentStrategies.abTestDeployments.values())

      // Get domains
      const domains = domainSSLManager.getAllDomains()

      // Get monitoring
      const metrics = smartMonitoringAutoRepair.getCurrentMetrics()

      // Get compliance
      const complianceStatus = await securityComplianceHub.getComplianceStatus()
      const securityChecks = securityComplianceHub.getSecurityChecks()

      // Get multi-cloud
      const multicloudDeployments = multiCloudSupport.getAllDeployments()

      const overview: DashboardOverview = {
        system: {
          status: dashboardOverview.system.readiness.status === 'ready' ? 'healthy' : 'error',
          uptime: process.uptime(),
          version: process.env.npm_package_version || '0.1.0',
          region: process.env.REGION || 'us',
        },
        deployments: {
          total: deployments.length,
          running: deployments.filter((d) => d.status === 'completed').length,
          failed: deployments.filter((d) => d.status === 'failed').length,
          pending: deployments.filter((d) => d.status === 'pending').length,
          strategies: {
            blueGreen: blueGreenDeployments.length,
            canary: canaryDeployments.length,
            rolling: rollingDeployments.length,
            abTest: abTestDeployments.length,
          },
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
        monitoring: metrics || {
          cpu: 0,
          memory: 0,
          network: { in: 0, out: 0 },
          uptime: 0,
          errorRate: 0,
          responseTime: 0,
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
        integrations: {
          total: 0, // Will be updated by Keys & Integrations Manager
          connected: 0,
          invalid: 0,
          missing: 0,
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
   * Update modules
   */
  private async updateModules(): Promise<void> {
    try {
      for (const [id, module] of this.modules.entries()) {
        module.lastUpdate = new Date()
        // In production, check actual module status
        module.status = 'active'
      }
    } catch (error: any) {
      logger.error('Update modules failed:', error)
    }
  }

  /**
   * Get overview
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
   * Get modules
   */
  getModules(): DashboardModule[] {
    return Array.from(this.modules.values())
  }

  /**
   * Get module
   */
  getModule(moduleId: string): DashboardModule | null {
    return this.modules.get(moduleId) || null
  }

  /**
   * Add notification
   */
  addNotification(notification: Omit<Notification, 'id' | 'read'>): void {
    try {
      const notif: Notification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        read: false,
        ...notification,
      }

      this.notifications.unshift(notif)

      // Keep only last 100 notifications
      if (this.notifications.length > 100) {
        this.notifications = this.notifications.slice(0, 100)
      }

      logger.debug('Notification added', {
        id: notif.id,
        type: notif.type,
        title: notif.title,
      })

      eventBus.publish('admin.dashboard.notification', {
        notification: notif,
      })
    } catch (error: any) {
      logger.error('Add notification failed:', error)
    }
  }

  /**
   * Get notifications
   */
  getNotifications(limit = 20, unreadOnly = false): Notification[] {
    let notifications = this.notifications

    if (unreadOnly) {
      notifications = notifications.filter((n) => !n.read)
    }

    return notifications.slice(0, limit)
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: string): void {
    try {
      const notification = this.notifications.find((n) => n.id === notificationId)
      if (notification) {
        notification.read = true

        logger.debug('Notification marked as read', {
          id: notificationId,
        })
      }
    } catch (error: any) {
      logger.error('Mark notification as read failed:', error)
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllNotificationsAsRead(): void {
    try {
      for (const notification of this.notifications) {
        notification.read = true
      }

      logger.debug('All notifications marked as read')
    } catch (error: any) {
      logger.error('Mark all notifications as read failed:', error)
    }
  }

  /**
   * Clear notifications
   */
  clearNotifications(): void {
    try {
      this.notifications = []
      logger.debug('Notifications cleared')
    } catch (error: any) {
      logger.error('Clear notifications failed:', error)
    }
  }
}

// Global Admin Dashboard
export const adminDashboard = new AdminDashboard()

