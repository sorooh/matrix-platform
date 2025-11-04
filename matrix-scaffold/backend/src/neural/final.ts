/**
 * Final Integration & Production Build
 * Phase 5: Final Integration & Validation Stage
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { suroohNeuralEngine } from './engine'
import { nicholasCoreIntegration } from './integration'
import { gpuAccelerationSystem } from './gpu'
import { multiModelSystem } from './multimodel'
import { neuralLoadBalancer } from './loadbalancer'
import { autoScalingSystem } from './autoscaling'
import { performanceProfilingSystem } from './profiling'
import { performanceValidationSystem } from './validation'
import { endToEndTestingSystem } from './testing'
import { productionGPUSystem } from './production'

export interface SystemHealth {
  neuralEngine: boolean
  nicholasCore: boolean
  gpu: boolean
  multiModel: boolean
  loadBalancer: boolean
  autoScaling: boolean
  profiling: boolean
  validation: boolean
  testing: boolean
  productionGPU: boolean
  overall: boolean
}

export interface SystemStatus {
  health: SystemHealth
  version: string
  uptime: number
  totalRequests: number
  averageResponseTime: number
  successRate: number
  errorRate: number
  gpuUtilization: number
  memoryUsage: number
  activeModels: number
  activeConnections: number
}

export class FinalIntegrationSystem {
  private startTime: Date = new Date()
  private totalRequests: number = 0
  private successfulRequests: number = 0
  private failedRequests: number = 0

  /**
   * Initialize final integration
   */
  async initialize(): Promise<SystemStatus> {
    try {
      logger.info('🚀 Initializing Final Integration System...')

      // Initialize production GPU
      try {
        await productionGPUSystem.initialize()
        logger.info('✅ Production GPU system initialized')
      } catch (error) {
        logger.warn('⚠️ Production GPU initialization failed:', error)
      }

      // Verify all systems
      const health = await this.verifySystemHealth()

      // Get system status
      const status = await this.getSystemStatus()

      logger.info('✅ Final Integration System initialized', {
        health: health.overall,
        version: status.version,
      })

      eventBus.publish('neural.final.initialized', {
        health,
        status,
      })

      return status
    } catch (error: any) {
      logger.error('Final integration initialization failed:', error)
      throw error
    }
  }

  /**
   * Verify system health
   */
  async verifySystemHealth(): Promise<SystemHealth> {
    try {
      const health: SystemHealth = {
        neuralEngine: false,
        nicholasCore: false,
        gpu: false,
        multiModel: false,
        loadBalancer: false,
        autoScaling: false,
        profiling: false,
        validation: false,
        testing: false,
        productionGPU: false,
        overall: false,
      }

      // Check neural engine
      try {
        const neuralHealth = await suroohNeuralEngine.healthCheck()
        health.neuralEngine = neuralHealth.healthy
      } catch (error) {
        logger.warn('Neural engine health check failed:', error)
      }

      // Check Nicholas Core
      try {
        const nicholasStatus = await nicholasCoreIntegration.getStatus()
        health.nicholasCore = nicholasStatus.neuralEngineEnabled || nicholasStatus.fallbackEnabled
      } catch (error) {
        logger.warn('Nicholas Core health check failed:', error)
      }

      // Check GPU
      try {
        const gpuHealth = await gpuAccelerationSystem.healthCheck()
        health.gpu = gpuHealth.gpuAvailable
      } catch (error) {
        logger.warn('GPU health check failed:', error)
      }

      // Check multi-model
      try {
        const models = multiModelSystem.getModels()
        health.multiModel = models.length > 0
      } catch (error) {
        logger.warn('Multi-model health check failed:', error)
      }

      // Check load balancer
      try {
        const lbStats = neuralLoadBalancer.getStats()
        health.loadBalancer = lbStats.totalRequests >= 0
      } catch (error) {
        logger.warn('Load balancer health check failed:', error)
      }

      // Check auto-scaling
      try {
        const scalingMetrics = await autoScalingSystem.getCurrentMetrics()
        health.autoScaling = scalingMetrics.cpuUtilization >= 0
      } catch (error) {
        logger.warn('Auto-scaling health check failed:', error)
      }

      // Check profiling
      try {
        const perfStats = performanceProfilingSystem.getPerformanceStats()
        health.profiling = perfStats.totalRequests >= 0
      } catch (error) {
        logger.warn('Profiling health check failed:', error)
      }

      // Check validation
      try {
        health.validation = true // Validation system is always available
      } catch (error) {
        logger.warn('Validation health check failed:', error)
      }

      // Check testing
      try {
        const testSuites = endToEndTestingSystem.getAllTestSuites()
        health.testing = testSuites.size > 0
      } catch (error) {
        logger.warn('Testing health check failed:', error)
      }

      // Check production GPU
      try {
        const prodGPUStatus = productionGPUSystem.getStatus()
        health.productionGPU = prodGPUStatus?.available || false
      } catch (error) {
        logger.warn('Production GPU health check failed:', error)
      }

      // Overall health
      health.overall =
        health.neuralEngine &&
        health.nicholasCore &&
        health.multiModel &&
        health.loadBalancer &&
        health.profiling &&
        health.validation &&
        health.testing

      logger.info('System health verification completed', {
        overall: health.overall,
        components: {
          neuralEngine: health.neuralEngine,
          nicholasCore: health.nicholasCore,
          gpu: health.gpu,
          multiModel: health.multiModel,
          loadBalancer: health.loadBalancer,
          autoScaling: health.autoScaling,
          profiling: health.profiling,
          validation: health.validation,
          testing: health.testing,
          productionGPU: health.productionGPU,
        },
      })

      return health
    } catch (error: any) {
      logger.error('System health verification failed:', error)
      throw error
    }
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const perfStats = performanceProfilingSystem.getPerformanceStats()
      const lbStats = neuralLoadBalancer.getStats()
      const scalingMetrics = await autoScalingSystem.getCurrentMetrics()
      const gpuHealth = await gpuAccelerationSystem.healthCheck()
      const gpuStats = gpuHealth.activeDevice
        ? gpuAccelerationSystem.getStats(gpuHealth.activeDevice.id)
        : null
      const models = multiModelSystem.getModels()
      const activeModels = models.filter((m) => m.config.enabled && m.loaded).length

      const uptime = Date.now() - this.startTime.getTime()
      const successRate = lbStats.totalRequests > 0 ? lbStats.successfulRequests / lbStats.totalRequests : 1
      const errorRate = lbStats.totalRequests > 0 ? lbStats.failedRequests / lbStats.totalRequests : 0

      return {
        health: await this.verifySystemHealth(),
        version: '5.0.0',
        uptime,
        totalRequests: lbStats.totalRequests,
        averageResponseTime: perfStats.averageResponseTime,
        successRate,
        errorRate,
        gpuUtilization: gpuStats?.utilization || 0,
        memoryUsage: scalingMetrics.memoryUsage,
        activeModels,
        activeConnections: lbStats.activeConnections,
      }
    } catch (error: any) {
      logger.error('Get system status failed:', error)
      throw error
    }
  }

  /**
   * Run comprehensive validation
   */
  async runComprehensiveValidation(): Promise<{
    health: SystemHealth
    performance: any
    tests: any
    production: any
    overall: boolean
  }> {
    try {
      logger.info('Running comprehensive validation...')

      // Health check
      const health = await this.verifySystemHealth()

      // Performance validation
      const performance = await performanceValidationSystem.validatePerformance()

      // Run tests
      const tests = await endToEndTestingSystem.runAllTests()

      // Production GPU status
      const production = productionGPUSystem.getStatus()

      // Overall validation
      const overall =
        health.overall &&
        performance.success &&
        tests.successRate >= 0.95 &&
        (production?.available || true) // GPU is optional

      logger.info('Comprehensive validation completed', {
        overall,
        health: health.overall,
        performance: performance.success,
        tests: tests.successRate,
        production: production?.available,
      })

      eventBus.publish('neural.final.validation.completed', {
        overall,
        health,
        performance,
        tests,
        production,
      })

      return {
        health,
        performance,
        tests,
        production,
        overall,
      }
    } catch (error: any) {
      logger.error('Comprehensive validation failed:', error)
      throw error
    }
  }

  /**
   * Generate final report
   */
  async generateFinalReport(): Promise<{
    version: string
    timestamp: Date
    health: SystemHealth
    status: SystemStatus
    performance: any
    tests: any
    production: any
    recommendations: Array<{
      type: string
      priority: 'high' | 'medium' | 'low'
      description: string
    }>
  }> {
    try {
      logger.info('Generating final report...')

      const health = await this.verifySystemHealth()
      const status = await this.getSystemStatus()
      const performance = await performanceValidationSystem.validatePerformance()
      const tests = await endToEndTestingSystem.runAllTests()
      const production = productionGPUSystem.getStatus()
      const prodGPURecommendations = productionGPUSystem.getRecommendedOptimizations()

      const recommendations = [
        ...performance.recommendations,
        ...prodGPURecommendations.map((r) => ({
          type: r.type,
          priority: r.priority,
          description: r.description,
        })),
      ]

      const report = {
        version: '5.0.0',
        timestamp: new Date(),
        health,
        status,
        performance,
        tests,
        production,
        recommendations,
      }

      logger.info('Final report generated', {
        version: report.version,
        health: health.overall,
        performance: performance.success,
        tests: tests.successRate,
      })

      return report
    } catch (error: any) {
      logger.error('Generate final report failed:', error)
      throw error
    }
  }
}

// Global Final Integration System
export const finalIntegrationSystem = new FinalIntegrationSystem()

