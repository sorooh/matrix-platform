/**
 * OpenAI Provider
 * Global-Ready Architecture with OpenAI GPT-4o integration
 */

import { OpenAI } from 'openai'
import { logger } from '../../config/logger'
import { config } from '../../config/app'

export interface AIProvider {
  chat(messages: Array<{ role: string; content: string }>, options?: any): Promise<string>
  streamChat(messages: Array<{ role: string; content: string }>, options?: any): AsyncGenerator<string>
  embed(text: string): Promise<number[]>
}

export class OpenAIProvider implements AIProvider {
  private client: OpenAI
  private model: string

  constructor() {
    if (!config.ai.openai.apiKey) {
      throw new Error('OPENAI_API_KEY is required')
    }
    this.client = new OpenAI({
      apiKey: config.ai.openai.apiKey
    })
    this.model = config.ai.openai.model
    logger.info('OpenAI provider initialized', { model: this.model })
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    options?: {
      temperature?: number
      maxTokens?: number
      tools?: any[]
    }
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as any,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000,
        tools: options?.tools || undefined
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content in OpenAI response')
      }

      return content
    } catch (error: any) {
      logger.error('OpenAI chat failed:', error)
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
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as any,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000,
        stream: true
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield content
        }
      }
    } catch (error: any) {
      logger.error('OpenAI stream chat failed:', error)
      throw error
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      })

      const embedding = response.data[0]?.embedding
      if (!embedding) {
        throw new Error('No embedding in OpenAI response')
      }

      return embedding
    } catch (error: any) {
      logger.error('OpenAI embed failed:', error)
      throw error
    }
  }
}

