/**
 * Base AI Agent
 * Global-Ready Architecture with base agent implementation
 */

import { logger } from '../../config/logger'
import { getAIProvider, FailoverAIProvider } from '../providers'
import { availableTools, getTool, getToolsForOpenAI } from '../tools'
import { AIProvider } from '../providers/openai'

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AgentResponse {
  content: string
  toolCalls?: Array<{
    name: string
    arguments: any
    result?: any
  }>
}

export class BaseAgent {
  protected provider: AIProvider
  protected systemPrompt: string
  protected tools: Map<string, any> = new Map()

  constructor(systemPrompt: string, provider?: AIProvider) {
    this.provider = provider || new FailoverAIProvider()
    this.systemPrompt = systemPrompt
    this.registerTools()
  }

  protected registerTools(): void {
    for (const tool of availableTools) {
      this.tools.set(tool.name, tool)
    }
  }

  async executeTool(name: string, params: any): Promise<any> {
    const tool = getTool(name)
    if (!tool) {
      throw new Error(`Tool ${name} not found`)
    }

    try {
      logger.info(`Executing tool: ${name}`, { params })
      const result = await tool.execute(params)
      logger.info(`Tool ${name} executed successfully`, { result })
      return result
    } catch (error: any) {
      logger.error(`Tool ${name} execution failed:`, error)
      throw error
    }
  }

  async chat(messages: AgentMessage[], options?: any): Promise<AgentResponse> {
    try {
      // Add system prompt
      const fullMessages: Array<{ role: string; content: string }> = [
        { role: 'system', content: this.systemPrompt },
        ...messages
      ]

      // Get tools for OpenAI
      const tools = getToolsForOpenAI()

      // Call AI provider
      const response = await this.provider.chat(fullMessages, {
        ...options,
        tools: tools.length > 0 ? tools : undefined
      })

      // Parse tool calls if any
      const toolCalls: Array<{ name: string; arguments: any; result?: any }> = []

      // Check for tool calls in response (OpenAI format)
      // This is simplified - in production, parse the actual tool call format
      const toolCallPattern = /<tool_call>(.*?)<\/tool_call>/gs
      const matches = response.match(toolCallPattern)

      if (matches) {
        for (const match of matches) {
          try {
            const toolCall = JSON.parse(match.replace(/<\/?tool_call>/g, ''))
            const result = await this.executeTool(toolCall.name, toolCall.arguments || {})
            toolCalls.push({
              name: toolCall.name,
              arguments: toolCall.arguments || {},
              result
            })
          } catch (error) {
            logger.warn('Failed to parse tool call:', error)
          }
        }
      }

      return {
        content: response,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
      }
    } catch (error: any) {
      logger.error('Agent chat failed:', error)
      throw error
    }
  }

  async *streamChat(messages: AgentMessage[], options?: any): AsyncGenerator<string> {
    try {
      const fullMessages: Array<{ role: string; content: string }> = [
        { role: 'system', content: this.systemPrompt },
        ...messages
      ]

      yield* this.provider.streamChat(fullMessages, options)
    } catch (error: any) {
      logger.error('Agent stream chat failed:', error)
      throw error
    }
  }
}

