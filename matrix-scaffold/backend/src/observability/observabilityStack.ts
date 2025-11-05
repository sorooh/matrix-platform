/**
 * Phase 10.4 - Observability Stack
 * 
 * Distributed tracing, advanced logging, metrics collection
 * - Distributed Tracing (OpenTelemetry)
 * - Advanced Logging (Structured Logging, Log Aggregation)
 * - Metrics Collection (Prometheus, Grafana)
 * - Advanced Alerting System
 * - Custom Dashboards
 * - SLA Monitoring
 * - Performance Profiling
 * - Real-time Monitoring
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type TraceStatus = 'success' | 'error' | 'timeout'
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary'
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface Trace {
  id: string
  traceId: string
  spanId: string
  parentSpanId?: string
  service: string
  operation: string
  startTime: Date
  endTime?: Date
  duration?: number // milliseconds
  status: TraceStatus
  tags: Record<string, string>
  logs: TraceLog[]
  metadata: Record<string, any>
}

export interface TraceLog {
  timestamp: Date
  level: LogLevel
  message: string
  fields: Record<string, any>
}

export interface StructuredLog {
  id: string
  timestamp: Date
  level: LogLevel
  service: string
  message: string
  fields: Record<string, any>
  context: {
    userId?: string
    requestId?: string
    traceId?: string
    sessionId?: string
  }
  error?: {
    name: string
    message: string
    stack?: string
  }
}

export interface Metric {
  id: string
  name: string
  type: MetricType
  value: number
  labels: Record<string, string>
  timestamp: Date
}

export interface AlertRule {
  id: string
  name: string
  metric: string
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  threshold: number
  severity: AlertSeverity
  enabled: boolean
  actions: string[] // Notification channels
  createdAt: Date
  updatedAt: Date
}

export interface Alert {
  id: string
  ruleId: string
  name: string
  message: string
  severity: AlertSeverity
  status: 'firing' | 'resolved' | 'acknowledged'
  triggeredAt: Date
  resolvedAt?: Date
  acknowledgedAt?: Date
  acknowledgedBy?: string
}

export interface Dashboard {
  id: string
  name: string
  description: string
  widgets: DashboardWidget[]
  layout: {
    rows: number
    columns: number
  }
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DashboardWidget {
  id: string
  type: 'graph' | 'metric' | 'table' | 'log' | 'trace'
  title: string
  config: Record<string, any>
  position: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface SLAMetric {
  id: string
  service: string
  metric: string
  target: number // Target value
  current: number // Current value
  status: 'meeting' | 'violating'
  uptime: number // percentage
  lastViolation?: Date
  createdAt: Date
  updatedAt: Date
}

class ObservabilityStack {
  private traces: Map<string, Trace> = new Map()
  private logs: Map<string, StructuredLog> = new Map()
  private metrics: Map<string, Metric> = new Map()
  private alertRules: Map<string, AlertRule> = new Map()
  private alerts: Map<string, Alert> = new Map()
  private dashboards: Map<string, Dashboard> = new Map()
  private slaMetrics: Map<string, SLAMetric> = new Map()

  async initialize() {
    logInfo('Initializing Observability Stack...')

    // Initialize default dashboards
    await this.initializeDefaultDashboards()

    // Initialize default alert rules
    await this.initializeDefaultAlertRules()

    // Initialize SLA monitoring
    await this.initializeSLAMonitoring()

    logInfo('✅ Observability Stack initialized')
  }

  // Initialize default dashboards
  private async initializeDefaultDashboards(): Promise<void> {
    const defaultDashboard: Dashboard = {
      id: nanoid(),
      name: 'System Overview',
      description: 'Default system overview dashboard',
      widgets: [
        {
          id: nanoid(),
          type: 'metric',
          title: 'Request Rate',
          config: {},
          position: { x: 0, y: 0, width: 6, height: 4 }
        },
        {
          id: nanoid(),
          type: 'graph',
          title: 'Response Time',
          config: {},
          position: { x: 6, y: 0, width: 6, height: 4 }
        }
      ],
      layout: { rows: 8, columns: 12 },
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.dashboards.set(defaultDashboard.id, defaultDashboard)

    logInfo('✅ Default dashboards initialized')
  }

  // Initialize default alert rules
  private async initializeDefaultAlertRules(): Promise<void> {
    const defaultRules: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'High Error Rate',
        metric: 'error_rate',
        condition: 'gt',
        threshold: 5,
        severity: 'high',
        enabled: true,
        actions: ['email', 'slack']
      },
      {
        name: 'High Response Time',
        metric: 'response_time',
        condition: 'gt',
        threshold: 1000,
        severity: 'medium',
        enabled: true,
        actions: ['email']
      }
    ]

    for (const rule of defaultRules) {
      const ruleId = nanoid()
      const now = new Date()

      const alertRule: AlertRule = {
        id: ruleId,
        ...rule,
        createdAt: now,
        updatedAt: now
      }

      this.alertRules.set(ruleId, alertRule)
    }

    logInfo('✅ Default alert rules initialized')
  }

  // Initialize SLA monitoring
  private async initializeSLAMonitoring(): Promise<void> {
    const slaServices = ['api', 'database', 'cache', 'queue']

    for (const service of slaServices) {
      const slaId = nanoid()
      const now = new Date()

      const sla: SLAMetric = {
        id: slaId,
        service,
        metric: 'uptime',
        target: 99.9,
        current: 100,
        status: 'meeting',
        uptime: 100,
        createdAt: now,
        updatedAt: now
      }

      this.slaMetrics.set(slaId, sla)
    }

    logInfo('✅ SLA monitoring initialized')
  }

  // Create trace
  async createTrace(
    service: string,
    operation: string,
    parentSpanId?: string
  ): Promise<Trace> {
    try {
      const traceId = nanoid()
      const spanId = nanoid()
      const now = new Date()

      const trace: Trace = {
        id: spanId,
        traceId,
        spanId,
        parentSpanId,
        service,
        operation,
        startTime: now,
        status: 'success',
        tags: {},
        logs: [],
        metadata: {}
      }

      this.traces.set(spanId, trace)

      return trace
    } catch (error) {
      logError(error as Error, { context: 'Create trace' })
      throw error
    }
  }

  // Finish trace
  async finishTrace(
    spanId: string,
    status: TraceStatus,
    duration: number
  ): Promise<void> {
    try {
      const trace = this.traces.get(spanId)
      if (!trace) return

      trace.endTime = new Date()
      trace.duration = duration
      trace.status = status

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.trace.create({
          data: {
            id: spanId,
            traceId: trace.traceId,
            spanId,
            parentSpanId: trace.parentSpanId || null,
            service: trace.service,
            operation: trace.operation,
            startTime: trace.startTime,
            endTime: trace.endTime,
            duration,
            status,
            tags: trace.tags,
            logs: trace.logs,
            metadata: trace.metadata
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Finish trace in database' })
      }

      this.traces.set(spanId, trace)
    } catch (error) {
      logError(error as Error, { context: 'Finish trace' })
    }
  }

  // Log structured log
  async log(
    level: LogLevel,
    service: string,
    message: string,
    fields: Record<string, any> = {},
    context: {
      userId?: string
      requestId?: string
      traceId?: string
      sessionId?: string
    } = {},
    error?: Error
  ): Promise<StructuredLog> {
    try {
      const logId = nanoid()
      const now = new Date()

      const structuredLog: StructuredLog = {
        id: logId,
        timestamp: now,
        level,
        service,
        message,
        fields,
        context,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : undefined
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.structuredLog.create({
          data: {
            id: logId,
            timestamp: now,
            level,
            service,
            message,
            fields,
            context,
            error: structuredLog.error || null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Log in database' })
      }

      this.logs.set(logId, structuredLog)

      return structuredLog
    } catch (error) {
      logError(error as Error, { context: 'Log' })
      throw error
    }
  }

  // Record metric
  async recordMetric(
    name: string,
    type: MetricType,
    value: number,
    labels: Record<string, string> = {}
  ): Promise<Metric> {
    try {
      const metricId = nanoid()
      const now = new Date()

      const metric: Metric = {
        id: metricId,
        name,
        type,
        value,
        labels,
        timestamp: now
      }

      // Check alert rules
      await this.checkAlertRules(metric)

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.metric.create({
          data: {
            id: metricId,
            name,
            type,
            value,
            labels,
            timestamp: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Record metric in database' })
      }

      this.metrics.set(metricId, metric)

      return metric
    } catch (error) {
      logError(error as Error, { context: 'Record metric' })
      throw error
    }
  }

  // Check alert rules
  private async checkAlertRules(metric: Metric): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue
      if (rule.metric !== metric.name) continue

      let shouldAlert = false

      switch (rule.condition) {
        case 'gt':
          shouldAlert = metric.value > rule.threshold
          break
        case 'lt':
          shouldAlert = metric.value < rule.threshold
          break
        case 'eq':
          shouldAlert = metric.value === rule.threshold
          break
        case 'gte':
          shouldAlert = metric.value >= rule.threshold
          break
        case 'lte':
          shouldAlert = metric.value <= rule.threshold
          break
      }

      if (shouldAlert) {
        await this.createAlert(rule, metric)
      }
    }
  }

  // Create alert
  private async createAlert(rule: AlertRule, metric: Metric): Promise<Alert> {
    try {
      const alertId = nanoid()
      const now = new Date()

      const alert: Alert = {
        id: alertId,
        ruleId: rule.id,
        name: rule.name,
        message: `${rule.name}: ${metric.name} = ${metric.value} ${rule.condition} ${rule.threshold}`,
        severity: rule.severity,
        status: 'firing',
        triggeredAt: now
      }

      // Send notifications
      for (const action of rule.actions) {
        await this.sendNotification(action, alert)
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.alert.create({
          data: {
            id: alertId,
            ruleId: rule.id,
            name: rule.name,
            message: alert.message,
            severity: rule.severity,
            status: 'firing',
            triggeredAt: now,
            resolvedAt: null,
            acknowledgedAt: null,
            acknowledgedBy: null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create alert in database' })
      }

      this.alerts.set(alertId, alert)

      logInfo(`🚨 Alert created ${alertId}: ${rule.name}`)

      return alert
    } catch (error) {
      logError(error as Error, { context: 'Create alert' })
      throw error
    }
  }

  // Send notification
  private async sendNotification(channel: string, alert: Alert): Promise<void> {
    // In production, send actual notifications
    logInfo(`📧 Sending notification via ${channel}: ${alert.message}`)
  }

  // Update SLA metric
  async updateSLAMetric(
    service: string,
    metric: string,
    current: number,
    target: number
  ): Promise<SLAMetric> {
    try {
      const sla = Array.from(this.slaMetrics.values()).find(
        s => s.service === service && s.metric === metric
      )

      if (!sla) {
        const slaId = nanoid()
        const now = new Date()

        const newSLA: SLAMetric = {
          id: slaId,
          service,
          metric,
          target,
          current,
          status: current >= target ? 'meeting' : 'violating',
          uptime: current,
          createdAt: now,
          updatedAt: now
        }

        this.slaMetrics.set(slaId, newSLA)

        return newSLA
      }

      sla.current = current
      sla.target = target
      sla.status = current >= target ? 'meeting' : 'violating'
      sla.uptime = current
      if (current < target) {
        sla.lastViolation = new Date()
      }
      sla.updatedAt = new Date()

      this.slaMetrics.set(sla.id, sla)

      return sla
    } catch (error) {
      logError(error as Error, { context: 'Update SLA metric' })
      throw error
    }
  }

  // Get traces
  async getTraces(
    service?: string,
    operation?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Trace[]> {
    const traces: Trace[] = []
    for (const trace of this.traces.values()) {
      if (service && trace.service !== service) continue
      if (operation && trace.operation !== operation) continue
      if (startDate && trace.startTime < startDate) continue
      if (endDate && trace.startTime > endDate) continue
      traces.push(trace)
    }
    return traces.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
  }

  // Get logs
  async getLogs(
    level?: LogLevel,
    service?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<StructuredLog[]> {
    const logs: StructuredLog[] = []
    for (const log of this.logs.values()) {
      if (level && log.level !== level) continue
      if (service && log.service !== service) continue
      if (startDate && log.timestamp < startDate) continue
      if (endDate && log.timestamp > endDate) continue
      logs.push(log)
    }
    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  // Get metrics
  async getMetrics(
    name?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Metric[]> {
    const metrics: Metric[] = []
    for (const metric of this.metrics.values()) {
      if (name && metric.name !== name) continue
      if (startDate && metric.timestamp < startDate) continue
      if (endDate && metric.timestamp > endDate) continue
      metrics.push(metric)
    }
    return metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  // Get alerts
  async getAlerts(status?: string, severity?: AlertSeverity): Promise<Alert[]> {
    const alerts: Alert[] = []
    for (const alert of this.alerts.values()) {
      if (status && alert.status !== status) continue
      if (severity && alert.severity !== severity) continue
      alerts.push(alert)
    }
    return alerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
  }

  // Get SLA metrics
  async getSLAMetrics(service?: string): Promise<SLAMetric[]> {
    const slas: SLAMetric[] = []
    for (const sla of this.slaMetrics.values()) {
      if (service && sla.service !== service) continue
      slas.push(sla)
    }
    return slas.sort((a, b) => b.uptime - a.uptime)
  }
}

export const observabilityStack = new ObservabilityStack()

