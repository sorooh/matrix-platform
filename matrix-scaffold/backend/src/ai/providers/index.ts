/**
 * AI Providers Index
 * Global-Ready Architecture with provider abstraction
 */

import { logger } from '../../config/logger'
import { config } from '../../config/app'
import { OpenAIProvider, AIProvider } from './openai'
import { AnthropicProvider } from './anthropic'

// Provider factory with fallback
export function getAIProvider(): AIProvider {
  try {
    const provider = config.ai.vectorProvider || 'openai'

    if (provider === 'anthropic') {
      try {
        return new AnthropicProvider()
      } catch (error) {
        logger.warn('Anthropic provider failed, falling back to OpenAI:', error)
      }
    }

    // Default to OpenAI
    try {
      return new OpenAIProvider()
    } catch (error) {
      logger.error('OpenAI provider failed:', error)
      throw new Error('No AI provider available')
    }
  } catch (error) {
    logger.error('Failed to get AI provider:', error)
    throw error
  }
}

// Provider with automatic failover
export class FailoverAIProvider implements AIProvider {
  private providers: AIProvider[] = []
  private currentProvider: AIProvider | null = null

  constructor() {
    // Initialize providers with fallback order
    try {
      this.providers.push(new OpenAIProvider())
    } catch (error) {
      logger.warn('OpenAI provider not available:', error)
    }

    try {
      this.providers.push(new AnthropicProvider())
    } catch (error) {
      logger.warn('Anthropic provider not available:', error)
    }

    if (this.providers.length === 0) {
      throw new Error('No AI providers available')
    }

    this.currentProvider = this.providers[0]
    logger.info('Failover AI provider initialized', {
      providers: this.providers.length,
      current: this.currentProvider.constructor.name
    })
  }

  private async withFailover<T>(fn: (provider: AIProvider) => Promise<T>): Promise<T> {
    let lastError: Error | null = null

    for (const provider of this.providers) {
      try {
        return await fn(provider)
      } catch (error) {
        lastError = error as Error
        logger.warn(`Provider ${provider.constructor.name} failed, trying next:`, error)
        continue
      }
    }

    throw lastError || new Error('All AI providers failed')
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    options?: any
  ): Promise<string> {
    return this.withFailover((provider) => provider.chat(messages, options))
  }

  async *streamChat(
    messages: Array<{ role: string; content: string }>,
    options?: any
  ): AsyncGenerator<string> {
    let lastError: Error | null = null

    for (const provider of this.providers) {
      try {
        yield* provider.streamChat(messages, options)
        return
      } catch (error) {
        lastError = error as Error
        logger.warn(`Provider ${provider.constructor.name} failed, trying next:`, error)
        continue
      }
    }

    throw lastError || new Error('All AI providers failed')
  }

  async embed(text: string): Promise<number[]> {
    return this.withFailover((provider) => provider.embed(text))
  }
}

