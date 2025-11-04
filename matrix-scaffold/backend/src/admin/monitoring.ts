/**
 * Advanced Monitoring & Alerting
 * Phase 7.3.1: Professional Enhancements
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

export type NotificationChannel = 'email' | 'slack' | 'pagerduty' | 'webhook' | 'sms'

export interface AlertRule {
  id: string
  name: string
  description?: string
  condition: (metric: any) => boolean
  severity: AlertSeverity
  channels: NotificationChannel[]
  enabled: boolean
  cooldownPeriod: number // milliseconds
  lastTriggered?: Date
  createdAt: Date
}

export interface Alert {
  id: string
  ruleId: string
  ruleName: string
  severity: AlertSeverity
  message: string
  metric: Record<string, unknown>
  timestamp: Date
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
  resolved: boolean
  resolvedAt?: Date
}

export interface Notification {
  id: string
  alertId: string
  channel: NotificationChannel
  recipient: string
  message: string
  sent: boolean
  sentAt?: Date
  error?: string
  retryCount: number
  maxRetries: number
}

export interface AlertHistory {
  id: string
  alertId: string
  action: 'created' | 'acknowledged' | 'resolved' | 'escalated'
  userId?: string
  timestamp: Date
  details?: Record<string, unknown>
}

export class AdvancedMonitoring {
  private alertRules: Map<string, AlertRule> = new Map()
  private alerts: Map<string, Alert> = new Map()
  private notifications: Map<string, Notification> = new Map()
  private alertHistory: Map<string, AlertHistory> = new Map()
  private metricsCache: Map<string, { value: unknown; timestamp: Date }> = new Map()

  /**
   * Initialize Advanced Monitoring
   */
  async initialize(): Promise<void> {
    try {
      // Load default alert rules
      this.loadDefaultAlertRules()

      // Start monitoring
      this.startMonitoring()

      // Subscribe to events
      this.subscribeToEvents()

      logger.info('Advanced Monitoring initialized')
    } catch (error: any) {
      logger.error('Advanced Monitoring initialization failed:', error)
      throw error
    }
  }

  /**
   * Load default alert rules
   */
  private loadDefaultAlertRules(): void {
    // CPU usage alert
    this.addAlertRule({
      id: 'cpu-high',
      name: 'High CPU Usage',
      description: 'CPU usage exceeds 80%',
      condition: (metric: any) => metric.cpu && metric.cpu > 80,
      severity: 'warning',
      channels: ['email', 'slack'],
      enabled: true,
      cooldownPeriod: 5 * 60 * 1000, // 5 minutes
      createdAt: new Date(),
    })

    // Memory usage alert
    this.addAlertRule({
      id: 'memory-high',
      name: 'High Memory Usage',
      description: 'Memory usage exceeds 85%',
      condition: (metric: any) => metric.memory && metric.memory > 85,
      severity: 'warning',
      channels: ['email', 'slack'],
      enabled: true,
      cooldownPeriod: 5 * 60 * 1000,
      createdAt: new Date(),
    })

    // Error rate alert
    this.addAlertRule({
      id: 'error-rate-high',
      name: 'High Error Rate',
      description: 'Error rate exceeds 5%',
      condition: (metric: any) => metric.errorRate && metric.errorRate > 5,
      severity: 'error',
      channels: ['email', 'slack', 'pagerduty'],
      enabled: true,
      cooldownPeriod: 1 * 60 * 1000, // 1 minute
      createdAt: new Date(),
    })

    // Response time alert
    this.addAlertRule({
      id: 'response-time-high',
      name: 'High Response Time',
      description: 'Average response time exceeds 1000ms',
      condition: (metric: any) => metric.responseTime && metric.responseTime > 1000,
      severity: 'warning',
      channels: ['email', 'slack'],
      enabled: true,
      cooldownPeriod: 5 * 60 * 1000,
      createdAt: new Date(),
    })

    logger.debug('Default alert rules loaded')
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    // Monitor metrics every 30 seconds
    setInterval(() => {
      this.evaluateAlertRules()
    }, 30 * 1000)

    logger.debug('Monitoring started')
  }

  /**
   * Subscribe to events
   */
  private subscribeToEvents(): void {
    // Subscribe to metric updates
    eventBus.subscribe('admin.metric.updated', (data: any) => {
      try {
        this.updateMetric(data.metric, data.value)
      } catch (err: any) {
        logger.error('Metric update subscription failed:', err)
      }
    })

    logger.debug('Monitoring event subscriptions initialized')
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: AlertRule): void {
    try {
      this.alertRules.set(rule.id, rule)

      logger.info('Alert rule added', {
        ruleId: rule.id,
        name: rule.name,
      })

      // Publish event
      eventBus.publish('admin.alert.rule.added', {
        rule,
      })
    } catch (error: any) {
      logger.error('Add alert rule failed:', error)
      throw error
    }
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): void {
    try {
      const rule = this.alertRules.get(ruleId)
      if (!rule) {
        throw new Error(`Alert rule ${ruleId} not found`)
      }

      const updatedRule = { ...rule, ...updates }
      this.alertRules.set(ruleId, updatedRule)

      logger.info('Alert rule updated', {
        ruleId,
      })

      // Publish event
      eventBus.publish('admin.alert.rule.updated', {
        rule: updatedRule,
      })
    } catch (error: any) {
      logger.error('Update alert rule failed:', error)
      throw error
    }
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): void {
    try {
      const rule = this.alertRules.get(ruleId)
      if (!rule) {
        return
      }

      this.alertRules.delete(ruleId)

      logger.info('Alert rule removed', {
        ruleId,
      })

      // Publish event
      eventBus.publish('admin.alert.rule.removed', {
        ruleId,
      })
    } catch (error: any) {
      logger.error('Remove alert rule failed:', error)
    }
  }

  /**
   * Update metric
   */
  updateMetric(metric: string, value: unknown): void {
    try {
      this.metricsCache.set(metric, {
        value,
        timestamp: new Date(),
      })

      // Evaluate alert rules immediately
      this.evaluateAlertRules()
    } catch (error: any) {
      logger.error('Update metric failed:', error)
    }
  }

  /**
   * Evaluate alert rules
   */
  private evaluateAlertRules(): void {
    try {
      const metrics = Object.fromEntries(
        Array.from(this.metricsCache.entries()).map(([key, data]) => [key, data.value])
      )

      for (const rule of this.alertRules.values()) {
        if (!rule.enabled) {
          continue
        }

        // Check cooldown period
        if (rule.lastTriggered) {
          const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime()
          if (timeSinceLastTrigger < rule.cooldownPeriod) {
            continue
          }
        }

        // Evaluate condition
        try {
          if (rule.condition(metrics)) {
            this.triggerAlert(rule, metrics)
          }
        } catch (err: any) {
          logger.error('Alert rule evaluation failed:', {
            ruleId: rule.id,
            error: err.message,
          })
        }
      }
    } catch (error: any) {
      logger.error('Evaluate alert rules failed:', error)
    }
  }

  /**
   * Trigger alert
   */
  private triggerAlert(rule: AlertRule, metrics: Record<string, unknown>): void {
    try {
      const alertId = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      const alert: Alert = {
        id: alertId,
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: `${rule.name}: ${rule.description || 'Alert condition met'}`,
        metric: metrics,
        timestamp: new Date(),
        acknowledged: false,
        resolved: false,
      }

      this.alerts.set(alertId, alert)

      // Update rule last triggered
      rule.lastTriggered = new Date()
      this.alertRules.set(rule.id, rule)

      // Record history
      this.recordAlertHistory(alertId, 'created')

      // Send notifications
      this.sendNotifications(alert, rule.channels)

      // Publish event
      eventBus.publish('admin.alert.triggered', {
        alert,
        rule,
      })

      logger.warn('Alert triggered', {
        alertId,
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
      })
    } catch (error: any) {
      logger.error('Trigger alert failed:', error)
    }
  }

  /**
   * Send notifications
   */
  private async sendNotifications(alert: Alert, channels: NotificationChannel[]): Promise<void> {
    for (const channel of channels) {
      try {
        const notificationId = `notification-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

        const notification: Notification = {
          id: notificationId,
          alertId: alert.id,
          channel,
          recipient: this.getRecipientForChannel(channel),
          message: this.formatMessage(alert, channel),
          sent: false,
          retryCount: 0,
          maxRetries: 3,
        }

        this.notifications.set(notificationId, notification)

        // Send notification
        await this.sendNotification(notification)

        notification.sent = true
        notification.sentAt = new Date()
        this.notifications.set(notificationId, notification)

        logger.info('Notification sent', {
          notificationId,
          channel,
          alertId: alert.id,
        })
      } catch (error: any) {
        logger.error('Send notification failed:', {
          channel,
          alertId: alert.id,
          error: error.message,
        })
      }
    }
  }

  /**
   * Send notification
   */
  private async sendNotification(notification: Notification): Promise<void> {
    // In production, implement actual notification sending
    // For now, log the notification
    logger.info('Notification would be sent', {
      notificationId: notification.id,
      channel: notification.channel,
      recipient: notification.recipient,
      message: notification.message,
    })

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  /**
   * Get recipient for channel
   */
  private getRecipientForChannel(channel: NotificationChannel): string {
    // In production, get from configuration
    switch (channel) {
      case 'email':
        return process.env.ALERT_EMAIL || 'admin@matrix-platform.com'
      case 'slack':
        return process.env.ALERT_SLACK_WEBHOOK || '#alerts'
      case 'pagerduty':
        return process.env.ALERT_PAGERDUTY_KEY || 'default'
      case 'webhook':
        return process.env.ALERT_WEBHOOK_URL || 'https://webhook.example.com'
      case 'sms':
        return process.env.ALERT_SMS_NUMBER || '+1234567890'
      default:
        return 'default'
    }
  }

  /**
   * Format message
   */
  private formatMessage(alert: Alert, channel: NotificationChannel): string {
    const baseMessage = `[${alert.severity.toUpperCase()}] ${alert.ruleName}: ${alert.message}`

    switch (channel) {
      case 'email':
        return `${baseMessage}\n\nTimestamp: ${alert.timestamp.toISOString()}\nAlert ID: ${alert.id}`
      case 'slack':
        return `${baseMessage} (Alert ID: ${alert.id})`
      case 'sms':
        return `${alert.ruleName}: ${alert.message}`
      default:
        return baseMessage
    }
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, userId: string): void {
    try {
      const alert = this.alerts.get(alertId)
      if (!alert) {
        throw new Error(`Alert ${alertId} not found`)
      }

      alert.acknowledged = true
      alert.acknowledgedBy = userId
      alert.acknowledgedAt = new Date()
      this.alerts.set(alertId, alert)

      // Record history
      this.recordAlertHistory(alertId, 'acknowledged', userId)

      // Publish event
      eventBus.publish('admin.alert.acknowledged', {
        alert,
        userId,
      })

      logger.info('Alert acknowledged', {
        alertId,
        userId,
      })
    } catch (error: any) {
      logger.error('Acknowledge alert failed:', error)
      throw error
    }
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    try {
      const alert = this.alerts.get(alertId)
      if (!alert) {
        throw new Error(`Alert ${alertId} not found`)
      }

      alert.resolved = true
      alert.resolvedAt = new Date()
      this.alerts.set(alertId, alert)

      // Record history
      this.recordAlertHistory(alertId, 'resolved')

      // Publish event
      eventBus.publish('admin.alert.resolved', {
        alert,
      })

      logger.info('Alert resolved', {
        alertId,
      })
    } catch (error: any) {
      logger.error('Resolve alert failed:', error)
      throw error
    }
  }

  /**
   * Record alert history
   */
  private recordAlertHistory(alertId: string, action: 'created' | 'acknowledged' | 'resolved' | 'escalated', userId?: string): void {
    try {
      const historyId = `history-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      const history: AlertHistory = {
        id: historyId,
        alertId,
        action,
        userId,
        timestamp: new Date(),
      }

      this.alertHistory.set(historyId, history)
    } catch (error: any) {
      logger.error('Record alert history failed:', error)
    }
  }

  /**
   * Get alerts
   */
  getAlerts(
    severity?: AlertSeverity,
    acknowledged?: boolean,
    resolved?: boolean,
    limit = 100
  ): Alert[] {
    let alerts = Array.from(this.alerts.values())

    if (severity) {
      alerts = alerts.filter((a) => a.severity === severity)
    }

    if (acknowledged !== undefined) {
      alerts = alerts.filter((a) => a.acknowledged === acknowledged)
    }

    if (resolved !== undefined) {
      alerts = alerts.filter((a) => a.resolved === resolved)
    }

    return alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Get alert rules
   */
  getAlertRules(enabled?: boolean): AlertRule[] {
    let rules = Array.from(this.alertRules.values())

    if (enabled !== undefined) {
      rules = rules.filter((r) => r.enabled === enabled)
    }

    return rules.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalAlerts: number
    activeAlerts: number
    resolvedAlerts: number
    alertsBySeverity: Record<string, number>
    totalRules: number
    enabledRules: number
    totalNotifications: number
    sentNotifications: number
  } {
    const alerts = Array.from(this.alerts.values())
    const notifications = Array.from(this.notifications.values())
    const rules = Array.from(this.alertRules.values())

    const alertsBySeverity: Record<string, number> = {}

    for (const alert of alerts) {
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1
    }

    return {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter((a) => !a.resolved).length,
      resolvedAlerts: alerts.filter((a) => a.resolved).length,
      alertsBySeverity,
      totalRules: rules.length,
      enabledRules: rules.filter((r) => r.enabled).length,
      totalNotifications: notifications.length,
      sentNotifications: notifications.filter((n) => n.sent).length,
    }
  }
}

// Global Advanced Monitoring
export const advancedMonitoring = new AdvancedMonitoring()

