/**
 * Performance Profiling System
 * Phase 5: Neural Acceleration & Optimization
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { prisma } from '../config/database'

export interface PerformanceMetrics {
  requestId: string
  endpoint: string
  method: string
  responseTime: number
  tokens: number
  model: string
  device: 'cpu' | 'gpu'
  memoryUsage: number
  timestamp: Date
  metadata?: Record<string, unknown>
}

export interface PerformanceStats {
  totalRequests: number
  averageResponseTime: number
  p50: number // median
  p95: number // 95th percentile
  p99: number // 99th percentile
  minResponseTime: number
  maxResponseTime: number
  totalTokens: number
  averageTokens: number
  gpuUtilization: number
  errorRate: number
  throughput: number // requests per second
}

export class PerformanceProfilingSystem {
  private metrics: PerformanceMetrics[] = []
  private maxMetrics: number = 10000

  /**
   * Record performance metrics
   */
  recordMetrics(metrics: PerformanceMetrics): void {
    try {
      this.metrics.push(metrics)

      // Keep only recent metrics
      if (this.metrics.length > this.maxMetrics) {
        this.metrics.shift()
      }

      // Publish event
      eventBus.publish('neural.performance.metric', {
        requestId: metrics.requestId,
        responseTime: metrics.responseTime,
        model: metrics.model,
        device: metrics.device,
      })

      // Log if response time exceeds target
      if (metrics.responseTime > 200) {
        logger.warn('Response time exceeded target', {
          requestId: metrics.requestId,
          responseTime: metrics.responseTime,
          target: 200,
        })
      }
    } catch (error: any) {
      logger.error('Record metrics failed:', error)
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(timeRange?: { start: Date; end: Date }): PerformanceStats {
    try {
      let filteredMetrics = this.metrics

      if (timeRange) {
        filteredMetrics = this.metrics.filter(
          (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
        )
      }

      if (filteredMetrics.length === 0) {
        return {
          totalRequests: 0,
          averageResponseTime: 0,
          p50: 0,
          p95: 0,
          p99: 0,
          minResponseTime: 0,
          maxResponseTime: 0,
          totalTokens: 0,
          averageTokens: 0,
          gpuUtilization: 0,
          errorRate: 0,
          throughput: 0,
        }
      }

      // Calculate response times
      const responseTimes = filteredMetrics.map((m) => m.responseTime).sort((a, b) => a - b)
      const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0)
      const averageResponseTime = totalResponseTime / responseTimes.length

      // Calculate percentiles
      const p50 = this.percentile(responseTimes, 0.5)
      const p95 = this.percentile(responseTimes, 0.95)
      const p99 = this.percentile(responseTimes, 0.99)

      // Calculate tokens
      const totalTokens = filteredMetrics.reduce((sum, m) => sum + m.tokens, 0)
      const averageTokens = totalTokens / filteredMetrics.length

      // Calculate GPU utilization
      const gpuMetrics = filteredMetrics.filter((m) => m.device === 'gpu')
      const gpuUtilization = filteredMetrics.length > 0 ? (gpuMetrics.length / filteredMetrics.length) * 100 : 0

      // Calculate error rate (simplified - in production, track errors separately)
      const errorRate = 0

      // Calculate throughput
      if (timeRange) {
        const timeSpan = (timeRange.end.getTime() - timeRange.start.getTime()) / 1000 // seconds
        const throughput = timeSpan > 0 ? filteredMetrics.length / timeSpan : 0
      }

      const timeSpan = timeRange
        ? (timeRange.end.getTime() - timeRange.start.getTime()) / 1000
        : 60 // Default 60 seconds
      const throughput = timeSpan > 0 ? filteredMetrics.length / timeSpan : 0

      return {
        totalRequests: filteredMetrics.length,
        averageResponseTime,
        p50,
        p95,
        p99,
        minResponseTime: Math.min(...responseTimes),
        maxResponseTime: Math.max(...responseTimes),
        totalTokens,
        averageTokens,
        gpuUtilization,
        errorRate,
        throughput,
      }
    } catch (error: any) {
      logger.error('Get performance stats failed:', error)
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        totalTokens: 0,
        averageTokens: 0,
        gpuUtilization: 0,
        errorRate: 0,
        throughput: 0,
      }
    }
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0
    const index = Math.ceil(sortedArray.length * percentile) - 1
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))]
  }

  /**
   * Get latency breakdown
   */
  getLatencyBreakdown(timeRange?: { start: Date; end: Date }): {
    preProcessing: number
    inference: number
    postProcessing: number
    total: number
  } {
    try {
      let filteredMetrics = this.metrics

      if (timeRange) {
        filteredMetrics = this.metrics.filter(
          (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
        )
      }

      if (filteredMetrics.length === 0) {
        return {
          preProcessing: 0,
          inference: 0,
          postProcessing: 0,
          total: 0,
        }
      }

      // Simplified - in production, track actual latency breakdown
      const total = filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0) / filteredMetrics.length
      const preProcessing = total * 0.1 // 10%
      const inference = total * 0.8 // 80%
      const postProcessing = total * 0.1 // 10%

      return {
        preProcessing,
        inference,
        postProcessing,
        total,
      }
    } catch (error: any) {
      logger.error('Get latency breakdown failed:', error)
      return {
        preProcessing: 0,
        inference: 0,
        postProcessing: 0,
        total: 0,
      }
    }
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(period: 'hour' | 'day' | 'week' = 'hour'): {
    timestamps: Date[]
    responseTimes: number[]
    throughput: number[]
    gpuUtilization: number[]
  } {
    try {
      const now = new Date()
      let startTime: Date

      switch (period) {
        case 'hour':
          startTime = new Date(now.getTime() - 60 * 60 * 1000)
          break
        case 'day':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case 'week':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        default:
          startTime = new Date(now.getTime() - 60 * 60 * 1000)
      }

      const filteredMetrics = this.metrics.filter((m) => m.timestamp >= startTime)

      // Group by time intervals
      const interval = period === 'hour' ? 60 * 1000 : period === 'day' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 1min, 1hour, 1day
      const intervals: Map<number, PerformanceMetrics[]> = new Map()

      for (const metric of filteredMetrics) {
        const intervalKey = Math.floor(metric.timestamp.getTime() / interval) * interval
        if (!intervals.has(intervalKey)) {
          intervals.set(intervalKey, [])
        }
        intervals.get(intervalKey)!.push(metric)
      }

      const timestamps: Date[] = []
      const responseTimes: number[] = []
      const throughput: number[] = []
      const gpuUtilization: number[] = []

      for (const [intervalKey, metrics] of intervals.entries()) {
        timestamps.push(new Date(intervalKey))
        responseTimes.push(metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length)
        throughput.push(metrics.length / (interval / 1000))
        const gpuCount = metrics.filter((m) => m.device === 'gpu').length
        gpuUtilization.push((gpuCount / metrics.length) * 100)
      }

      return {
        timestamps,
        responseTimes,
        throughput,
        gpuUtilization,
      }
    } catch (error: any) {
      logger.error('Get performance trends failed:', error)
      return {
        timestamps: [],
        responseTimes: [],
        throughput: [],
        gpuUtilization: [],
      }
    }
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThan: Date): void {
    try {
      const beforeCount = this.metrics.length
      this.metrics = this.metrics.filter((m) => m.timestamp >= olderThan)
      const afterCount = this.metrics.length

      logger.info(`Cleared old metrics: ${beforeCount - afterCount} metrics removed`, {
        beforeCount,
        afterCount,
      })
    } catch (error: any) {
      logger.error('Clear old metrics failed:', error)
    }
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit).reverse()
  }
}

// Global Performance Profiling System
export const performanceProfilingSystem = new PerformanceProfilingSystem()

