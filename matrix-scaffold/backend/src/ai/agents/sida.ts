/**
 * SIDA Agent - Code Generation Specialist
 * Global-Ready Architecture with AI agent for code generation
 */

import { BaseAgent, AgentMessage } from './baseAgent'
import { logger } from '../../config/logger'
import { getAIProvider } from '../providers'

const SIDA_SYSTEM_PROMPT = `You are SIDA, an AI agent specialized in code generation and implementation.

Your role:
- Generate production-ready code
- Implement features and components
- Write tests and documentation
- Refactor and optimize code

You have access to:
- Project codebase context
- Architecture specifications
- Coding standards and patterns
- Existing code patterns

Always provide:
- Clean, well-documented code
- Tests for new code
- Error handling
- Performance considerations`

export class SIDAAgent extends BaseAgent {
  constructor() {
    super(SIDA_SYSTEM_PROMPT, getAIProvider())
    logger.info('SIDA agent initialized')
  }

  async generateCode(projectId: string, specification: string): Promise<string> {
    try {
      const messages: AgentMessage[] = [
        {
          role: 'user',
          content: `Generate code for project ${projectId}. Specification: ${specification}`
        }
      ]

      const response = await this.chat(messages)
      return response.content
    } catch (error: any) {
      logger.error('SIDA code generation failed:', error)
      throw error
    }
  }
}

