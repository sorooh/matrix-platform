/**
 * Morpheus Agent - Analysis Specialist
 * Global-Ready Architecture with AI agent for project analysis
 */

import { BaseAgent, AgentMessage } from './baseAgent'
import { logger } from '../../config/logger'
import { getAIProvider } from '../providers'

const MORPHEUS_SYSTEM_PROMPT = `You are Morpheus, an AI agent specialized in project analysis.

Your role:
- Analyze project requirements and specifications
- Identify technical challenges and opportunities
- Suggest architectural improvements
- Provide strategic recommendations

You have access to:
- Project information and history
- Memory system for context
- Knowledge graph for relationships
- System KPIs and metrics

Always provide:
- Clear, actionable insights
- Technical recommendations
- Risk assessment
- Next steps

Use tools when needed to gather information before making recommendations.`

export class MorpheusAgent extends BaseAgent {
  constructor() {
    super(MORPHEUS_SYSTEM_PROMPT, getAIProvider())
    logger.info('Morpheus agent initialized')
  }

  async analyzeProject(projectId: string, query: string): Promise<string> {
    try {
      const messages: AgentMessage[] = [
        {
          role: 'user',
          content: `Analyze project ${projectId}. Query: ${query}`
        }
      ]

      const response = await this.chat(messages)
      return response.content
    } catch (error: any) {
      logger.error('Morpheus analysis failed:', error)
      throw error
    }
  }
}

