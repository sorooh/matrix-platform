/**
 * Continuous Learning & Fine-Tuning System
 * Phase 5: Multi-Model & Advanced Intelligence Stage
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { prisma } from '../config/database'
import { neuralMemorySystem } from './memory'
import { performanceProfilingSystem } from './profiling'

export interface FineTuningConfig {
  modelId: string
  dataset: Array<{
    input: string
    output: string
    context?: string[]
    metadata?: Record<string, unknown>
  }>
  epochs: number
  learningRate: number
  batchSize: number
  validationSplit: number
  enableEarlyStopping: boolean
  patience: number
}

export interface FineTuningResult {
  success: boolean
  modelId: string
  newModelPath?: string
  metrics?: {
    loss: number
    accuracy: number
    validationLoss: number
    validationAccuracy: number
    epochs: number
    trainingTime: number
  }
  error?: string
}

export interface LearningPattern {
  pattern: string
  context: string[]
  behavior: string
  confidence: number
  usageCount: number
  successRate: number
  lastUpdated: Date
}

export class ContinuousLearningSystem {
  private learningPatterns: Map<string, LearningPattern> = new Map()
  private fineTuningQueue: FineTuningConfig[] = []
  private isFineTuning: boolean = false

  /**
   * Learn from interaction
   */
  async learnFromInteraction(
    input: string,
    output: string,
    context?: string[],
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; patternId?: string; error?: string }> {
    try {
      // Extract pattern from interaction
      const pattern = this.extractPattern(input, context)

      // Get or create learning pattern
      let learningPattern = this.learningPatterns.get(pattern)

      if (!learningPattern) {
        learningPattern = {
          pattern,
          context: context || [],
          behavior: output,
          confidence: 0.5,
          usageCount: 1,
          successRate: 1.0,
          lastUpdated: new Date(),
        }
        this.learningPatterns.set(pattern, learningPattern)
      } else {
        // Update existing pattern
        learningPattern.usageCount++
        learningPattern.lastUpdated = new Date()

        // Update behavior if different (with confidence adjustment)
        if (learningPattern.behavior !== output) {
          const similarity = this.calculateSimilarity(learningPattern.behavior, output)
          if (similarity > 0.7) {
            // Similar behavior - increase confidence
            learningPattern.confidence = Math.min(1.0, learningPattern.confidence + 0.1)
          } else {
            // Different behavior - decrease confidence
            learningPattern.confidence = Math.max(0.1, learningPattern.confidence - 0.1)
            learningPattern.behavior = output // Update behavior
          }
        } else {
          // Same behavior - increase confidence
          learningPattern.confidence = Math.min(1.0, learningPattern.confidence + 0.05)
          learningPattern.successRate = Math.min(1.0, learningPattern.successRate + 0.01)
        }
      }

      // Store in neural memory
      await neuralMemorySystem.createMemory(
        `Interaction: ${input} → ${output}`,
        context || [],
        metadata
      )

      // Publish event
      eventBus.publish('neural.learning.interaction', {
        patternId: pattern,
        pattern: learningPattern.pattern,
        behavior: learningPattern.behavior,
        confidence: learningPattern.confidence,
      })

      logger.info('Learned from interaction', {
        patternId: pattern,
        confidence: learningPattern.confidence,
        usageCount: learningPattern.usageCount,
      })

      return {
        success: true,
        patternId: pattern,
      }
    } catch (error: any) {
      logger.error('Learn from interaction failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Extract pattern from input
   */
  private extractPattern(input: string, context?: string[]): string {
    // Simplified pattern extraction - in production, use more sophisticated NLP
    const normalized = input.toLowerCase().trim()
    const words = normalized.split(/\s+/).slice(0, 5) // First 5 words
    return words.join(' ')
  }

  /**
   * Calculate similarity between strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // Simplified similarity - in production, use Levenshtein distance or embeddings
    const words1 = str1.toLowerCase().split(/\s+/)
    const words2 = str2.toLowerCase().split(/\s+/)
    const intersection = words1.filter((w) => words2.includes(w)).length
    const union = new Set([...words1, ...words2]).size
    return union > 0 ? intersection / union : 0
  }

  /**
   * Get learned behavior for pattern
   */
  async getLearnedBehavior(pattern: string, context?: string[]): Promise<string | null> {
    try {
      // Find matching pattern
      const learningPattern = this.learningPatterns.get(pattern)

      if (!learningPattern) {
        return null
      }

      // Check context match
      if (context && context.length > 0) {
        const contextMatch = learningPattern.context.some((c) => context.includes(c))
        if (!contextMatch && learningPattern.context.length > 0) {
          return null
        }
      }

      // Check confidence threshold
      if (learningPattern.confidence < 0.5) {
        return null
      }

      return learningPattern.behavior
    } catch (error: any) {
      logger.error('Get learned behavior failed:', error)
      return null
    }
  }

  /**
   * Fine-tune model
   */
  async fineTuneModel(config: FineTuningConfig): Promise<FineTuningResult> {
    try {
      if (this.isFineTuning) {
        return {
          success: false,
          modelId: config.modelId,
          error: 'Fine-tuning already in progress',
        }
      }

      this.isFineTuning = true

      logger.info('Starting model fine-tuning', {
        modelId: config.modelId,
        datasetSize: config.dataset.length,
        epochs: config.epochs,
      })

      // In production, perform actual fine-tuning
      // For now, simulate fine-tuning process

      const startTime = Date.now()

      // Simulate training epochs
      for (let epoch = 1; epoch <= config.epochs; epoch++) {
        logger.info(`Training epoch ${epoch}/${config.epochs}`, {
          modelId: config.modelId,
        })

        // Simulate training time
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Simulate metrics improvement
        const progress = epoch / config.epochs
        const loss = 1.0 - progress * 0.7
        const accuracy = 0.5 + progress * 0.4

        eventBus.publish('neural.finetuning.progress', {
          modelId: config.modelId,
          epoch,
          totalEpochs: config.epochs,
          loss,
          accuracy,
        })
      }

      const trainingTime = Date.now() - startTime

      // Generate new model path
      const newModelPath = `models/${config.modelId}-fine-tuned-${Date.now()}`

      const result: FineTuningResult = {
        success: true,
        modelId: config.modelId,
        newModelPath,
        metrics: {
          loss: 0.3,
          accuracy: 0.9,
          validationLoss: 0.35,
          validationAccuracy: 0.85,
          epochs: config.epochs,
          trainingTime,
        },
      }

      logger.info('Model fine-tuning completed', {
        modelId: config.modelId,
        newModelPath,
        trainingTime,
      })

      eventBus.publish('neural.finetuning.completed', {
        modelId: config.modelId,
        newModelPath,
        metrics: result.metrics,
      })

      this.isFineTuning = false

      return result
    } catch (error: any) {
      logger.error('Model fine-tuning failed:', error)
      this.isFineTuning = false
      return {
        success: false,
        modelId: config.modelId,
        error: error.message,
      }
    }
  }

  /**
   * Queue fine-tuning job
   */
  async queueFineTuning(config: FineTuningConfig): Promise<{ success: boolean; queuePosition?: number; error?: string }> {
    try {
      this.fineTuningQueue.push(config)

      logger.info('Fine-tuning job queued', {
        modelId: config.modelId,
        queuePosition: this.fineTuningQueue.length,
      })

      // Process queue if not already processing
      if (!this.isFineTuning && this.fineTuningQueue.length > 0) {
        const nextConfig = this.fineTuningQueue.shift()!
        await this.fineTuneModel(nextConfig)
      }

      return {
        success: true,
        queuePosition: this.fineTuningQueue.length,
      }
    } catch (error: any) {
      logger.error('Queue fine-tuning failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get learning patterns
   */
  getLearningPatterns(): LearningPattern[] {
    return Array.from(this.learningPatterns.values())
  }

  /**
   * Get learning pattern by ID
   */
  getLearningPattern(patternId: string): LearningPattern | null {
    return this.learningPatterns.get(patternId) || null
  }

  /**
   * Get fine-tuning queue
   */
  getFineTuningQueue(): FineTuningConfig[] {
    return [...this.fineTuningQueue]
  }

  /**
   * Get fine-tuning status
   */
  getFineTuningStatus(): {
    isFineTuning: boolean
    queueLength: number
    currentModelId?: string
  } {
    return {
      isFineTuning: this.isFineTuning,
      queueLength: this.fineTuningQueue.length,
    }
  }

  /**
   * Get learning statistics
   */
  getLearningStats(): {
    totalPatterns: number
    highConfidencePatterns: number
    totalInteractions: number
    averageConfidence: number
    fineTuningQueueLength: number
  } {
    const patterns = Array.from(this.learningPatterns.values())
    const totalInteractions = patterns.reduce((sum, p) => sum + p.usageCount, 0)
    const averageConfidence =
      patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
        : 0

    return {
      totalPatterns: patterns.length,
      highConfidencePatterns: patterns.filter((p) => p.confidence >= 0.7).length,
      totalInteractions,
      averageConfidence,
      fineTuningQueueLength: this.fineTuningQueue.length,
    }
  }
}

// Global Continuous Learning System
export const continuousLearningSystem = new ContinuousLearningSystem()

