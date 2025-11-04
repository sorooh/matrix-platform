/**
 * Nicholas Core - Neural Engine Integration
 * Phase 5: Ultra-Intelligence & Surooh Neural Integration
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { suroohNeuralEngine } from './engine'
import { agents } from '../ai/agents'
import { getAIProvider } from '../ai/providers'

export interface UnifiedAIResponse {
  content: string
  source: 'neural' | 'fallback'
  responseTime: number
  tokens: number
  metadata?: Record<string, unknown>
}

export class NicholasCoreIntegration {
  private neuralEngineEnabled: boolean = true
  private fallbackEnabled: boolean = true
  private responseTimeThreshold: number = 200 // milliseconds

  /**
   * Initialize integration
   */
  async initialize(): Promise<void> {
    try {
      // Check neural engine health
      const health = await suroohNeuralEngine.healthCheck()

      if (!health.healthy) {
        logger.warn('Neural engine not healthy, falling back to external providers', { health })
        this.neuralEngineEnabled = false
      }

      // Publish initialization event
      eventBus.publish('neural.integration.initialized', {
        neuralEngineEnabled: this.neuralEngineEnabled,
        fallbackEnabled: this.fallbackEnabled,
      })

      logger.info('Nicholas Core - Neural Engine integration initialized', {
        neuralEngineEnabled: this.neuralEngineEnabled,
        fallbackEnabled: this.fallbackEnabled,
      })
    } catch (error: any) {
      logger.error('Neural integration initialization failed:', error)
      this.neuralEngineEnabled = false
    }
  }

  /**
   * Unified AI generation (Neural Engine + Fallback)
   */
  async generate(
    prompt: string,
    options?: {
      maxTokens?: number
      temperature?: number
      systemPrompt?: string
      context?: string[]
      useNeural?: boolean
      useFallback?: boolean
    }
  ): Promise<UnifiedAIResponse> {
    const startTime = Date.now()

    try {
      // Try neural engine first if enabled
      if ((options?.useNeural !== false) && this.neuralEngineEnabled) {
        try {
          const neuralResponse = await suroohNeuralEngine.generate(prompt, {
            maxTokens: options?.maxTokens,
            temperature: options?.temperature,
            systemPrompt: options?.systemPrompt,
            context: options?.context,
          })

          // Check if response time is acceptable
          if (neuralResponse.responseTime <= this.responseTimeThreshold) {
            logger.info('Neural engine response used', {
              responseTime: neuralResponse.responseTime,
              tokens: neuralResponse.tokens,
            })

            return {
              content: neuralResponse.content,
              source: 'neural',
              responseTime: neuralResponse.responseTime,
              tokens: neuralResponse.tokens,
              metadata: neuralResponse.metadata,
            }
          } else {
            logger.warn('Neural engine response too slow, trying fallback', {
              responseTime: neuralResponse.responseTime,
              threshold: this.responseTimeThreshold,
            })
          }
        } catch (error: any) {
          logger.warn('Neural engine generation failed, falling back', { error: error.message })
        }
      }

      // Fallback to external provider
      if ((options?.useFallback !== false) && this.fallbackEnabled) {
        try {
          const provider = getAIProvider()
          const fallbackResponse = await provider.chat([
            {
              role: 'system',
              content: options?.systemPrompt || 'You are a helpful AI assistant.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ])

          const responseTime = Date.now() - startTime

          logger.info('Fallback provider response used', {
            responseTime,
            provider: provider.name,
          })

          return {
            content: fallbackResponse.content || '',
            source: 'fallback',
            responseTime,
            tokens: fallbackResponse.usage?.totalTokens || 0,
            metadata: {
              provider: provider.name,
            },
          }
        } catch (error: any) {
          logger.error('Fallback provider failed:', error)
          throw error
        }
      }

      throw new Error('No AI provider available')
    } catch (error: any) {
      logger.error('Unified AI generation failed:', error)
      throw error
    }
  }

  /**
   * Stream generation (Neural Engine + Fallback)
   */
  async *streamGenerate(
    prompt: string,
    options?: {
      maxTokens?: number
      temperature?: number
      systemPrompt?: string
      context?: string[]
      useNeural?: boolean
      useFallback?: boolean
    }
  ): AsyncGenerator<{ chunk: string; source: 'neural' | 'fallback' }, void, unknown> {
    try {
      // Try neural engine first if enabled
      if ((options?.useNeural !== false) && this.neuralEngineEnabled) {
        try {
          for await (const chunk of suroohNeuralEngine.streamGenerate(prompt, options)) {
            yield { chunk, source: 'neural' }
          }
          return
        } catch (error: any) {
          logger.warn('Neural engine streaming failed, falling back', { error: error.message })
        }
      }

      // Fallback to external provider streaming
      if ((options?.useFallback !== false) && this.fallbackEnabled) {
        try {
          const provider = getAIProvider()
          const stream = await provider.streamChat([
            {
              role: 'system',
              content: options?.systemPrompt || 'You are a helpful AI assistant.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ])

          for await (const chunk of stream) {
            yield { chunk: chunk.content || '', source: 'fallback' }
          }
        } catch (error: any) {
          logger.error('Fallback provider streaming failed:', error)
          throw error
        }
      }
    } catch (error: any) {
      logger.error('Unified streaming generation failed:', error)
      throw error
    }
  }

  /**
   * Agent integration with neural engine
   */
  async agentChat(
    agentName: string,
    message: string,
    options?: {
      useNeural?: boolean
      useFallback?: boolean
    }
  ): Promise<UnifiedAIResponse> {
    try {
      // Get agent system prompt
      const agent = (agents as any)[agentName]
      if (!agent) {
        throw new Error(`Agent ${agentName} not found`)
      }

      // Build agent-specific system prompt
      const systemPrompt = this.buildAgentSystemPrompt(agentName, agent)

      // Use unified generation
      const response = await this.generate(message, {
        systemPrompt,
        useNeural: options?.useNeural,
        useFallback: options?.useFallback,
      })

      // Learn from interaction
      eventBus.publish('neural.agent.interaction', {
        agentName,
        message,
        response: response.content,
        source: response.source,
        responseTime: response.responseTime,
      })

      return response
    } catch (error: any) {
      logger.error('Agent chat with neural engine failed:', error)
      throw error
    }
  }

  /**
   * Build agent-specific system prompt
   */
  private buildAgentSystemPrompt(agentName: string, agent: any): string {
    const agentDescriptions: Record<string, string> = {
      morpheus: 'You are Morpheus, an AI agent specialized in analysis and strategy. Provide detailed analysis and strategic recommendations.',
      architect: 'You are Architect, an AI agent specialized in architecture and design. Provide architectural designs and technical solutions.',
      sida: 'You are SIDA, an AI agent specialized in code generation. Generate clean, efficient, and well-documented code.',
      audit: 'You are Audit, an AI agent specialized in testing and quality assurance. Provide comprehensive testing strategies and quality checks.',
      vision: 'You are Vision, an AI agent specialized in visualization and UI/UX. Provide visual designs and user experience recommendations.',
    }

    return agentDescriptions[agentName] || 'You are a helpful AI assistant.'
  }

  /**
   * Get integration status
   */
  async getStatus(): Promise<{
    neuralEngineEnabled: boolean
    fallbackEnabled: boolean
    neuralEngineHealth: any
    stats: any
  }> {
    const neuralHealth = await suroohNeuralEngine.healthCheck()
    const neuralStats = suroohNeuralEngine.getStats()

    return {
      neuralEngineEnabled: this.neuralEngineEnabled,
      fallbackEnabled: this.fallbackEnabled,
      neuralEngineHealth: neuralHealth,
      stats: neuralStats,
    }
  }

  /**
   * Toggle neural engine
   */
  toggleNeuralEngine(enabled: boolean): void {
    this.neuralEngineEnabled = enabled
    logger.info('Neural engine toggled', { enabled })
  }

  /**
   * Toggle fallback
   */
  toggleFallback(enabled: boolean): void {
    this.fallbackEnabled = enabled
    logger.info('Fallback toggled', { enabled })
  }

  /**
   * Update response time threshold
   */
  updateResponseTimeThreshold(threshold: number): void {
    this.responseTimeThreshold = threshold
    logger.info('Response time threshold updated', { threshold })
  }
}

// Global Nicholas Core Integration
export const nicholasCoreIntegration = new NicholasCoreIntegration()

