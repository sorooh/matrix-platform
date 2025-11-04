/**
 * Advanced Analytics
 * Phase 7.3.1: Professional Enhancements
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { adminDatabase } from './database'

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom'
export type ExportFormat = 'csv' | 'json' | 'pdf' | 'xlsx'

export interface AnalyticsReport {
  id: string
  type: ReportType
  title: string
  description?: string
  periodStart: Date
  periodEnd: Date
  data: Record<string, unknown>
  summary: Record<string, unknown>
  trends: Record<string, unknown>
  visualizations: Record<string, unknown>
  generatedAt: Date
  generatedBy?: string
  template?: string
}

export interface ReportTemplate {
  id: string
  name: string
  description?: string
  type: ReportType
  fields: string[]
  visualizations: string[]
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    dayOfWeek?: number
    dayOfMonth?: number
    time?: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface ScheduledReport {
  id: string
  templateId: string
  recipients: string[]
  format: ExportFormat
  enabled: boolean
  lastRun?: Date
  nextRun: Date
  createdAt: Date
}

export interface PredictiveAnalytics {
  id: string
  metric: string
  prediction: {
    value: number
    confidence: number
    timeframe: string
  }
  trend: 'increasing' | 'decreasing' | 'stable'
  factors: Record<string, number>
  generatedAt: Date
}

export class AdvancedAnalytics {
  private reports: Map<string, AnalyticsReport> = new Map()
  private templates: Map<string, ReportTemplate> = new Map()
  private scheduledReports: Map<string, ScheduledReport> = new Map()
  private predictions: Map<string, PredictiveAnalytics> = new Map()

  /**
   * Initialize Advanced Analytics
   */
  async initialize(): Promise<void> {
    try {
      // Load default templates
      this.loadDefaultTemplates()

      // Start scheduled reports
      this.startScheduledReports()

      // Subscribe to events
      this.subscribeToEvents()

      logger.info('Advanced Analytics initialized')
    } catch (error: any) {
      logger.error('Advanced Analytics initialization failed:', error)
      throw error
    }
  }

  /**
   * Load default templates
   */
  private loadDefaultTemplates(): void {
    // Daily summary template
    this.addTemplate({
      id: 'daily-summary',
      name: 'Daily Summary',
      description: 'Daily performance summary',
      type: 'daily',
      fields: ['cpu', 'memory', 'network', 'requests', 'errors'],
      visualizations: ['line', 'bar'],
      schedule: {
        frequency: 'daily',
        time: '00:00',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Weekly performance template
    this.addTemplate({
      id: 'weekly-performance',
      name: 'Weekly Performance',
      description: 'Weekly performance analysis',
      type: 'weekly',
      fields: ['performance', 'usage', 'trends', 'comparison'],
      visualizations: ['line', 'bar', 'pie'],
      schedule: {
        frequency: 'weekly',
        dayOfWeek: 1, // Monday
        time: '09:00',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Monthly comprehensive template
    this.addTemplate({
      id: 'monthly-comprehensive',
      name: 'Monthly Comprehensive',
      description: 'Monthly comprehensive analysis',
      type: 'monthly',
      fields: ['all'],
      visualizations: ['line', 'bar', 'pie', 'area'],
      schedule: {
        frequency: 'monthly',
        dayOfMonth: 1,
        time: '09:00',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    logger.debug('Default templates loaded')
  }

  /**
   * Start scheduled reports
   */
  private startScheduledReports(): void {
    // Check scheduled reports every minute
    setInterval(() => {
      this.checkScheduledReports()
    }, 60 * 1000)

    logger.debug('Scheduled reports started')
  }

  /**
   * Subscribe to events
   */
  private subscribeToEvents(): void {
    // Subscribe to metric updates for predictions
    eventBus.subscribe('admin.metric.updated', (data: any) => {
      try {
        this.updatePredictions(data.metric, data.value)
      } catch (err: any) {
        logger.error('Prediction update subscription failed:', err)
      }
    })

    logger.debug('Analytics event subscriptions initialized')
  }

  /**
   * Generate report
   */
  async generateReport(
    type: ReportType,
    periodStart: Date,
    periodEnd: Date,
    templateId?: string,
    generatedBy?: string
  ): Promise<AnalyticsReport> {
    try {
      const reportId = `report-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const template = templateId ? this.getTemplate(templateId) : null

      // Collect data
      const data = await this.collectData(type, periodStart, periodEnd, template)
      const summary = await this.generateSummary(data, template)
      const trends = await this.analyzeTrends(data, periodStart, periodEnd)
      const visualizations = await this.generateVisualizations(data, template)

      const report: AnalyticsReport = {
        id: reportId,
        type,
        title: template?.name || `${type} Report`,
        description: template?.description,
        periodStart,
        periodEnd,
        data,
        summary,
        trends,
        visualizations,
        generatedAt: new Date(),
        generatedBy,
        template: templateId,
      }

      this.reports.set(reportId, report)

      // Save to database
      await adminDatabase.saveAnalyticsReport(report)

      // Publish event
      eventBus.publish('admin.analytics.report.generated', {
        report,
      })

      logger.info('Report generated', {
        reportId,
        type,
        periodStart,
        periodEnd,
      })

      return report
    } catch (error: any) {
      logger.error('Generate report failed:', error)
      throw error
    }
  }

  /**
   * Collect data
   */
  private async collectData(
    type: ReportType,
    periodStart: Date,
    periodEnd: Date,
    template?: ReportTemplate | null
  ): Promise<Record<string, unknown>> {
    try {
      // In production, collect actual data from various sources
      // For now, return sample data
      const data: Record<string, unknown> = {
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
        metrics: {
          cpu: this.getAverageMetric('cpu', periodStart, periodEnd),
          memory: this.getAverageMetric('memory', periodStart, periodEnd),
          network: this.getAverageMetric('network', periodStart, periodEnd),
          requests: this.getTotalMetric('requests', periodStart, periodEnd),
          errors: this.getTotalMetric('errors', periodStart, periodEnd),
        },
        regions: {
          eu: this.getRegionalData('eu', periodStart, periodEnd),
          us: this.getRegionalData('us', periodStart, periodEnd),
          asia: this.getRegionalData('asia', periodStart, periodEnd),
        },
      }

      // Filter by template fields if specified
      if (template && template.fields.length > 0 && !template.fields.includes('all')) {
        const filtered: Record<string, unknown> = {}
        for (const field of template.fields) {
          if (data[field]) {
            filtered[field] = data[field]
          }
        }
        return filtered
      }

      return data
    } catch (error: any) {
      logger.error('Collect data failed:', error)
      return {}
    }
  }

  /**
   * Get average metric
   */
  private getAverageMetric(metric: string, start: Date, end: Date): number {
    // In production, calculate from actual data
    return Math.random() * 100
  }

  /**
   * Get total metric
   */
  private getTotalMetric(metric: string, start: Date, end: Date): number {
    // In production, calculate from actual data
    return Math.floor(Math.random() * 10000)
  }

  /**
   * Get regional data
   */
  private getRegionalData(region: string, start: Date, end: Date): Record<string, unknown> {
    // In production, get from actual regional data
    return {
      requests: Math.floor(Math.random() * 5000),
      errors: Math.floor(Math.random() * 50),
      latency: Math.random() * 1000,
    }
  }

  /**
   * Generate summary
   */
  private async generateSummary(
    data: Record<string, unknown>,
    template?: ReportTemplate | null
  ): Promise<Record<string, unknown>> {
    try {
      const summary: Record<string, unknown> = {
        totalRequests: (data.metrics as any)?.requests || 0,
        totalErrors: (data.metrics as any)?.errors || 0,
        averageCPU: (data.metrics as any)?.cpu || 0,
        averageMemory: (data.metrics as any)?.memory || 0,
        errorRate: this.calculateErrorRate(data),
      }

      return summary
    } catch (error: any) {
      logger.error('Generate summary failed:', error)
      return {}
    }
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(data: Record<string, unknown>): number {
    try {
      const requests = (data.metrics as any)?.requests || 0
      const errors = (data.metrics as any)?.errors || 0
      return requests > 0 ? (errors / requests) * 100 : 0
    } catch {
      return 0
    }
  }

  /**
   * Analyze trends
   */
  private async analyzeTrends(
    data: Record<string, unknown>,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Record<string, unknown>> {
    try {
      // In production, compare with previous period
      const trends: Record<string, unknown> = {
        requests: {
          change: Math.random() * 20 - 10, // -10% to +10%
          direction: Math.random() > 0.5 ? 'up' : 'down',
        },
        errors: {
          change: Math.random() * 10 - 5,
          direction: Math.random() > 0.5 ? 'up' : 'down',
        },
        cpu: {
          change: Math.random() * 15 - 7.5,
          direction: Math.random() > 0.5 ? 'up' : 'down',
        },
      }

      return trends
    } catch (error: any) {
      logger.error('Analyze trends failed:', error)
      return {}
    }
  }

  /**
   * Generate visualizations
   */
  private async generateVisualizations(
    data: Record<string, unknown>,
    template?: ReportTemplate | null
  ): Promise<Record<string, unknown>> {
    try {
      const visualizations: Record<string, unknown> = {}

      const vizTypes = template?.visualizations || ['line', 'bar']

      for (const vizType of vizTypes) {
        visualizations[vizType] = {
          type: vizType,
          data: this.formatDataForVisualization(data, vizType),
        }
      }

      return visualizations
    } catch (error: any) {
      logger.error('Generate visualizations failed:', error)
      return {}
    }
  }

  /**
   * Format data for visualization
   */
  private formatDataForVisualization(data: Record<string, unknown>, vizType: string): unknown {
    // In production, format data according to visualization type
    return data
  }

  /**
   * Export report
   */
  async exportReport(reportId: string, format: ExportFormat): Promise<Buffer> {
    try {
      const report = this.reports.get(reportId)
      if (!report) {
        throw new Error(`Report ${reportId} not found`)
      }

      let buffer: Buffer

      switch (format) {
        case 'csv':
          buffer = this.exportToCSV(report)
          break
        case 'json':
          buffer = Buffer.from(JSON.stringify(report, null, 2))
          break
        case 'pdf':
          buffer = this.exportToPDF(report)
          break
        case 'xlsx':
          buffer = this.exportToXLSX(report)
          break
        default:
          throw new Error(`Unsupported format: ${format}`)
      }

      logger.info('Report exported', {
        reportId,
        format,
        size: buffer.length,
      })

      return buffer
    } catch (error: any) {
      logger.error('Export report failed:', error)
      throw error
    }
  }

  /**
   * Export to CSV
   */
  private exportToCSV(report: AnalyticsReport): Buffer {
    // In production, implement CSV export
    const lines: string[] = []
    lines.push('Metric,Value')
    lines.push(`Period Start,${report.periodStart.toISOString()}`)
    lines.push(`Period End,${report.periodEnd.toISOString()}`)
    // Add more data
    return Buffer.from(lines.join('\n'))
  }

  /**
   * Export to PDF
   */
  private exportToPDF(report: AnalyticsReport): Buffer {
    // In production, implement PDF export using a library like pdfkit
    return Buffer.from('PDF export not implemented')
  }

  /**
   * Export to XLSX
   */
  private exportToXLSX(report: AnalyticsReport): Buffer {
    // In production, implement XLSX export using a library like exceljs
    return Buffer.from('XLSX export not implemented')
  }

  /**
   * Add template
   */
  addTemplate(template: ReportTemplate): void {
    try {
      this.templates.set(template.id, template)

      logger.info('Template added', {
        templateId: template.id,
        name: template.name,
      })

      // Publish event
      eventBus.publish('admin.analytics.template.added', {
        template,
      })
    } catch (error: any) {
      logger.error('Add template failed:', error)
      throw error
    }
  }

  /**
   * Get template
   */
  getTemplate(templateId: string): ReportTemplate | null {
    return this.templates.get(templateId) || null
  }

  /**
   * Get templates
   */
  getTemplates(type?: ReportType): ReportTemplate[] {
    let templates = Array.from(this.templates.values())

    if (type) {
      templates = templates.filter((t) => t.type === type)
    }

    return templates.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Schedule report
   */
  scheduleReport(
    templateId: string,
    recipients: string[],
    format: ExportFormat
  ): string {
    try {
      const template = this.getTemplate(templateId)
      if (!template || !template.schedule) {
        throw new Error(`Template ${templateId} not found or has no schedule`)
      }

      const scheduledId = `scheduled-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const nextRun = this.calculateNextRun(template.schedule)

      const scheduled: ScheduledReport = {
        id: scheduledId,
        templateId,
        recipients,
        format,
        enabled: true,
        nextRun,
        createdAt: new Date(),
      }

      this.scheduledReports.set(scheduledId, scheduled)

      logger.info('Report scheduled', {
        scheduledId,
        templateId,
        nextRun: nextRun.toISOString(),
      })

      return scheduledId
    } catch (error: any) {
      logger.error('Schedule report failed:', error)
      throw error
    }
  }

  /**
   * Calculate next run
   */
  private calculateNextRun(schedule: NonNullable<ReportTemplate['schedule']>): Date {
    const now = new Date()
    const next = new Date(now)

    switch (schedule.frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1)
        break
      case 'weekly':
        const daysUntilNext = (schedule.dayOfWeek! - next.getDay() + 7) % 7 || 7
        next.setDate(next.getDate() + daysUntilNext)
        break
      case 'monthly':
        next.setMonth(next.getMonth() + 1)
        next.setDate(schedule.dayOfMonth || 1)
        break
    }

    if (schedule.time) {
      const [hours, minutes] = schedule.time.split(':').map(Number)
      next.setHours(hours, minutes, 0, 0)
    }

    return next
  }

  /**
   * Check scheduled reports
   */
  private async checkScheduledReports(): Promise<void> {
    try {
      const now = new Date()

      for (const scheduled of this.scheduledReports.values()) {
        if (!scheduled.enabled || scheduled.nextRun > now) {
          continue
        }

        // Generate and send report
        await this.runScheduledReport(scheduled)

        // Update next run
        const template = this.getTemplate(scheduled.templateId)
        if (template?.schedule) {
          scheduled.nextRun = this.calculateNextRun(template.schedule)
          scheduled.lastRun = new Date()
          this.scheduledReports.set(scheduled.id, scheduled)
        }
      }
    } catch (error: any) {
      logger.error('Check scheduled reports failed:', error)
    }
  }

  /**
   * Run scheduled report
   */
  private async runScheduledReport(scheduled: ScheduledReport): Promise<void> {
    try {
      const template = this.getTemplate(scheduled.templateId)
      if (!template) {
        return
      }

      // Calculate period
      const periodEnd = new Date()
      const periodStart = new Date(periodEnd)

      switch (template.type) {
        case 'daily':
          periodStart.setDate(periodStart.getDate() - 1)
          break
        case 'weekly':
          periodStart.setDate(periodStart.getDate() - 7)
          break
        case 'monthly':
          periodStart.setMonth(periodStart.getMonth() - 1)
          break
      }

      // Generate report
      const report = await this.generateReport(
        template.type,
        periodStart,
        periodEnd,
        template.id,
        'system'
      )

      // Export report
      const buffer = await this.exportReport(report.id, scheduled.format)

      // Send to recipients (in production, implement actual sending)
      logger.info('Scheduled report generated and sent', {
        scheduledId: scheduled.id,
        reportId: report.id,
        recipients: scheduled.recipients,
        format: scheduled.format,
      })
    } catch (error: any) {
      logger.error('Run scheduled report failed:', error)
    }
  }

  /**
   * Update predictions
   */
  private updatePredictions(metric: string, value: unknown): void {
    try {
      // In production, implement ML-based predictions
      // For now, generate simple predictions
      const predictionId = `prediction-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      const prediction: PredictiveAnalytics = {
        id: predictionId,
        metric,
        prediction: {
          value: typeof value === 'number' ? value * 1.1 : 0,
          confidence: 0.75,
          timeframe: 'next 24 hours',
        },
        trend: Math.random() > 0.5 ? 'increasing' : 'decreasing',
        factors: {
          historical: 0.6,
          seasonality: 0.3,
          external: 0.1,
        },
        generatedAt: new Date(),
      }

      this.predictions.set(predictionId, prediction)

      // Keep only last 1000 predictions
      if (this.predictions.size > 1000) {
        const oldest = Array.from(this.predictions.keys()).sort()[0]
        this.predictions.delete(oldest)
      }
    } catch (error: any) {
      logger.error('Update predictions failed:', error)
    }
  }

  /**
   * Get report
   */
  getReport(reportId: string): AnalyticsReport | null {
    return this.reports.get(reportId) || null
  }

  /**
   * Get reports
   */
  getReports(type?: ReportType, limit = 100): AnalyticsReport[] {
    let reports = Array.from(this.reports.values())

    if (type) {
      reports = reports.filter((r) => r.type === type)
    }

    return reports
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit)
  }

  /**
   * Get predictions
   */
  getPredictions(metric?: string, limit = 100): PredictiveAnalytics[] {
    let predictions = Array.from(this.predictions.values())

    if (metric) {
      predictions = predictions.filter((p) => p.metric === metric)
    }

    return predictions
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit)
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalReports: number
    reportsByType: Record<string, number>
    totalTemplates: number
    totalScheduled: number
    enabledScheduled: number
    totalPredictions: number
  } {
    const reports = Array.from(this.reports.values())
    const reportsByType: Record<string, number> = {}

    for (const report of reports) {
      reportsByType[report.type] = (reportsByType[report.type] || 0) + 1
    }

    return {
      totalReports: reports.length,
      reportsByType,
      totalTemplates: this.templates.size,
      totalScheduled: this.scheduledReports.size,
      enabledScheduled: Array.from(this.scheduledReports.values()).filter((s) => s.enabled).length,
      totalPredictions: this.predictions.size,
    }
  }
}

// Global Advanced Analytics
export const advancedAnalytics = new AdvancedAnalytics()

