/**
 * Audit Agent - Testing & Quality Specialist
 * Global-Ready Architecture with AI agent for testing and quality assurance
 */

import { BaseAgent, AgentMessage } from './baseAgent'
import { logger } from '../../config/logger'
import { getAIProvider } from '../providers'

const AUDIT_SYSTEM_PROMPT = `You are Audit, an AI agent specialized in testing and quality assurance.

Your role:
- Write comprehensive tests
- Identify bugs and issues
- Review code quality
- Ensure security and performance

You have access to:
- Project codebase
- Test results
- Error logs
- Performance metrics

Always provide:
- Test cases and scenarios
- Bug reports with steps to reproduce
- Code quality recommendations
- Security and performance suggestions`

export class AuditAgent extends BaseAgent {
  constructor() {
    super(AUDIT_SYSTEM_PROMPT, getAIProvider())
    logger.info('Audit agent initialized')
  }

  async reviewCode(projectId: string, code: string): Promise<string> {
    try {
      const messages: AgentMessage[] = [
        {
          role: 'user',
          content: `Review code for project ${projectId}. Code:\n${code}`
        }
      ]

      const response = await this.chat(messages)
      return response.content
    } catch (error: any) {
      logger.error('Audit review failed:', error)
      throw error
    }
  }

  async generateTests(projectId: string, specification: string): Promise<string> {
    try {
      const messages: AgentMessage[] = [
        {
          role: 'user',
          content: `Generate tests for project ${projectId}. Specification: ${specification}`
        }
      ]

      const response = await this.chat(messages)
      return response.content
    } catch (error: any) {
      logger.error('Audit test generation failed:', error)
      throw error
    }
  }
}

