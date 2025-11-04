/**
 * Anthropic Provider
 * Global-Ready Architecture with Claude integration
 */

import Anthropic from '@anthropic-ai/sdk'
import { logger } from '../../config/logger'
import { config } from '../../config/app'
import { AIProvider } from './openai'

export class AnthropicProvider implements AIProvider {
  private client: Anthropic
  private model: string

  constructor() {
    if (!config.ai.anthropic.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required')
    }
    this.client = new Anthropic({
      apiKey: config.ai.anthropic.apiKey
    })
    this.model = config.ai.anthropic.model
    logger.info('Anthropic provider initialized', { model: this.model })
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    options?: {
      temperature?: number
      maxTokens?: number
    }
  ): Promise<string> {
    try {
      // Convert messages format for Anthropic
      const systemMessage = messages.find((m) => m.role === 'system')?.content || ''
      const userMessages = messages.filter((m) => m.role !== 'system')

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens || 2000,
        temperature: options?.temperature || 0.7,
        system: systemMessage || undefined,
        messages: userMessages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        })) as any
      })

      const content = response.content[0]?.type === 'text' ? response.content[0].text : ''
      if (!content) {
        throw new Error('No content in Anthropic response')
      }

      return content
    } catch (error: any) {
      logger.error('Anthropic chat failed:', error)
      throw error
    }
  }

  async *streamChat(
    messages: Array<{ role: string; content: string }>,
    options?: {
      temperature?: number
      maxTokens?: number
    }
  ): AsyncGenerator<string> {
    try {
      const systemMessage = messages.find((m) => m.role === 'system')?.content || ''
      const userMessages = messages.filter((m) => m.role !== 'system')

      const stream = await this.client.messages.stream({
        model: this.model,
        max_tokens: options?.maxTokens || 2000,
        temperature: options?.temperature || 0.7,
        system: systemMessage || undefined,
        messages: userMessages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        })) as any
      })

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield chunk.delta.text
        }
      }
    } catch (error: any) {
      logger.error('Anthropic stream chat failed:', error)
      throw error
    }
  }

  async embed(text: string): Promise<number[]> {
    // Anthropic doesn't have native embeddings, use OpenAI or fallback
    logger.warn('Anthropic does not support embeddings, using fallback')
    throw new Error('Anthropic does not support embeddings')
  }
}

