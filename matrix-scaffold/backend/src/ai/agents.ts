/**
 * AI Agents System
 * Phase 2: Real AI Agents with GPT-4o integration
 * Global-Ready Architecture
 */

import OpenAI from 'openai'
import { logger } from '../config/logger'
import { config } from '../config/app'
import { captureException } from '../config/sentry'

// AI Provider abstraction
export interface AIProvider {
  chat(messages: Array<{ role: string; content: string }>, options?: any): Promise<string>
  embed(text: string): Promise<number[]>
}

// OpenAI Provider
class OpenAIProvider implements AIProvider {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: config.ai.openai.apiKey || process.env.OPENAI_API_KEY
    })
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
    }
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: options?.model || config.ai.openai.model || 'gpt-4o',
        messages: messages as any,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000
      })
      return response.choices[0]?.message?.content || ''
    } catch (error: any) {
      logger.error('OpenAI chat error:', error)
      captureException(error as Error, { context: 'OpenAI chat' })
      throw error
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      })
      return response.data[0]?.embedding || []
    } catch (error: any) {
      logger.error('OpenAI embed error:', error)
      captureException(error as Error, { context: 'OpenAI embed' })
      throw error
    }
  }
}

// Anthropic Provider (placeholder for future)
class AnthropicProvider implements AIProvider {
  async chat(messages: Array<{ role: string; content: string }>, options?: any): Promise<string> {
    throw new Error('Anthropic provider not yet implemented')
  }

  async embed(text: string): Promise<number[]> {
    throw new Error('Anthropic provider not yet implemented')
  }
}

// Provider Factory
export function getAIProvider(): AIProvider {
  const provider = config.ai.vectorProvider || 'openai'
  
  switch (provider) {
    case 'openai':
      if (!config.ai.openai.apiKey) {
        throw new Error('OpenAI API key not configured')
      }
      return new OpenAIProvider()
    case 'anthropic':
      if (!config.ai.anthropic.apiKey) {
        throw new Error('Anthropic API key not configured')
      }
      return new AnthropicProvider()
    default:
      throw new Error(`Unknown AI provider: ${provider}`)
  }
}

// AI Agent Types
export type AgentType = 'morpheus' | 'architect' | 'sida' | 'vision' | 'audit'

export interface AgentContext {
  projectId: string
  projectName?: string
  projectDescription?: string
  relatedMemory?: Array<{ text: string; score: number }>
  currentTasks?: Array<{ id: string; type: string; status: string }>
  recentJobs?: Array<{ id: string; status: string; error?: string }>
}

export interface AgentResponse {
  action: string
  reasoning: string
  output?: string
  code?: string
  suggestions?: Array<{ type: string; reason: string }>
}

// Base Agent Class
export abstract class BaseAgent {
  protected provider: AIProvider
  protected type: AgentType

  constructor(type: AgentType) {
    this.provider = getAIProvider()
    this.type = type
  }

  abstract process(context: AgentContext): Promise<AgentResponse>

  protected async callAI(
    systemPrompt: string,
    userPrompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
      return await this.provider.chat(messages, options)
    } catch (error: any) {
      logger.error(`AI call error for ${this.type}:`, error)
      throw error
    }
  }
}

// Morpheus Agent (Analysis)
export class MorpheusAgent extends BaseAgent {
  constructor() {
    super('morpheus')
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const systemPrompt = `You are Morpheus, an AI agent specialized in project analysis and requirements gathering.
Your role is to analyze projects, identify requirements, and suggest improvements.
Always respond in JSON format with: {"action": "...", "reasoning": "...", "suggestions": [...]}`

    const userPrompt = `Analyze the following project:
- Project ID: ${context.projectId}
- Project Name: ${context.projectName || 'Unknown'}
- Description: ${context.projectDescription || 'None'}
- Related Memory: ${JSON.stringify(context.relatedMemory || [])}
- Current Tasks: ${JSON.stringify(context.currentTasks || [])}
- Recent Jobs: ${JSON.stringify(context.recentJobs || [])}

Provide analysis and suggestions for next steps.`

    try {
      const response = await this.callAI(systemPrompt, userPrompt, { temperature: 0.7 })
      const parsed = JSON.parse(response)
      return {
        action: parsed.action || 'analyze',
        reasoning: parsed.reasoning || response,
        suggestions: parsed.suggestions || []
      }
    } catch (error: any) {
      logger.error('Morpheus agent error:', error)
      return {
        action: 'analyze',
        reasoning: 'Analysis completed with limitations',
        suggestions: []
      }
    }
  }
}

// Architect Agent (Architecture Design)
export class ArchitectAgent extends BaseAgent {
  constructor() {
    super('architect')
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const systemPrompt = `You are Architect, an AI agent specialized in software architecture design.
Your role is to design architectures, create system designs, and suggest technical improvements.
Always respond in JSON format with: {"action": "...", "reasoning": "...", "output": "..."}`

    const userPrompt = `Design architecture for project:
- Project ID: ${context.projectId}
- Project Name: ${context.projectName || 'Unknown'}
- Description: ${context.projectDescription || 'None'}
- Related Memory: ${JSON.stringify(context.relatedMemory || [])}

Provide architecture design and recommendations.`

    try {
      const response = await this.callAI(systemPrompt, userPrompt, { temperature: 0.6 })
      const parsed = JSON.parse(response)
      return {
        action: parsed.action || 'design',
        reasoning: parsed.reasoning || response,
        output: parsed.output || response
      }
    } catch (error: any) {
      logger.error('Architect agent error:', error)
      return {
        action: 'design',
        reasoning: 'Architecture design completed with limitations',
        output: ''
      }
    }
  }
}

// SIDA Agent (Code Generation)
export class SIDAAgent extends BaseAgent {
  constructor() {
    super('sida')
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const systemPrompt = `You are SIDA, an AI agent specialized in code generation and implementation.
Your role is to write code, implement features, and fix bugs.
Always respond in JSON format with: {"action": "...", "reasoning": "...", "code": "..."}`

    const userPrompt = `Generate code for project:
- Project ID: ${context.projectId}
- Project Name: ${context.projectName || 'Unknown'}
- Description: ${context.projectDescription || 'None'}
- Related Memory: ${JSON.stringify(context.relatedMemory || [])}
- Recent Jobs: ${JSON.stringify(context.recentJobs || [])}

Provide code implementation and suggestions.`

    try {
      const response = await this.callAI(systemPrompt, userPrompt, { temperature: 0.5 })
      const parsed = JSON.parse(response)
      return {
        action: parsed.action || 'code',
        reasoning: parsed.reasoning || response,
        code: parsed.code || ''
      }
    } catch (error: any) {
      logger.error('SIDA agent error:', error)
      return {
        action: 'code',
        reasoning: 'Code generation completed with limitations',
        code: ''
      }
    }
  }
}

// Vision Agent (Visual/Analysis)
export class VisionAgent extends BaseAgent {
  constructor() {
    super('vision')
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const systemPrompt = `You are Vision, an AI agent specialized in visual analysis and UI/UX recommendations.
Your role is to analyze visual elements, suggest UI improvements, and create visual designs.
Always respond in JSON format with: {"action": "...", "reasoning": "...", "output": "..."}`

    const userPrompt = `Analyze visual aspects for project:
- Project ID: ${context.projectId}
- Project Name: ${context.projectName || 'Unknown'}
- Related Memory: ${JSON.stringify(context.relatedMemory || [])}

Provide visual analysis and recommendations.`

    try {
      const response = await this.callAI(systemPrompt, userPrompt, { temperature: 0.7 })
      const parsed = JSON.parse(response)
      return {
        action: parsed.action || 'visual',
        reasoning: parsed.reasoning || response,
        output: parsed.output || response
      }
    } catch (error: any) {
      logger.error('Vision agent error:', error)
      return {
        action: 'visual',
        reasoning: 'Visual analysis completed with limitations',
        output: ''
      }
    }
  }
}

// Audit Agent (Testing/Quality)
export class AuditAgent extends BaseAgent {
  constructor() {
    super('audit')
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const systemPrompt = `You are Audit, an AI agent specialized in testing, quality assurance, and code review.
Your role is to review code, run tests, identify bugs, and ensure quality.
Always respond in JSON format with: {"action": "...", "reasoning": "...", "output": "..."}`

    const userPrompt = `Audit project:
- Project ID: ${context.projectId}
- Project Name: ${context.projectName || 'Unknown'}
- Recent Jobs: ${JSON.stringify(context.recentJobs || [])}
- Current Tasks: ${JSON.stringify(context.currentTasks || [])}

Provide audit results and recommendations.`

    try {
      const response = await this.callAI(systemPrompt, userPrompt, { temperature: 0.5 })
      const parsed = JSON.parse(response)
      return {
        action: parsed.action || 'audit',
        reasoning: parsed.reasoning || response,
        output: parsed.output || response
      }
    } catch (error: any) {
      logger.error('Audit agent error:', error)
      return {
        action: 'audit',
        reasoning: 'Audit completed with limitations',
        output: ''
      }
    }
  }
}

// Agent Factory
export function createAgent(type: AgentType): BaseAgent {
  switch (type) {
    case 'morpheus':
      return new MorpheusAgent()
    case 'architect':
      return new ArchitectAgent()
    case 'sida':
      return new SIDAAgent()
    case 'vision':
      return new VisionAgent()
    case 'audit':
      return new AuditAgent()
    default:
      throw new Error(`Unknown agent type: ${type}`)
  }
}

// Agent Registry
export const agents = {
  morpheus: () => new MorpheusAgent(),
  architect: () => new ArchitectAgent(),
  sida: () => new SIDAAgent(),
  vision: () => new VisionAgent(),
  audit: () => new AuditAgent()
}

