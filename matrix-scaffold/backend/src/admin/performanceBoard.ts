/**
 * Performance & Analytics Board
 * Phase 7.3: Admin Dashboard & Integration Control
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { realTimeDashboard } from '../deployment/dashboard'
import { smartMonitoringAutoRepair } from '../deployment/monitoring'
import { aiLoadBalancerOrchestrator } from '../deployment/loadBalancer'
import { intelligentLoadBalancer } from '../deployment/intelligentLoadBalancer'

export interface PerformanceMetrics {
  cpu: {
    current: number
    average: number
    peak: number
    history: Array<{ timestamp: Date; value: number }>
  }
  memory: {
    current: number
    average: number
    peak: number
    history: Array<{ timestamp: Date; value: number }>
  }
  network: {
    in: {
      current: number
      average: number
      peak: number
      history: Array<{ timestamp: Date; value: number }>
    }
    out: {
      current: number
      average: number
      peak: number
      history: Array<{ timestamp: Date; value: number }>
    }
  }
  api: {
    responseTime: {
      current: number
      average: number
      p50: number
      p95: number
      p99: number
      history: Array<{ timestamp: Date; value: number }>
    }
    errorRate: {
      current: number
      average: number
      history: Array<{ timestamp: Date; value: number }>
    }
    throughput: {
      current: number
      average: number
      peak: number
      history: Array<{ timestamp: Date; value: number }>
    }
  }
}

export interface RegionalComparison {
  region: string
  metrics: {
    cpu: number
    memory: number
    responseTime: number
    errorRate: number
    throughput: number
  }
  healthScore: number
}

export interface AnalyticsReport {
  id: string
  type: 'daily' | 'weekly' | 'monthly'
  period: {
    start: Date
    end: Date
  }
  summary: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    avgResponseTime: number
    avgErrorRate: number
    peakThroughput: number
  }
  trends: {
    requests: Array<{ date: string; value: number }>
    responseTime: Array<{ date: string; value: number }>
    errorRate: Array<{ date: string; value: number }>
  }
  regions: RegionalComparison[]
  generatedAt: Date
}

export class PerformanceAndAnalyticsBoard {
  private metrics: PerformanceMetrics | null = null
  private metricsHistory: Map<string, Array<{ timestamp: Date; value: number }>> = new Map()
  private reports: Map<string, AnalyticsReport> = new Map()
  private updateInterval: NodeJS.Timeout | null = null

  /**
   * Initialize Performance & Analytics Board
   */
  async initialize(): Promise<void> {
    try {
      // Start periodic updates
      this.startPeriodicUpdates()

      logger.info('Performance & Analytics Board initialized')
    } catch (error: any) {
      logger.error('Performance & Analytics Board initialization failed:', error)
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
        await this.updateMetrics()
      } catch (error) {
        logger.error('Metrics update failed:', error)
      }
    }, 10000) // Every 10 seconds

    logger.info('Performance metrics periodic updates started')
  }

  /**
   * Stop periodic updates
   */
  stopPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
      logger.info('Performance metrics periodic updates stopped')
    }
  }

  /**
   * Update metrics
   */
  private async updateMetrics(): Promise<void> {
    try {
      // Get current metrics from monitoring
      const monitoringMetrics = smartMonitoringAutoRepair.getCurrentMetrics()
      const loadBalancerStats = intelligentLoadBalancer.getStats()
      const regionStats = aiLoadBalancerOrchestrator.getRegionStats()

      const now = new Date()

      // CPU metrics
      const cpuCurrent = monitoringMetrics?.cpu || 0
      this.addToHistory('cpu', { timestamp: now, value: cpuCurrent })

      // Memory metrics
      const memoryUsage = process.memoryUsage()
      const memoryCurrent = memoryUsage.heapUsed / memoryUsage.heapTotal
      this.addToHistory('memory', { timestamp: now, value: memoryCurrent })

      // Network metrics
      const networkIn = monitoringMetrics?.network?.in || 0
      const networkOut = monitoringMetrics?.network?.out || 0
      this.addToHistory('networkIn', { timestamp: now, value: networkIn })
      this.addToHistory('networkOut', { timestamp: now, value: networkOut })

      // API metrics
      const responseTime = loadBalancerStats.avgResponseTime || 0
      const errorRate = monitoringMetrics?.errorRate || 0
      const throughput = loadBalancerStats.totalRequests || 0

      this.addToHistory('responseTime', { timestamp: now, value: responseTime })
      this.addToHistory('errorRate', { timestamp: now, value: errorRate })
      this.addToHistory('throughput', { timestamp: now, value: throughput })

      // Build metrics object
      const cpuHistory = this.getHistory('cpu', 100)
      const memoryHistory = this.getHistory('memory', 100)
      const networkInHistory = this.getHistory('networkIn', 100)
      const networkOutHistory = this.getHistory('networkOut', 100)
      const responseTimeHistory = this.getHistory('responseTime', 100)
      const errorRateHistory = this.getHistory('errorRate', 100)
      const throughputHistory = this.getHistory('throughput', 100)

      const metrics: PerformanceMetrics = {
        cpu: {
          current: cpuCurrent,
          average: this.calculateAverage(cpuHistory),
          peak: this.calculatePeak(cpuHistory),
          history: cpuHistory,
        },
        memory: {
          current: memoryCurrent,
          average: this.calculateAverage(memoryHistory),
          peak: this.calculatePeak(memoryHistory),
          history: memoryHistory,
        },
        network: {
          in: {
            current: networkIn,
            average: this.calculateAverage(networkInHistory),
            peak: this.calculatePeak(networkInHistory),
            history: networkInHistory,
          },
          out: {
            current: networkOut,
            average: this.calculateAverage(networkOutHistory),
            peak: this.calculatePeak(networkOutHistory),
            history: networkOutHistory,
          },
        },
        api: {
          responseTime: {
            current: responseTime,
            average: this.calculateAverage(responseTimeHistory),
            p50: loadBalancerStats.p50ResponseTime || 0,
            p95: loadBalancerStats.p95ResponseTime || 0,
            p99: loadBalancerStats.p99ResponseTime || 0,
            history: responseTimeHistory,
          },
          errorRate: {
            current: errorRate,
            average: this.calculateAverage(errorRateHistory),
            history: errorRateHistory,
          },
          throughput: {
            current: throughput,
            average: this.calculateAverage(throughputHistory),
            peak: this.calculatePeak(throughputHistory),
            history: throughputHistory,
          },
        },
      }

      this.metrics = metrics

      logger.debug('Performance metrics updated')
    } catch (error: any) {
      logger.error('Update metrics failed:', error)
    }
  }

  /**
   * Add to history
   */
  private addToHistory(key: string, data: { timestamp: Date; value: number }): void {
    const history = this.metricsHistory.get(key) || []
    history.push(data)

    // Keep only last 1000 entries
    if (history.length > 1000) {
      history.shift()
    }

    this.metricsHistory.set(key, history)
  }

  /**
   * Get history
   */
  private getHistory(key: string, limit = 100): Array<{ timestamp: Date; value: number }> {
    const history = this.metricsHistory.get(key) || []
    return history.slice(-limit)
  }

  /**
   * Calculate average
   */
  private calculateAverage(history: Array<{ timestamp: Date; value: number }>): number {
    if (history.length === 0) return 0
    const sum = history.reduce((acc, item) => acc + item.value, 0)
    return sum / history.length
  }

  /**
   * Calculate peak
   */
  private calculatePeak(history: Array<{ timestamp: Date; value: number }>): number {
    if (history.length === 0) return 0
    return Math.max(...history.map((item) => item.value))
  }

  /**
   * Get metrics
   */
  getMetrics(): PerformanceMetrics | null {
    return this.metrics
  }

  /**
   * Get regional comparison
   */
  async getRegionalComparison(): Promise<RegionalComparison[]> {
    try {
      const regionStats = aiLoadBalancerOrchestrator.getRegionStats()
      const monitoringMetrics = smartMonitoringAutoRepair.getCurrentMetrics()
      const loadBalancerStats = intelligentLoadBalancer.getStats()

      const comparison: RegionalComparison[] = regionStats.regions.map((region) => ({
        region: region.id,
        metrics: {
          cpu: 0, // In production, get from actual metrics
          memory: 0,
          responseTime: region.avgResponseTime || 0,
          errorRate: 0,
          throughput: region.currentLoad || 0,
        },
        healthScore: region.healthScore,
      }))

      return comparison
    } catch (error: any) {
      logger.error('Get regional comparison failed:', error)
      return []
    }
  }

  /**
   * Generate analytics report
   */
  async generateReport(type: 'daily' | 'weekly' | 'monthly'): Promise<string> {
    try {
      const reportId = `report-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const now = new Date()

      let start: Date
      let end: Date = now

      switch (type) {
        case 'daily':
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case 'weekly':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'monthly':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
      }

      logger.info('Generating analytics report', {
        reportId,
        type,
        period: { start, end },
      })

      // Get metrics for period
      const metrics = this.metrics
      const regionalComparison = await this.getRegionalComparison()

      // Calculate summary
      const summary = {
        totalRequests: loadBalancerStats.totalRequests || 0,
        successfulRequests: loadBalancerStats.successfulRequests || 0,
        failedRequests: loadBalancerStats.failedRequests || 0,
        avgResponseTime: metrics?.api.responseTime.average || 0,
        avgErrorRate: metrics?.api.errorRate.average || 0,
        peakThroughput: metrics?.api.throughput.peak || 0,
      }

      // Generate trends (simplified - in production, use actual data)
      const trends = {
        requests: [],
        responseTime: [],
        errorRate: [],
      } as AnalyticsReport['trends']

      const report: AnalyticsReport = {
        id: reportId,
        type,
        period: { start, end },
        summary,
        trends,
        regions: regionalComparison,
        generatedAt: now,
      }

      this.reports.set(reportId, report)

      logger.info('Analytics report generated', {
        reportId,
        type,
      })

      eventBus.publish('admin.analytics.report.generated', {
        report,
      })

      return reportId
    } catch (error: any) {
      logger.error('Generate analytics report failed:', error)
      throw error
    }
  }

  /**
   * Get report
   */
  getReport(reportId: string): AnalyticsReport | null {
    return this.reports.get(reportId) || null
  }

  /**
   * Get all reports
   */
  getAllReports(limit = 20): AnalyticsReport[] {
    return Array.from(this.reports.values())
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit)
  }
}

// Global Performance & Analytics Board
export const performanceAndAnalyticsBoard = new PerformanceAndAnalyticsBoard()

