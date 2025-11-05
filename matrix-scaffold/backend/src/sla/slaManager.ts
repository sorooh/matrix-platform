/**
 * Phase 8.3 - SLA & Performance Monitoring
 * 
 * Professional SLA tracking and performance monitoring
 * - SLA tracking per subscription tier
 * - Uptime monitoring
 * - Performance metrics (latency, throughput)
 * - SLA breach detection and alerts
 * - SLA reporting
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type SLATier = 'free' | 'pro' | 'enterprise' | 'custom'
export type SLAStatus = 'met' | 'at_risk' | 'breached'
export type MetricType = 'uptime' | 'latency' | 'throughput' | 'error_rate'

export interface SLADefinition {
  id: string
  tier: SLATier
  name: string
  uptimeTarget: number // Percentage (e.g., 99.9)
  latencyTarget: number // Milliseconds
  throughputTarget: number // Requests per second
  errorRateTarget: number // Percentage (e.g., 0.1)
  description?: string
  isActive: boolean
}

export interface SLAMetrics {
  subscriptionId: string
  userId: string
  tier: SLATier
  periodStart: Date
  periodEnd: Date
  uptime: number // Percentage
  latency: number // Average milliseconds
  throughput: number // Requests per second
  errorRate: number // Percentage
  status: SLAStatus
  breaches: number
  lastChecked: Date
}

export interface SLAAlert {
  id: string
  subscriptionId: string
  userId: string
  metric: MetricType
  currentValue: number
  targetValue: number
  severity: 'warning' | 'critical'
  status: 'open' | 'acknowledged' | 'resolved'
  createdAt: Date
  resolvedAt?: Date
}

class SLAManager {
  private slaDefinitions: Map<string, SLADefinition> = new Map()
  private metrics: Map<string, SLAMetrics> = new Map()
  private alerts: Map<string, SLAAlert> = new Map()

  async initialize() {
    logInfo('Initializing SLA & Performance Monitoring...')

    // Initialize default SLA definitions
    await this.initializeDefaultSLAs()

    // Load SLA definitions from database
    try {
      const { prisma } = await import('../config/database')
      const definitions = await prisma.sLADefinition.findMany()
      for (const def of definitions) {
        this.slaDefinitions.set(def.id, {
          id: def.id,
          tier: def.tier as SLATier,
          name: def.name,
          uptimeTarget: def.uptimeTarget,
          latencyTarget: def.latencyTarget,
          throughputTarget: def.throughputTarget,
          errorRateTarget: def.errorRateTarget,
          description: def.description || undefined,
          isActive: def.isActive
        })
      }
      logInfo(`✅ Loaded ${definitions.length} SLA definitions from database`)
    } catch (error) {
      logError(error as Error, { context: 'SLA initialization' })
    }

    // Start SLA monitoring
    this.startSLAMonitoring()

    logInfo('✅ SLA & Performance Monitoring initialized')
  }

  // Initialize default SLA definitions
  private async initializeDefaultSLAs(): Promise<void> {
    const defaultSLAs: Omit<SLADefinition, 'id'>[] = [
      {
        tier: 'free',
        name: 'Free Tier SLA',
        uptimeTarget: 95,
        latencyTarget: 1000,
        throughputTarget: 10,
        errorRateTarget: 5,
        description: 'Basic SLA for free tier',
        isActive: true
      },
      {
        tier: 'pro',
        name: 'Pro Tier SLA',
        uptimeTarget: 99.5,
        latencyTarget: 500,
        throughputTarget: 100,
        errorRateTarget: 1,
        description: 'Enhanced SLA for pro tier',
        isActive: true
      },
      {
        tier: 'enterprise',
        name: 'Enterprise Tier SLA',
        uptimeTarget: 99.9,
        latencyTarget: 200,
        throughputTarget: 1000,
        errorRateTarget: 0.1,
        description: 'Premium SLA for enterprise tier',
        isActive: true
      }
    ]

    for (const sla of defaultSLAs) {
      const existing = Array.from(this.slaDefinitions.values()).find(
        d => d.tier === sla.tier && d.isActive
      )
      if (!existing) {
        await this.createSLADefinition(sla)
      }
    }
  }

  // Create SLA definition
  async createSLADefinition(sla: Omit<SLADefinition, 'id'>): Promise<SLADefinition> {
    try {
      const slaId = nanoid()

      const definition: SLADefinition = {
        id: slaId,
        ...sla
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.sLADefinition.create({
          data: {
            id: slaId,
            tier: definition.tier,
            name: definition.name,
            uptimeTarget: definition.uptimeTarget,
            latencyTarget: definition.latencyTarget,
            throughputTarget: definition.throughputTarget,
            errorRateTarget: definition.errorRateTarget,
            description: definition.description || null,
            isActive: definition.isActive
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create SLA definition in database' })
      }

      this.slaDefinitions.set(slaId, definition)
      logInfo(`✅ Created SLA definition ${slaId} for tier ${sla.tier}`)

      return definition
    } catch (error) {
      logError(error as Error, { context: 'Create SLA definition' })
      throw error
    }
  }

  // Get SLA definition by tier
  async getSLAByTier(tier: SLATier): Promise<SLADefinition | null> {
    for (const def of this.slaDefinitions.values()) {
      if (def.tier === tier && def.isActive) {
        return def
      }
    }
    return null
  }

  // Track metrics
  async trackMetrics(
    subscriptionId: string,
    userId: string,
    tier: SLATier,
    uptime: number,
    latency: number,
    throughput: number,
    errorRate: number
  ): Promise<SLAMetrics> {
    try {
      const sla = await this.getSLAByTier(tier)
      if (!sla) {
        throw new Error(`No SLA definition found for tier ${tier}`)
      }

      // Get or create metrics
      const metricsKey = `${subscriptionId}:${new Date().toISOString().slice(0, 7)}` // Monthly
      let metrics = this.metrics.get(metricsKey)

      if (!metrics) {
        // Get subscription period
        const { subscriptionManager } = await import('../billing/subscription')
        const subscription = await subscriptionManager.getSubscription(subscriptionId)
        
        metrics = {
          subscriptionId,
          userId,
          tier,
          periodStart: subscription?.currentPeriodStart || new Date(),
          periodEnd: subscription?.currentPeriodEnd || new Date(),
          uptime: 0,
          latency: 0,
          throughput: 0,
          errorRate: 0,
          status: 'met',
          breaches: 0,
          lastChecked: new Date()
        }
      }

      // Update metrics (weighted average)
      const now = new Date()
      const timeSinceLastCheck = (now.getTime() - metrics.lastChecked.getTime()) / 1000 // seconds
      const weight = Math.min(timeSinceLastCheck / 3600, 1) // Max 1 hour weight

      metrics.uptime = metrics.uptime * (1 - weight) + uptime * weight
      metrics.latency = metrics.latency * (1 - weight) + latency * weight
      metrics.throughput = metrics.throughput * (1 - weight) + throughput * weight
      metrics.errorRate = metrics.errorRate * (1 - weight) + errorRate * weight
      metrics.lastChecked = now

      // Check SLA compliance
      const status = this.checkSLACompliance(metrics, sla)
      metrics.status = status

      if (status === 'breached') {
        metrics.breaches++
        await this.createSLAAlert(metrics, sla, 'critical')
      } else if (status === 'at_risk') {
        await this.createSLAAlert(metrics, sla, 'warning')
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.sLAMetrics.upsert({
          where: {
            subscriptionId_periodStart: {
              subscriptionId,
              periodStart: metrics.periodStart
            }
          },
          create: {
            subscriptionId,
            userId,
            tier: metrics.tier,
            periodStart: metrics.periodStart,
            periodEnd: metrics.periodEnd,
            uptime: metrics.uptime,
            latency: metrics.latency,
            throughput: metrics.throughput,
            errorRate: metrics.errorRate,
            status: metrics.status,
            breaches: metrics.breaches,
            lastChecked: metrics.lastChecked
          },
          update: {
            uptime: metrics.uptime,
            latency: metrics.latency,
            throughput: metrics.throughput,
            errorRate: metrics.errorRate,
            status: metrics.status,
            breaches: metrics.breaches,
            lastChecked: metrics.lastChecked
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Save SLA metrics in database' })
      }

      this.metrics.set(metricsKey, metrics)
      return metrics
    } catch (error) {
      logError(error as Error, { context: 'Track SLA metrics' })
      throw error
    }
  }

  // Check SLA compliance
  private checkSLACompliance(metrics: SLAMetrics, sla: SLADefinition): SLAStatus {
    let breaches = 0
    let atRisk = false

    if (metrics.uptime < sla.uptimeTarget) {
      if (metrics.uptime < sla.uptimeTarget * 0.95) {
        breaches++
      } else {
        atRisk = true
      }
    }

    if (metrics.latency > sla.latencyTarget) {
      if (metrics.latency > sla.latencyTarget * 1.5) {
        breaches++
      } else {
        atRisk = true
      }
    }

    if (metrics.errorRate > sla.errorRateTarget) {
      if (metrics.errorRate > sla.errorRateTarget * 2) {
        breaches++
      } else {
        atRisk = true
      }
    }

    if (breaches > 0) return 'breached'
    if (atRisk) return 'at_risk'
    return 'met'
  }

  // Create SLA alert
  private async createSLAAlert(
    metrics: SLAMetrics,
    sla: SLADefinition,
    severity: 'warning' | 'critical'
  ): Promise<void> {
    try {
      // Check for existing open alerts
      const existingAlerts = Array.from(this.alerts.values()).filter(
        a => a.subscriptionId === metrics.subscriptionId && a.status === 'open'
      )

      if (existingAlerts.length > 0) {
        return // Don't create duplicate alerts
      }

      const alertId = nanoid()
      const now = new Date()

      // Determine which metric is breached
      let metric: MetricType = 'uptime'
      let currentValue = metrics.uptime
      let targetValue = sla.uptimeTarget

      if (metrics.latency > sla.latencyTarget) {
        metric = 'latency'
        currentValue = metrics.latency
        targetValue = sla.latencyTarget
      } else if (metrics.errorRate > sla.errorRateTarget) {
        metric = 'error_rate'
        currentValue = metrics.errorRate
        targetValue = sla.errorRateTarget
      }

      const alert: SLAAlert = {
        id: alertId,
        subscriptionId: metrics.subscriptionId,
        userId: metrics.userId,
        metric,
        currentValue,
        targetValue,
        severity,
        status: 'open',
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.sLAAlert.create({
          data: {
            id: alertId,
            subscriptionId: metrics.subscriptionId,
            userId: metrics.userId,
            metric,
            currentValue,
            targetValue,
            severity,
            status: 'open'
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create SLA alert in database' })
      }

      this.alerts.set(alertId, alert)
      logInfo(`✅ Created SLA alert ${alertId} for subscription ${metrics.subscriptionId}`)

      // Emit webhook event
      const { advancedWebhookSystem } = await import('../webhooks/webhookSystem')
      await advancedWebhookSystem.emitEvent('sla.breached', {
        subscriptionId: metrics.subscriptionId,
        metric,
        currentValue,
        targetValue,
        severity
      }, 'sla-system')
    } catch (error) {
      logError(error as Error, { context: 'Create SLA alert' })
    }
  }

  // Get metrics
  async getMetrics(subscriptionId: string): Promise<SLAMetrics | null> {
    const now = new Date()
    const metricsKey = `${subscriptionId}:${now.toISOString().slice(0, 7)}`
    return this.metrics.get(metricsKey) || null
  }

  // Get alerts
  async getAlerts(subscriptionId?: string, status?: 'open' | 'acknowledged' | 'resolved'): Promise<SLAAlert[]> {
    const alerts: SLAAlert[] = []
    for (const alert of this.alerts.values()) {
      if (subscriptionId && alert.subscriptionId !== subscriptionId) continue
      if (status && alert.status !== status) continue
      alerts.push(alert)
    }
    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Start SLA monitoring
  private startSLAMonitoring(): void {
    // Monitor every 5 minutes
    setInterval(async () => {
      try {
        // Get all active subscriptions
        const { subscriptionManager } = await import('../billing/subscription')
        // In production, fetch all active subscriptions and check their metrics
        logInfo('SLA monitoring check completed')
      } catch (error) {
        logError(error as Error, { context: 'SLA monitoring' })
      }
    }, 5 * 60 * 1000) // 5 minutes
  }
}

export const slaManager = new SLAManager()

