/**
 * Phase 10.4 - Business Intelligence & Analytics
 * 
 * Advanced analytics, reporting, revenue analytics
 * - Advanced Analytics (Business Intelligence)
 * - Reporting System
 * - Revenue Analytics
 * - Cost Management
 * - Customer Success Tools
 * - Churn Analysis
 * - Lifetime Value (LTV)
 * - Predictive Analytics
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type ReportType = 'revenue' | 'usage' | 'customers' | 'performance' | 'custom'
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'html'
export type MetricType = 'revenue' | 'mrr' | 'arr' | 'churn' | 'ltv' | 'cac' | 'custom'

export interface BusinessReport {
  id: string
  type: ReportType
  title: string
  description: string
  format: ReportFormat
  data: any
  filters: Record<string, any>
  period: {
    start: Date
    end: Date
  }
  generatedAt: Date
  generatedBy: string
}

export interface RevenueMetric {
  id: string
  date: Date
  revenue: number
  currency: string
  sources: {
    subscriptions: number
    usage: number
    oneTime: number
    refunds: number
  }
  mrr: number // Monthly Recurring Revenue
  arr: number // Annual Recurring Revenue
  createdAt: Date
}

export interface CostMetric {
  id: string
  date: Date
  costs: {
    infrastructure: number
    thirdParty: number
    support: number
    marketing: number
    other: number
  }
  total: number
  currency: string
  createdAt: Date
}

export interface CustomerMetric {
  id: string
  date: Date
  metrics: {
    totalCustomers: number
    newCustomers: number
    churnedCustomers: number
    activeCustomers: number
    churnRate: number // percentage
    ltv: number // Lifetime Value
    cac: number // Customer Acquisition Cost
  }
  createdAt: Date
}

export interface ChurnAnalysis {
  id: string
  period: {
    start: Date
    end: Date
  }
  churnedCustomers: number
  churnRate: number // percentage
  reasons: {
    reason: string
    count: number
    percentage: number
  }[]
  revenueLost: number
  recommendations: string[]
  analyzedAt: Date
}

export interface PredictiveForecast {
  id: string
  metric: MetricType
  forecast: {
    date: Date
    value: number
    confidence: number // 0-100
  }[]
  model: string
  accuracy: number // 0-100
  generatedAt: Date
}

export interface BusinessDashboard {
  id: string
  name: string
  description: string
  widgets: BusinessWidget[]
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

export interface BusinessWidget {
  id: string
  type: 'metric' | 'chart' | 'table' | 'kpi'
  title: string
  config: Record<string, any>
  position: {
    x: number
    y: number
    width: number
    height: number
  }
}

class BusinessIntelligenceAnalytics {
  private reports: Map<string, BusinessReport> = new Map()
  private revenueMetrics: Map<string, RevenueMetric> = new Map()
  private costMetrics: Map<string, CostMetric> = new Map()
  private customerMetrics: Map<string, CustomerMetric> = new Map()
  private churnAnalyses: Map<string, ChurnAnalysis> = new Map()
  private forecasts: Map<string, PredictiveForecast> = new Map()
  private dashboards: Map<string, BusinessDashboard> = new Map()

  async initialize() {
    logInfo('Initializing Business Intelligence & Analytics...')

    // Initialize default dashboards
    await this.initializeDefaultDashboards()

    logInfo('✅ Business Intelligence & Analytics initialized')
  }

  // Initialize default dashboards
  private async initializeDefaultDashboards(): Promise<void> {
    const defaultDashboard: BusinessDashboard = {
      id: nanoid(),
      name: 'Business Overview',
      description: 'Default business overview dashboard',
      widgets: [
        {
          id: nanoid(),
          type: 'kpi',
          title: 'MRR',
          config: {},
          position: { x: 0, y: 0, width: 4, height: 2 }
        },
        {
          id: nanoid(),
          type: 'kpi',
          title: 'ARR',
          config: {},
          position: { x: 4, y: 0, width: 4, height: 2 }
        },
        {
          id: nanoid(),
          type: 'kpi',
          title: 'Churn Rate',
          config: {},
          position: { x: 8, y: 0, width: 4, height: 2 }
        },
        {
          id: nanoid(),
          type: 'chart',
          title: 'Revenue Trend',
          config: {},
          position: { x: 0, y: 2, width: 12, height: 4 }
        }
      ],
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.dashboards.set(defaultDashboard.id, defaultDashboard)

    logInfo('✅ Default dashboards initialized')
  }

  // Generate report
  async generateReport(
    type: ReportType,
    title: string,
    description: string,
    format: ReportFormat,
    filters: Record<string, any>,
    period: { start: Date; end: Date },
    generatedBy: string
  ): Promise<BusinessReport> {
    try {
      const reportId = nanoid()
      const now = new Date()

      // Collect data based on type
      const data = await this.collectReportData(type, filters, period)

      const report: BusinessReport = {
        id: reportId,
        type,
        title,
        description,
        format,
        data,
        filters,
        period,
        generatedAt: now,
        generatedBy
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.businessReport.create({
          data: {
            id: reportId,
            type,
            title,
            description,
            format,
            data,
            filters,
            periodStart: period.start,
            periodEnd: period.end,
            generatedAt: now,
            generatedBy
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Generate report in database' })
      }

      this.reports.set(reportId, report)

      logInfo(`✅ Report generated ${reportId}: ${title}`)

      return report
    } catch (error) {
      logError(error as Error, { context: 'Generate report' })
      throw error
    }
  }

  // Collect report data
  private async collectReportData(
    type: ReportType,
    filters: Record<string, any>,
    period: { start: Date; end: Date }
  ): Promise<any> {
    // In production, collect actual data
    // For now, return sample data
    switch (type) {
      case 'revenue':
        return {
          total: 100000,
          mrr: 10000,
          arr: 120000,
          growth: 15
        }
      case 'usage':
        return {
          totalRequests: 1000000,
          totalTokens: 5000000,
          activeUsers: 1000
        }
      case 'customers':
        return {
          total: 500,
          new: 50,
          churned: 10,
          active: 440
        }
      default:
        return {}
    }
  }

  // Record revenue metric
  async recordRevenueMetric(
    date: Date,
    revenue: number,
    currency: string,
    sources: RevenueMetric['sources']
  ): Promise<RevenueMetric> {
    try {
      const metricId = nanoid()
      const now = new Date()

      // Calculate MRR and ARR
      const mrr = sources.subscriptions / 30 // Approximate
      const arr = mrr * 12

      const metric: RevenueMetric = {
        id: metricId,
        date,
        revenue,
        currency,
        sources,
        mrr,
        arr,
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.revenueMetric.create({
          data: {
            id: metricId,
            date,
            revenue,
            currency,
            sources,
            mrr,
            arr,
            createdAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Record revenue metric in database' })
      }

      this.revenueMetrics.set(metricId, metric)

      return metric
    } catch (error) {
      logError(error as Error, { context: 'Record revenue metric' })
      throw error
    }
  }

  // Record cost metric
  async recordCostMetric(
    date: Date,
    costs: CostMetric['costs'],
    currency: string
  ): Promise<CostMetric> {
    try {
      const metricId = nanoid()
      const now = new Date()
      const total = Object.values(costs).reduce((sum, cost) => sum + cost, 0)

      const metric: CostMetric = {
        id: metricId,
        date,
        costs,
        total,
        currency,
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.costMetric.create({
          data: {
            id: metricId,
            date,
            costs,
            total,
            currency,
            createdAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Record cost metric in database' })
      }

      this.costMetrics.set(metricId, metric)

      return metric
    } catch (error) {
      logError(error as Error, { context: 'Record cost metric' })
      throw error
    }
  }

  // Record customer metric
  async recordCustomerMetric(
    date: Date,
    metrics: CustomerMetric['metrics']
  ): Promise<CustomerMetric> {
    try {
      const metricId = nanoid()
      const now = new Date()

      const metric: CustomerMetric = {
        id: metricId,
        date,
        metrics,
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.customerMetric.create({
          data: {
            id: metricId,
            date,
            metrics,
            createdAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Record customer metric in database' })
      }

      this.customerMetrics.set(metricId, metric)

      return metric
    } catch (error) {
      logError(error as Error, { context: 'Record customer metric' })
      throw error
    }
  }

  // Analyze churn
  async analyzeChurn(
    period: { start: Date; end: Date }
  ): Promise<ChurnAnalysis> {
    try {
      const analysisId = nanoid()
      const now = new Date()

      // In production, perform actual churn analysis
      // For now, simulate analysis
      const churnedCustomers = Math.floor(Math.random() * 50) + 10
      const totalCustomers = 500
      const churnRate = (churnedCustomers / totalCustomers) * 100

      const reasons = [
        { reason: 'Price too high', count: Math.floor(churnedCustomers * 0.3), percentage: 30 },
        { reason: 'Poor service', count: Math.floor(churnedCustomers * 0.2), percentage: 20 },
        { reason: 'Found alternative', count: Math.floor(churnedCustomers * 0.25), percentage: 25 },
        { reason: 'No longer needed', count: Math.floor(churnedCustomers * 0.25), percentage: 25 }
      ]

      const revenueLost = churnedCustomers * 100 // Average revenue per customer

      const recommendations = [
        'Improve onboarding process',
        'Offer retention discounts',
        'Enhance customer support',
        'Implement loyalty program'
      ]

      const analysis: ChurnAnalysis = {
        id: analysisId,
        period,
        churnedCustomers,
        churnRate,
        reasons,
        revenueLost,
        recommendations,
        analyzedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.churnAnalysis.create({
          data: {
            id: analysisId,
            periodStart: period.start,
            periodEnd: period.end,
            churnedCustomers,
            churnRate,
            reasons,
            revenueLost,
            recommendations,
            analyzedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Analyze churn in database' })
      }

      this.churnAnalyses.set(analysisId, analysis)

      logInfo(`✅ Churn analysis completed ${analysisId}: ${churnRate.toFixed(2)}%`)

      return analysis
    } catch (error) {
      logError(error as Error, { context: 'Analyze churn' })
      throw error
    }
  }

  // Generate predictive forecast
  async generatePredictiveForecast(
    metric: MetricType,
    period: { start: Date; end: Date },
    model: string = 'linear_regression'
  ): Promise<PredictiveForecast> {
    try {
      const forecastId = nanoid()
      const now = new Date()

      // In production, use ML model to generate forecast
      // For now, simulate forecast
      const forecast: PredictiveForecast['forecast'] = []
      const days = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24))

      for (let i = 0; i < days; i++) {
        const date = new Date(period.start.getTime() + i * 24 * 60 * 60 * 1000)
        const value = 10000 + Math.random() * 1000 // Simulate value
        forecast.push({
          date,
          value,
          confidence: 85 - Math.random() * 10 // 75-85% confidence
        })
      }

      const predictiveForecast: PredictiveForecast = {
        id: forecastId,
        metric,
        forecast,
        model,
        accuracy: 85,
        generatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.predictiveForecast.create({
          data: {
            id: forecastId,
            metric,
            forecast,
            model,
            accuracy: 85,
            generatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Generate predictive forecast in database' })
      }

      this.forecasts.set(forecastId, predictiveForecast)

      logInfo(`✅ Predictive forecast generated ${forecastId}: ${metric}`)

      return predictiveForecast
    } catch (error) {
      logError(error as Error, { context: 'Generate predictive forecast' })
      throw error
    }
  }

  // Get revenue metrics
  async getRevenueMetrics(startDate?: Date, endDate?: Date): Promise<RevenueMetric[]> {
    const metrics: RevenueMetric[] = []
    for (const metric of this.revenueMetrics.values()) {
      if (startDate && metric.date < startDate) continue
      if (endDate && metric.date > endDate) continue
      metrics.push(metric)
    }
    return metrics.sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  // Get customer metrics
  async getCustomerMetrics(startDate?: Date, endDate?: Date): Promise<CustomerMetric[]> {
    const metrics: CustomerMetric[] = []
    for (const metric of this.customerMetrics.values()) {
      if (startDate && metric.date < startDate) continue
      if (endDate && metric.date > endDate) continue
      metrics.push(metric)
    }
    return metrics.sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  // Get churn analyses
  async getChurnAnalyses(): Promise<ChurnAnalysis[]> {
    return Array.from(this.churnAnalyses.values()).sort((a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime())
  }
}

export const businessIntelligenceAnalytics = new BusinessIntelligenceAnalytics()

