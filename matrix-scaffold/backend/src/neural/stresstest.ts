/**
 * Production Stress Tests System
 * Phase 5: Multi-Model & Advanced Intelligence Stage
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { neuralLoadBalancer } from './loadbalancer'
import { autoScalingSystem } from './autoscaling'
import { performanceProfilingSystem } from './profiling'
import { gpuAccelerationSystem } from './gpu'

export interface StressTestConfig {
  name: string
  description: string
  duration: number // milliseconds
  concurrency: number // concurrent requests
  requestRate: number // requests per second
  targetEndpoint: string
  payload: {
    prompt: string
    maxTokens?: number
    temperature?: number
  }
  successCriteria: {
    maxResponseTime: number
    minSuccessRate: number
    maxErrorRate: number
  }
}

export interface StressTestResult {
  success: boolean
  testName: string
  duration: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  successRate: number
  errorRate: number
  averageResponseTime: number
  p50: number
  p95: number
  p99: number
  minResponseTime: number
  maxResponseTime: number
  requestsPerSecond: number
  peakConcurrency: number
  gpuUtilization: number
  cpuUtilization: number
  memoryUsage: number
  criteriaMet: boolean
  errors: Array<{
    timestamp: Date
    error: string
    requestId: string
  }>
}

export class StressTestSystem {
  /**
   * Run stress test
   */
  async runStressTest(config: StressTestConfig): Promise<StressTestResult> {
    const startTime = Date.now()
    const errors: Array<{ timestamp: Date; error: string; requestId: string }> = []
    let totalRequests = 0
    let successfulRequests = 0
    let failedRequests = 0
    const responseTimes: number[] = []
    let peakConcurrency = 0
    let currentConcurrency = 0

    try {
      logger.info('Starting stress test', {
        name: config.name,
        duration: config.duration,
        concurrency: config.concurrency,
        requestRate: config.requestRate,
      })

      eventBus.publish('neural.stresstest.started', {
        testName: config.name,
        config,
      })

      // Calculate request interval
      const requestInterval = 1000 / config.requestRate // milliseconds between requests

      // Run stress test
      const endTime = startTime + config.duration
      const requestPromises: Promise<void>[] = []

      while (Date.now() < endTime) {
        // Wait for request interval
        await new Promise((resolve) => setTimeout(resolve, requestInterval))

        // Check concurrency limit
        if (currentConcurrency < config.concurrency) {
          currentConcurrency++
          peakConcurrency = Math.max(peakConcurrency, currentConcurrency)

          const requestPromise = this.executeRequest(config.payload)
            .then((result) => {
              totalRequests++
              if (result.success) {
                successfulRequests++
                if (result.responseTime) {
                  responseTimes.push(result.responseTime)
                }
              } else {
                failedRequests++
                errors.push({
                  timestamp: new Date(),
                  error: result.error || 'Unknown error',
                  requestId: result.requestId || `request-${Date.now()}`,
                })
              }
            })
            .catch((error: any) => {
              totalRequests++
              failedRequests++
              errors.push({
                timestamp: new Date(),
                error: error.message || 'Request failed',
                requestId: `request-${Date.now()}`,
              })
            })
            .finally(() => {
              currentConcurrency--
            })

          requestPromises.push(requestPromise)
        }
      }

      // Wait for all requests to complete
      await Promise.all(requestPromises)

      const duration = Date.now() - startTime

      // Calculate statistics
      responseTimes.sort((a, b) => a - b)
      const p50 = this.percentile(responseTimes, 0.5)
      const p95 = this.percentile(responseTimes, 0.95)
      const p99 = this.percentile(responseTimes, 0.99)

      const averageResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
          : 0

      const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 0
      const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0
      const requestsPerSecond = duration > 0 ? totalRequests / (duration / 1000) : 0

      // Get system metrics
      const scalingMetrics = await autoScalingSystem.getCurrentMetrics()
      const gpuStats = gpuAccelerationSystem.getActiveDevice()
        ? gpuAccelerationSystem.getStats(gpuAccelerationSystem.getActiveDevice()!.id)
        : null

      // Check success criteria
      const criteriaMet =
        averageResponseTime <= config.successCriteria.maxResponseTime &&
        successRate >= config.successCriteria.minSuccessRate &&
        errorRate <= config.successCriteria.maxErrorRate

      const result: StressTestResult = {
        success: criteriaMet,
        testName: config.name,
        duration,
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate,
        errorRate,
        averageResponseTime,
        p50,
        p95,
        p99,
        minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
        requestsPerSecond,
        peakConcurrency,
        gpuUtilization: gpuStats?.utilization || 0,
        cpuUtilization: scalingMetrics.cpuUtilization,
        memoryUsage: scalingMetrics.memoryUsage,
        criteriaMet,
        errors,
      }

      logger.info('Stress test completed', {
        testName: config.name,
        success: criteriaMet,
        totalRequests,
        successRate,
        averageResponseTime,
        criteriaMet,
      })

      eventBus.publish('neural.stresstest.completed', {
        testName: config.name,
        result,
      })

      return result
    } catch (error: any) {
      logger.error('Stress test failed:', error)

      const duration = Date.now() - startTime

      return {
        success: false,
        testName: config.name,
        duration,
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: 0,
        errorRate: 1,
        averageResponseTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        requestsPerSecond: 0,
        peakConcurrency,
        gpuUtilization: 0,
        cpuUtilization: 0,
        memoryUsage: 0,
        criteriaMet: false,
        errors: [
          {
            timestamp: new Date(),
            error: error.message || 'Stress test failed',
            requestId: 'test-error',
          },
        ],
      }
    }
  }

  /**
   * Execute single request
   */
  private async executeRequest(payload: {
    prompt: string
    maxTokens?: number
    temperature?: number
  }): Promise<{
    success: boolean
    responseTime?: number
    error?: string
    requestId?: string
  }> {
    const startTime = Date.now()
    const requestId = `request-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

    try {
      const result = await neuralLoadBalancer.routeRequest(payload.prompt, {
        maxTokens: payload.maxTokens,
        temperature: payload.temperature,
      })

      const responseTime = Date.now() - startTime

      return {
        success: result.success,
        responseTime,
        requestId,
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime

      return {
        success: false,
        responseTime,
        error: error.message || 'Request failed',
        requestId,
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
   * Run load test (simpler version of stress test)
   */
  async runLoadTest(
    duration: number,
    concurrency: number,
    payload: {
      prompt: string
      maxTokens?: number
      temperature?: number
    }
  ): Promise<StressTestResult> {
    const config: StressTestConfig = {
      name: 'Load Test',
      description: 'Basic load test',
      duration,
      concurrency,
      requestRate: concurrency * 2, // 2 requests per second per concurrent user
      targetEndpoint: '/api/neural/loadbalancer/route',
      payload,
      successCriteria: {
        maxResponseTime: 1000,
        minSuccessRate: 0.95,
        maxErrorRate: 0.05,
      },
    }

    return await this.runStressTest(config)
  }

  /**
   * Run performance test
   */
  async runPerformanceTest(
    requests: number,
    concurrency: number,
    payload: {
      prompt: string
      maxTokens?: number
      temperature?: number
    }
  ): Promise<StressTestResult> {
    const config: StressTestConfig = {
      name: 'Performance Test',
      description: 'Performance benchmark test',
      duration: (requests / concurrency) * 1000, // Estimate duration
      concurrency,
      requestRate: concurrency * 10, // High request rate
      targetEndpoint: '/api/neural/loadbalancer/route',
      payload,
      successCriteria: {
        maxResponseTime: 200, // Target <200ms
        minSuccessRate: 0.99,
        maxErrorRate: 0.01,
      },
    }

    return await this.runStressTest(config)
  }
}

// Global Stress Test System
export const stressTestSystem = new StressTestSystem()

