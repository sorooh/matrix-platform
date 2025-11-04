/**
 * Performance Validation System
 * Phase 5: Final Integration & Validation Stage
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { performanceProfilingSystem } from './profiling'
import { suroohNeuralEngine } from './engine'
import { neuralLoadBalancer } from './loadbalancer'
import { multiModelSystem } from './multimodel'
import { autoScalingSystem } from './autoscaling'
import { gpuAccelerationSystem } from './gpu'

export interface ValidationCriteria {
  responseTime: {
    target: number // milliseconds
    p50: number
    p95: number
    p99: number
  }
  throughput: {
    minRequestsPerSecond: number
    targetRequestsPerSecond: number
  }
  successRate: {
    min: number // percentage (0-1)
    target: number // percentage (0-1)
  }
  errorRate: {
    max: number // percentage (0-1)
    target: number // percentage (0-1)
  }
  gpuUtilization: {
    min: number // percentage (0-100)
    max: number // percentage (0-100)
  }
  memoryUsage: {
    max: number // bytes
  }
}

export interface ValidationResult {
  success: boolean
  criteria: ValidationCriteria
  metrics: {
    responseTime: {
      average: number
      p50: number
      p95: number
      p99: number
      target: number
      met: boolean
    }
    throughput: {
      current: number
      target: number
      met: boolean
    }
    successRate: {
      current: number
      target: number
      met: boolean
    }
    errorRate: {
      current: number
      max: number
      met: boolean
    }
    gpuUtilization: {
      current: number
      min: number
      max: number
      met: boolean
    }
    memoryUsage: {
      current: number
      max: number
      met: boolean
    }
  }
  overallScore: number // 0-100
  passed: number
  failed: number
  recommendations: Array<{
    type: string
    priority: 'high' | 'medium' | 'low'
    description: string
  }>
}

export class PerformanceValidationSystem {
  private defaultCriteria: ValidationCriteria = {
    responseTime: {
      target: 200, // milliseconds
      p50: 150,
      p95: 250,
      p99: 300,
    },
    throughput: {
      minRequestsPerSecond: 10,
      targetRequestsPerSecond: 50,
    },
    successRate: {
      min: 0.95, // 95%
      target: 0.99, // 99%
    },
    errorRate: {
      max: 0.05, // 5%
      target: 0.01, // 1%
    },
    gpuUtilization: {
      min: 20, // 20%
      max: 90, // 90%
    },
    memoryUsage: {
      max: 8 * 1024 * 1024 * 1024, // 8GB
    },
  }

  /**
   * Validate performance against criteria
   */
  async validatePerformance(criteria?: Partial<ValidationCriteria>): Promise<ValidationResult> {
    try {
      const validationCriteria: ValidationCriteria = {
        ...this.defaultCriteria,
        ...criteria,
      }

      logger.info('Starting performance validation...', { criteria: validationCriteria })

      // Get performance statistics
      const perfStats = performanceProfilingSystem.getPerformanceStats()
      const lbStats = neuralLoadBalancer.getStats()
      const scalingMetrics = await autoScalingSystem.getCurrentMetrics()
      const gpuHealth = await gpuAccelerationSystem.healthCheck()
      const gpuStats = gpuHealth.activeDevice
        ? gpuAccelerationSystem.getStats(gpuHealth.activeDevice.id)
        : null

      // Validate response time
      const responseTimeMet =
        perfStats.averageResponseTime <= validationCriteria.responseTime.target &&
        perfStats.p50 <= validationCriteria.responseTime.p50 &&
        perfStats.p95 <= validationCriteria.responseTime.p95 &&
        perfStats.p99 <= validationCriteria.responseTime.p99

      // Validate throughput
      const throughputMet =
        lbStats.requestsPerSecond >= validationCriteria.throughput.minRequestsPerSecond &&
        lbStats.requestsPerSecond >= validationCriteria.throughput.targetRequestsPerSecond

      // Validate success rate
      const successRate =
        lbStats.totalRequests > 0 ? lbStats.successfulRequests / lbStats.totalRequests : 0
      const successRateMet =
        successRate >= validationCriteria.successRate.min &&
        successRate >= validationCriteria.successRate.target

      // Validate error rate
      const errorRate =
        lbStats.totalRequests > 0 ? lbStats.failedRequests / lbStats.totalRequests : 0
      const errorRateMet =
        errorRate <= validationCriteria.errorRate.max &&
        errorRate <= validationCriteria.errorRate.target

      // Validate GPU utilization
      const gpuUtilization = gpuStats?.utilization || 0
      const gpuUtilizationMet =
        gpuUtilization >= validationCriteria.gpuUtilization.min &&
        gpuUtilization <= validationCriteria.gpuUtilization.max

      // Validate memory usage
      const memoryUsage = scalingMetrics.memoryUsage
      const memoryUsageMet = memoryUsage <= validationCriteria.memoryUsage.max

      // Calculate overall score
      const checks = [
        responseTimeMet,
        throughputMet,
        successRateMet,
        errorRateMet,
        gpuUtilizationMet,
        memoryUsageMet,
      ]
      const passed = checks.filter((c) => c).length
      const failed = checks.filter((c) => !c).length
      const overallScore = (passed / checks.length) * 100

      // Generate recommendations
      const recommendations: Array<{
        type: string
        priority: 'high' | 'medium' | 'low'
        description: string
      }> = []

      if (!responseTimeMet) {
        recommendations.push({
          type: 'response_time',
          priority: 'high',
          description: `Response time ${perfStats.averageResponseTime.toFixed(0)}ms exceeds target ${validationCriteria.responseTime.target}ms`,
        })
      }

      if (!throughputMet) {
        recommendations.push({
          type: 'throughput',
          priority: 'high',
          description: `Throughput ${lbStats.requestsPerSecond.toFixed(1)} req/s below target ${validationCriteria.throughput.targetRequestsPerSecond} req/s`,
        })
      }

      if (!successRateMet) {
        recommendations.push({
          type: 'success_rate',
          priority: 'high',
          description: `Success rate ${(successRate * 100).toFixed(1)}% below target ${(validationCriteria.successRate.target * 100).toFixed(1)}%`,
        })
      }

      if (!errorRateMet) {
        recommendations.push({
          type: 'error_rate',
          priority: 'high',
          description: `Error rate ${(errorRate * 100).toFixed(1)}% above max ${(validationCriteria.errorRate.max * 100).toFixed(1)}%`,
        })
      }

      if (!gpuUtilizationMet && gpuHealth.gpuAvailable) {
        recommendations.push({
          type: 'gpu_utilization',
          priority: 'medium',
          description: `GPU utilization ${gpuUtilization.toFixed(1)}% outside optimal range ${validationCriteria.gpuUtilization.min}-${validationCriteria.gpuUtilization.max}%`,
        })
      }

      if (!memoryUsageMet) {
        recommendations.push({
          type: 'memory_usage',
          priority: 'medium',
          description: `Memory usage ${(memoryUsage / 1024 / 1024 / 1024).toFixed(1)}GB exceeds max ${(validationCriteria.memoryUsage.max / 1024 / 1024 / 1024).toFixed(1)}GB`,
        })
      }

      const result: ValidationResult = {
        success: overallScore >= 80, // 80% threshold
        criteria: validationCriteria,
        metrics: {
          responseTime: {
            average: perfStats.averageResponseTime,
            p50: perfStats.p50,
            p95: perfStats.p95,
            p99: perfStats.p99,
            target: validationCriteria.responseTime.target,
            met: responseTimeMet,
          },
          throughput: {
            current: lbStats.requestsPerSecond,
            target: validationCriteria.throughput.targetRequestsPerSecond,
            met: throughputMet,
          },
          successRate: {
            current: successRate,
            target: validationCriteria.successRate.target,
            met: successRateMet,
          },
          errorRate: {
            current: errorRate,
            max: validationCriteria.errorRate.max,
            met: errorRateMet,
          },
          gpuUtilization: {
            current: gpuUtilization,
            min: validationCriteria.gpuUtilization.min,
            max: validationCriteria.gpuUtilization.max,
            met: gpuUtilizationMet,
          },
          memoryUsage: {
            current: memoryUsage,
            max: validationCriteria.memoryUsage.max,
            met: memoryUsageMet,
          },
        },
        overallScore,
        passed,
        failed,
        recommendations,
      }

      logger.info('Performance validation completed', {
        success: result.success,
        overallScore,
        passed,
        failed,
        recommendations: recommendations.length,
      })

      eventBus.publish('neural.validation.completed', {
        result,
      })

      return result
    } catch (error: any) {
      logger.error('Performance validation failed:', error)
      throw error
    }
  }

  /**
   * Run performance benchmarks
   */
  async runBenchmarks(
    iterations: number = 100,
    concurrency: number = 10
  ): Promise<{
    responseTimes: number[]
    throughput: number
    successRate: number
    errorRate: number
    p50: number
    p95: number
    p99: number
  }> {
    try {
      logger.info('Running performance benchmarks...', { iterations, concurrency })

      const responseTimes: number[] = []
      let successful = 0
      let failed = 0

      const startTime = Date.now()

      // Run benchmarks
      const promises: Promise<void>[] = []
      for (let i = 0; i < iterations; i++) {
        const promise = neuralLoadBalancer
          .routeRequest(`Benchmark test ${i}`, {
            maxTokens: 100,
          })
          .then((result) => {
            if (result.success && result.response) {
              successful++
              responseTimes.push(result.response.responseTime)
            } else {
              failed++
            }
          })
          .catch(() => {
            failed++
          })

        promises.push(promise)

        // Limit concurrency
        if (promises.length >= concurrency) {
          await Promise.all(promises)
          promises.length = 0
        }
      }

      // Wait for remaining promises
      await Promise.all(promises)

      const duration = Date.now() - startTime

      // Calculate statistics
      responseTimes.sort((a, b) => a - b)
      const p50 = this.percentile(responseTimes, 0.5)
      const p95 = this.percentile(responseTimes, 0.95)
      const p99 = this.percentile(responseTimes, 0.99)
      const throughput = duration > 0 ? (iterations / duration) * 1000 : 0
      const successRate = iterations > 0 ? successful / iterations : 0
      const errorRate = iterations > 0 ? failed / iterations : 0

      logger.info('Performance benchmarks completed', {
        iterations,
        throughput: throughput.toFixed(2),
        successRate: (successRate * 100).toFixed(1) + '%',
        errorRate: (errorRate * 100).toFixed(1) + '%',
        p50: p50.toFixed(0) + 'ms',
        p95: p95.toFixed(0) + 'ms',
        p99: p99.toFixed(0) + 'ms',
      })

      return {
        responseTimes,
        throughput,
        successRate,
        errorRate,
        p50,
        p95,
        p99,
      }
    } catch (error: any) {
      logger.error('Performance benchmarks failed:', error)
      throw error
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
   * Get validation criteria
   */
  getDefaultCriteria(): ValidationCriteria {
    return { ...this.defaultCriteria }
  }

  /**
   * Update validation criteria
   */
  updateCriteria(criteria: Partial<ValidationCriteria>): void {
    this.defaultCriteria = {
      ...this.defaultCriteria,
      ...criteria,
    }

    logger.info('Validation criteria updated', { criteria: this.defaultCriteria })
  }
}

// Global Performance Validation System
export const performanceValidationSystem = new PerformanceValidationSystem()

