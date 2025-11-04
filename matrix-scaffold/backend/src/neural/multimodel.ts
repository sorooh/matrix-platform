/**
 * Multi-Model Support System
 * Phase 5: Multi-Model & Advanced Intelligence Stage
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { suroohNeuralEngine } from './engine'
import { gpuAccelerationSystem } from './gpu'
import { performanceProfilingSystem } from './profiling'

export interface ModelConfig {
  id: string
  name: string
  type: 'general' | 'specialized' | 'fine-tuned'
  version: string
  path: string
  enabled: boolean
  priority: number // Higher priority = used first
  maxConcurrentRequests: number
  maxTokens: number
  temperature: number
  gpuRequired: boolean
  metadata?: Record<string, unknown>
}

export interface ModelInstance {
  config: ModelConfig
  loaded: boolean
  activeRequests: number
  totalRequests: number
  averageResponseTime: number
  errorRate: number
  lastUsed: Date
  stats: {
    totalRequests: number
    totalTokens: number
    averageResponseTime: number
    errorRate: number
  }
}

export interface ModelResponse {
  content: string
  tokens: number
  responseTime: number
  model: string
  metadata?: Record<string, unknown>
}

export class MultiModelSystem {
  private models: Map<string, ModelInstance> = new Map()
  private defaultModels: ModelConfig[] = [
    {
      id: 'surooh-neural-v1',
      name: 'Surooh Neural v1',
      type: 'general',
      version: '1.0.0',
      path: 'models/surooh-neural-v1',
      enabled: true,
      priority: 10,
      maxConcurrentRequests: 100,
      maxTokens: 2048,
      temperature: 0.7,
      gpuRequired: false,
      metadata: {
        description: 'General-purpose neural model',
        capabilities: ['text-generation', 'chat', 'analysis'],
      },
    },
    {
      id: 'surooh-neural-v2',
      name: 'Surooh Neural v2',
      type: 'general',
      version: '2.0.0',
      path: 'models/surooh-neural-v2',
      enabled: false, // Will be enabled when available
      priority: 20,
      maxConcurrentRequests: 100,
      maxTokens: 4096,
      temperature: 0.7,
      gpuRequired: true,
      metadata: {
        description: 'Advanced general-purpose neural model',
        capabilities: ['text-generation', 'chat', 'analysis', 'code-generation'],
      },
    },
    {
      id: 'surooh-code-specialist',
      name: 'Surooh Code Specialist',
      type: 'specialized',
      version: '1.0.0',
      path: 'models/surooh-code-specialist',
      enabled: false,
      priority: 15,
      maxConcurrentRequests: 50,
      maxTokens: 4096,
      temperature: 0.3,
      gpuRequired: true,
      metadata: {
        description: 'Specialized model for code generation',
        capabilities: ['code-generation', 'code-analysis', 'code-refactoring'],
      },
    },
    {
      id: 'surooh-analysis-specialist',
      name: 'Surooh Analysis Specialist',
      type: 'specialized',
      version: '1.0.0',
      path: 'models/surooh-analysis-specialist',
      enabled: false,
      priority: 15,
      maxConcurrentRequests: 50,
      maxTokens: 2048,
      temperature: 0.5,
      gpuRequired: false,
      metadata: {
        description: 'Specialized model for analysis tasks',
        capabilities: ['analysis', 'reasoning', 'problem-solving'],
      },
    },
  ]

  constructor() {
    this.initializeModels()
  }

  /**
   * Initialize models
   */
  private async initializeModels(): Promise<void> {
    try {
      for (const config of this.defaultModels) {
        if (config.enabled) {
          await this.registerModel(config)
        }
      }

      logger.info('Multi-model system initialized', {
        totalModels: this.models.size,
        enabledModels: Array.from(this.models.values()).filter((m) => m.config.enabled).length,
      })

      eventBus.publish('neural.multimodel.initialized', {
        totalModels: this.models.size,
      })
    } catch (error: any) {
      logger.error('Multi-model initialization failed:', error)
    }
  }

  /**
   * Register model
   */
  async registerModel(config: ModelConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const instance: ModelInstance = {
        config,
        loaded: false,
        activeRequests: 0,
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        lastUsed: new Date(),
        stats: {
          totalRequests: 0,
          totalTokens: 0,
          averageResponseTime: 0,
          errorRate: 0,
        },
      }

      this.models.set(config.id, instance)

      // Load model if enabled
      if (config.enabled) {
        await this.loadModel(config.id)
      }

      logger.info('Model registered', {
        modelId: config.id,
        name: config.name,
        enabled: config.enabled,
      })

      eventBus.publish('neural.model.registered', {
        modelId: config.id,
        name: config.name,
      })

      return { success: true }
    } catch (error: any) {
      logger.error('Model registration failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Load model
   */
  async loadModel(modelId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const instance = this.models.get(modelId)
      if (!instance) {
        return { success: false, error: 'Model not found' }
      }

      // Check GPU requirement
      if (instance.config.gpuRequired && !gpuAccelerationSystem.isGPUAvailable()) {
        logger.warn('GPU required but not available', { modelId })
        return { success: false, error: 'GPU required but not available' }
      }

      // Load model on GPU or CPU
      if (instance.config.gpuRequired && gpuAccelerationSystem.isGPUAvailable()) {
        const activeDevice = gpuAccelerationSystem.getActiveDevice()
        if (activeDevice) {
          const result = await gpuAccelerationSystem.loadModelOnGPU(
            instance.config.path,
            instance.config.name
          )
          if (!result.success) {
            return result
          }
        }
      }

      instance.loaded = true

      logger.info('Model loaded', {
        modelId,
        name: instance.config.name,
        device: instance.config.gpuRequired ? 'gpu' : 'cpu',
      })

      eventBus.publish('neural.model.loaded', {
        modelId,
        name: instance.config.name,
      })

      return { success: true }
    } catch (error: any) {
      logger.error('Model loading failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Unload model
   */
  async unloadModel(modelId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const instance = this.models.get(modelId)
      if (!instance) {
        return { success: false, error: 'Model not found' }
      }

      if (instance.config.gpuRequired && gpuAccelerationSystem.isGPUAvailable()) {
        await gpuAccelerationSystem.unloadModelFromGPU(instance.config.name)
      }

      instance.loaded = false

      logger.info('Model unloaded', { modelId })

      eventBus.publish('neural.model.unloaded', {
        modelId,
      })

      return { success: true }
    } catch (error: any) {
      logger.error('Model unloading failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Select best model for request
   */
  selectModel(
    requirements?: {
      type?: 'general' | 'specialized' | 'fine-tuned'
      capability?: string
      maxTokens?: number
      gpuRequired?: boolean
    }
  ): ModelInstance | null {
    try {
      // Filter enabled and loaded models
      const available = Array.from(this.models.values())
        .filter((m) => m.config.enabled && m.loaded)
        .filter((m) => {
          // Check active requests limit
          if (m.activeRequests >= m.config.maxConcurrentRequests) {
            return false
          }

          // Check type requirement
          if (requirements?.type && m.config.type !== requirements.type) {
            return false
          }

          // Check capability requirement
          if (requirements?.capability) {
            const capabilities = (m.config.metadata?.capabilities as string[]) || []
            if (!capabilities.includes(requirements.capability)) {
              return false
            }
          }

          // Check maxTokens requirement
          if (requirements?.maxTokens && m.config.maxTokens < requirements.maxTokens) {
            return false
          }

          // Check GPU requirement
          if (requirements?.gpuRequired && !m.config.gpuRequired) {
            return false
          }

          return true
        })

      if (available.length === 0) {
        return null
      }

      // Sort by priority and load
      available.sort((a, b) => {
        // First by priority (higher is better)
        if (b.config.priority !== a.config.priority) {
          return b.config.priority - a.config.priority
        }

        // Then by active requests (lower is better)
        return a.activeRequests - b.activeRequests
      })

      return available[0]
    } catch (error: any) {
      logger.error('Model selection failed:', error)
      return null
    }
  }

  /**
   * Generate with selected model
   */
  async generate(
    prompt: string,
    requirements?: {
      type?: 'general' | 'specialized' | 'fine-tuned'
      capability?: string
      maxTokens?: number
      temperature?: number
      systemPrompt?: string
      context?: string[]
    }
  ): Promise<{ success: boolean; response?: ModelResponse; error?: string }> {
    const startTime = Date.now()

    try {
      // Select best model
      const model = this.selectModel({
        type: requirements?.type,
        capability: requirements?.capability,
        maxTokens: requirements?.maxTokens,
      })

      if (!model) {
        return { success: false, error: 'No available model found' }
      }

      // Increment active requests
      model.activeRequests++
      model.totalRequests++
      model.lastUsed = new Date()

      try {
        // Generate response using selected model
        const response = await suroohNeuralEngine.generate(prompt, {
          maxTokens: requirements?.maxTokens || model.config.maxTokens,
          temperature: requirements?.temperature || model.config.temperature,
          systemPrompt: requirements?.systemPrompt,
          context: requirements?.context,
        })

        const responseTime = Date.now() - startTime

        // Update model stats
        this.updateModelStats(model.id, response.tokens, responseTime, false)

        // Record performance metrics
        performanceProfilingSystem.recordMetrics({
          requestId: `request-${Date.now()}`,
          endpoint: '/api/neural/generate',
          method: 'POST',
          responseTime,
          tokens: response.tokens,
          model: model.config.id,
          device: model.config.gpuRequired ? 'gpu' : 'cpu',
          memoryUsage: 0,
          timestamp: new Date(),
        })

        logger.info('Model generation completed', {
          modelId: model.config.id,
          responseTime,
          tokens: response.tokens,
        })

        return {
          success: true,
          response: {
            content: response.content,
            tokens: response.tokens,
            responseTime,
            model: model.config.id,
            metadata: {
              modelName: model.config.name,
              modelType: model.config.type,
            },
          },
        }
      } catch (error: any) {
        // Update error rate
        this.updateModelStats(model.id, 0, 0, true)
        throw error
      } finally {
        // Decrement active requests
        model.activeRequests--
      }
    } catch (error: any) {
      logger.error('Multi-model generation failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update model statistics
   */
  private updateModelStats(modelId: string, tokens: number, responseTime: number, error: boolean): void {
    try {
      const model = this.models.get(modelId)
      if (!model) {
        return
      }

      // Update stats
      model.stats.totalRequests++
      model.stats.totalTokens += tokens

      // Update average response time
      const totalResponseTime = model.stats.averageResponseTime * (model.stats.totalRequests - 1) + responseTime
      model.stats.averageResponseTime = totalResponseTime / model.stats.totalRequests

      // Update error rate
      if (error) {
        const totalErrors = model.stats.errorRate * (model.stats.totalRequests - 1) + 1
        model.stats.errorRate = totalErrors / model.stats.totalRequests
      }

      // Update instance stats
      model.averageResponseTime = model.stats.averageResponseTime
      model.errorRate = model.stats.errorRate
    } catch (error: any) {
      logger.error('Update model stats failed:', error)
    }
  }

  /**
   * Get model list
   */
  getModels(): ModelInstance[] {
    return Array.from(this.models.values())
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): ModelInstance | null {
    return this.models.get(modelId) || null
  }

  /**
   * Enable/disable model
   */
  async toggleModel(modelId: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const model = this.models.get(modelId)
      if (!model) {
        return { success: false, error: 'Model not found' }
      }

      model.config.enabled = enabled

      if (enabled) {
        await this.loadModel(modelId)
      } else {
        await this.unloadModel(modelId)
      }

      logger.info('Model toggled', { modelId, enabled })

      return { success: true }
    } catch (error: any) {
      logger.error('Toggle model failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get model statistics
   */
  getModelStats(modelId?: string): {
    total: number
    enabled: number
    loaded: number
    models: Array<{
      id: string
      name: string
      type: string
      enabled: boolean
      loaded: boolean
      activeRequests: number
      totalRequests: number
      averageResponseTime: number
      errorRate: number
    }>
  } {
    try {
      const models = modelId ? [this.models.get(modelId)].filter(Boolean) : Array.from(this.models.values())

      const stats = models.map((m) => ({
        id: m.config.id,
        name: m.config.name,
        type: m.config.type,
        enabled: m.config.enabled,
        loaded: m.loaded,
        activeRequests: m.activeRequests,
        totalRequests: m.stats.totalRequests,
        averageResponseTime: m.stats.averageResponseTime,
        errorRate: m.stats.errorRate,
      }))

      return {
        total: this.models.size,
        enabled: Array.from(this.models.values()).filter((m) => m.config.enabled).length,
        loaded: Array.from(this.models.values()).filter((m) => m.loaded).length,
        models: stats,
      }
    } catch (error: any) {
      logger.error('Get model stats failed:', error)
      return {
        total: 0,
        enabled: 0,
        loaded: 0,
        models: [],
      }
    }
  }
}

// Global Multi-Model System
export const multiModelSystem = new MultiModelSystem()

