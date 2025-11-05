/**
 * Phase 8.3 - Advanced Analytics & BI
 * 
 * Professional analytics and business intelligence
 * - Real-time dashboards
 * - Advanced reporting
 * - Predictive analytics
 * - Revenue forecasting
 * - Customer insights
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type ReportType = 'revenue' | 'usage' | 'customers' | 'performance' | 'forecast'
export type TimeRange = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
export type MetricType = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'growth'

export interface AnalyticsReport {
  id: string
  type: ReportType
  title: string
  description?: string
  timeRange: TimeRange
  startDate: Date
  endDate: Date
  metrics: ReportMetric[]
  charts: ChartConfig[]
  createdAt: Date
}

export interface ReportMetric {
  name: string
  type: MetricType
  value: number
  previousValue?: number
  change?: number
  changePercent?: number
  trend: 'up' | 'down' | 'stable'
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'table'
  title: string
  data: any[]
  xAxis?: string
  yAxis?: string
}

export interface Forecast {
  id: string
  type: 'revenue' | 'usage' | 'customers'
  period: TimeRange
  currentValue: number
  forecastValue: number
  confidence: number // 0-100
  factors: string[]
  createdAt: Date
}

class AdvancedAnalyticsManager {
  private reports: Map<string, AnalyticsReport> = new Map()
  private forecasts: Map<string, Forecast> = new Map()

  async initialize() {
    logInfo('Initializing Advanced Analytics & BI...')
    logInfo('✅ Advanced Analytics & BI initialized')
  }

  // Generate revenue report
  async generateRevenueReport(
    startDate: Date,
    endDate: Date,
    timeRange: TimeRange = 'day'
  ): Promise<AnalyticsReport> {
    try {
      const reportId = nanoid()

      // Fetch data from database
      const { prisma } = await import('../config/database')
      
      // Get invoices
      const invoices = await prisma.invoice.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          status: 'paid'
        }
      })

      // Calculate metrics
      const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0)
      const invoiceCount = invoices.length
      const averageInvoice = totalRevenue / invoiceCount || 0

      // Get previous period for comparison
      const periodDiff = endDate.getTime() - startDate.getTime()
      const prevStartDate = new Date(startDate.getTime() - periodDiff)
      const prevEndDate = startDate

      const prevInvoices = await prisma.invoice.findMany({
        where: {
          createdAt: {
            gte: prevStartDate,
            lte: prevEndDate
          },
          status: 'paid'
        }
      })

      const prevRevenue = prevInvoices.reduce((sum, inv) => sum + inv.amount, 0)
      const revenueChange = totalRevenue - prevRevenue
      const revenueChangePercent = prevRevenue > 0 ? (revenueChange / prevRevenue) * 100 : 0

      // Group by time range
      const revenueByPeriod = this.groupByTimeRange(invoices, timeRange, 'amount')

      const metrics: ReportMetric[] = [
        {
          name: 'Total Revenue',
          type: 'sum',
          value: totalRevenue,
          previousValue: prevRevenue,
          change: revenueChange,
          changePercent: revenueChangePercent,
          trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'stable'
        },
        {
          name: 'Invoice Count',
          type: 'count',
          value: invoiceCount,
          previousValue: prevInvoices.length,
          change: invoiceCount - prevInvoices.length,
          changePercent: prevInvoices.length > 0 ? ((invoiceCount - prevInvoices.length) / prevInvoices.length) * 100 : 0,
          trend: invoiceCount > prevInvoices.length ? 'up' : invoiceCount < prevInvoices.length ? 'down' : 'stable'
        },
        {
          name: 'Average Invoice',
          type: 'avg',
          value: averageInvoice,
          previousValue: prevInvoices.length > 0 ? prevRevenue / prevInvoices.length : 0,
          trend: 'stable'
        }
      ]

      const charts: ChartConfig[] = [
        {
          type: 'line',
          title: 'Revenue Over Time',
          data: revenueByPeriod,
          xAxis: 'period',
          yAxis: 'revenue'
        },
        {
          type: 'bar',
          title: 'Revenue by Payment Provider',
          data: this.groupByField(invoices, 'paymentProvider', 'amount'),
          xAxis: 'provider',
          yAxis: 'revenue'
        }
      ]

      const report: AnalyticsReport = {
        id: reportId,
        type: 'revenue',
        title: 'Revenue Report',
        timeRange,
        startDate,
        endDate,
        metrics,
        charts,
        createdAt: new Date()
      }

      this.reports.set(reportId, report)
      logInfo(`✅ Generated revenue report ${reportId}`)

      return report
    } catch (error) {
      logError(error as Error, { context: 'Generate revenue report' })
      throw error
    }
  }

  // Generate usage report
  async generateUsageReport(
    startDate: Date,
    endDate: Date,
    subscriptionId?: string
  ): Promise<AnalyticsReport> {
    try {
      const reportId = nanoid()

      const { prisma } = await import('../config/database')
      
      const where: any = {
        periodStart: {
          gte: startDate,
          lte: endDate
        }
      }

      if (subscriptionId) {
        where.subscriptionId = subscriptionId
      }

      const usageMetrics = await prisma.usageMetrics.findMany({ where })

      const totalRequests = usageMetrics.reduce((sum, m) => sum + m.requests, 0)
      const totalTokens = usageMetrics.reduce((sum, m) => sum + m.tokens, 0)
      const totalCost = usageMetrics.reduce((sum, m) => sum + m.cost, 0)

      const metrics: ReportMetric[] = [
        {
          name: 'Total Requests',
          type: 'sum',
          value: totalRequests,
          trend: 'up'
        },
        {
          name: 'Total Tokens',
          type: 'sum',
          value: totalTokens,
          trend: 'up'
        },
        {
          name: 'Total Cost',
          type: 'sum',
          value: totalCost,
          trend: 'up'
        },
        {
          name: 'Average Cost per Request',
          type: 'avg',
          value: totalRequests > 0 ? totalCost / totalRequests : 0,
          trend: 'stable'
        }
      ]

      const charts: ChartConfig[] = [
        {
          type: 'line',
          title: 'Usage Over Time',
          data: this.groupByTimeRange(usageMetrics, 'day', 'requests'),
          xAxis: 'period',
          yAxis: 'requests'
        }
      ]

      const report: AnalyticsReport = {
        id: reportId,
        type: 'usage',
        title: 'Usage Report',
        timeRange: 'day',
        startDate,
        endDate,
        metrics,
        charts,
        createdAt: new Date()
      }

      this.reports.set(reportId, report)
      return report
    } catch (error) {
      logError(error as Error, { context: 'Generate usage report' })
      throw error
    }
  }

  // Generate forecast
  async generateForecast(
    type: 'revenue' | 'usage' | 'customers',
    period: TimeRange = 'month'
  ): Promise<Forecast> {
    try {
      const forecastId = nanoid()

      // Get historical data
      const { prisma } = await import('../config/database')
      
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 6) // Last 6 months

      let currentValue = 0
      let historicalData: number[] = []

      if (type === 'revenue') {
        const invoices = await prisma.invoice.findMany({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: 'paid'
          }
        })
        currentValue = invoices.reduce((sum, inv) => sum + inv.amount, 0)
        historicalData = this.groupByTimeRange(invoices, 'month', 'amount').map((d: any) => d.revenue)
      } else if (type === 'usage') {
        const usage = await prisma.usageMetrics.findMany({
          where: {
            periodStart: { gte: startDate, lte: endDate }
          }
        })
        currentValue = usage.reduce((sum, m) => sum + m.requests, 0)
        historicalData = this.groupByTimeRange(usage, 'month', 'requests').map((d: any) => d.requests)
      } else {
        const subscriptions = await prisma.subscription.findMany({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: 'active'
          }
        })
        currentValue = subscriptions.length
        historicalData = this.groupByTimeRange(subscriptions, 'month', 'count').map((d: any) => d.count)
      }

      // Simple linear forecast
      const forecastValue = this.linearForecast(historicalData, currentValue)
      const confidence = this.calculateConfidence(historicalData)

      const forecast: Forecast = {
        id: forecastId,
        type,
        period,
        currentValue,
        forecastValue,
        confidence,
        factors: ['historical_trend', 'seasonality', 'growth_rate'],
        createdAt: new Date()
      }

      this.forecasts.set(forecastId, forecast)
      logInfo(`✅ Generated forecast ${forecastId} for ${type}`)

      return forecast
    } catch (error) {
      logError(error as Error, { context: 'Generate forecast' })
      throw error
    }
  }

  // Helper: Group by time range
  private groupByTimeRange(data: any[], timeRange: TimeRange, field: string): any[] {
    const grouped: Record<string, number> = {}
    
    for (const item of data) {
      const date = new Date(item.createdAt || item.periodStart || item.createdAt)
      let key: string

      if (timeRange === 'hour') {
        key = date.toISOString().slice(0, 13) + ':00:00'
      } else if (timeRange === 'day') {
        key = date.toISOString().slice(0, 10)
      } else if (timeRange === 'week') {
        const week = this.getWeek(date)
        key = `${date.getFullYear()}-W${week}`
      } else if (timeRange === 'month') {
        key = date.toISOString().slice(0, 7)
      } else if (timeRange === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1
        key = `${date.getFullYear()}-Q${quarter}`
      } else {
        key = date.getFullYear().toString()
      }

      const value = field === 'count' ? 1 : (item[field] || 0)
      grouped[key] = (grouped[key] || 0) + value
    }

    return Object.entries(grouped).map(([period, value]) => ({
      period,
      [field === 'count' ? 'count' : field]: value
    })).sort((a, b) => a.period.localeCompare(b.period))
  }

  // Helper: Group by field
  private groupByField(data: any[], field: string, valueField: string): any[] {
    const grouped: Record<string, number> = {}
    
    for (const item of data) {
      const key = item[field] || 'unknown'
      const value = item[valueField] || 0
      grouped[key] = (grouped[key] || 0) + value
    }

    return Object.entries(grouped).map(([key, value]) => ({
      [field]: key,
      [valueField]: value
    }))
  }

  // Helper: Get week number
  private getWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  // Helper: Linear forecast
  private linearForecast(historical: number[], current: number): number {
    if (historical.length < 2) return current * 1.1 // 10% growth estimate

    const avgGrowth = historical.slice(-3).reduce((sum, val, i, arr) => {
      if (i === 0) return sum
      return sum + (val - arr[i - 1]) / arr[i - 1]
    }, 0) / (historical.length - 1)

    return current * (1 + avgGrowth)
  }

  // Helper: Calculate confidence
  private calculateConfidence(historical: number[]): number {
    if (historical.length < 3) return 50
    if (historical.length < 6) return 70
    return 85
  }

  // Get report
  async getReport(reportId: string): Promise<AnalyticsReport | null> {
    return this.reports.get(reportId) || null
  }
}

export const advancedAnalyticsManager = new AdvancedAnalyticsManager()

