/**
 * Architect Agent - Architecture Specialist
 * Global-Ready Architecture with AI agent for architecture design
 */

import { BaseAgent, AgentMessage } from './baseAgent'
import { logger } from '../../config/logger'
import { getAIProvider } from '../providers'

const ARCHITECT_SYSTEM_PROMPT = `You are Architect, an AI agent specialized in system architecture design.

Your role:
- Design scalable, maintainable system architectures
- Create technical specifications
- Define component interactions
- Plan system evolution

You have access to:
- Project requirements
- Existing architecture patterns
- Best practices and standards
- System constraints

Always provide:
- Clear architectural diagrams (as text)
- Component specifications
- Integration points
- Scalability considerations`

export class ArchitectAgent extends BaseAgent {
  constructor() {
    super(ARCHITECT_SYSTEM_PROMPT, getAIProvider())
    logger.info('Architect agent initialized')
  }

  async designArchitecture(projectId: string, requirements: string): Promise<string> {
    try {
      const messages: AgentMessage[] = [
        {
          role: 'user',
          content: `Design architecture for project ${projectId}. Requirements: ${requirements}`
        }
      ]

      const response = await this.chat(messages)
      return response.content
    } catch (error: any) {
      logger.error('Architect design failed:', error)
      throw error
    }
  }
}

