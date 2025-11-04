/**
 * Agent Runner System
 * Phase 2: Real AI Agents execution
 * Global-Ready Architecture
 */

import { BaseAgent, AgentContext, AgentResponse, createAgent, AgentType } from './agents'
import { executeTool, getToolDescriptions, allTools } from './tools'
import { logger } from '../config/logger'
import { db } from '../core/storage'
import { searchMemory } from '../core/memory'
import { tasks } from '../core/tasks'
import { eventBus } from '../core/eventBus'

export interface AgentExecution {
  agentType: AgentType
  projectId: string
  context: AgentContext
  response: AgentResponse
  toolsUsed: Array<{ tool: string; params: any; result: any }>
  duration: number
  timestamp: string
}

// Agent Runner Class
export class AgentRunner {
  private agent: BaseAgent
  private toolsUsed: Array<{ tool: string; params: any; result: any }> = []

  constructor(agentType: AgentType) {
    this.agent = createAgent(agentType)
  }

  async run(context: AgentContext): Promise<AgentExecution> {
    const startTime = Date.now()
    const timestamp = new Date().toISOString()

    try {
      logger.info(`Running agent ${this.agent.type} for project ${context.projectId}`, {
        projectId: context.projectId,
        agentType: this.agent.type
      })

      // Build context with memory search
      const enrichedContext = await this.enrichContext(context)

      // Execute agent
      const response = await this.agent.process(enrichedContext)

      // Execute tools if needed
      if (response.action === 'use_tools') {
        const toolResults = await this.executeTools(response, enrichedContext)
        this.toolsUsed = toolResults
      }

      const duration = Date.now() - startTime

      const execution: AgentExecution = {
        agentType: this.agent.type,
        projectId: context.projectId,
        context: enrichedContext,
        response,
        toolsUsed: this.toolsUsed,
        duration,
        timestamp
      }

      // Publish event
      eventBus.publish('agent.executed', {
        agentType: this.agent.type,
        projectId: context.projectId,
        duration,
        success: true
      })

      logger.info(`Agent ${this.agent.type} completed`, {
        projectId: context.projectId,
        duration,
        toolsUsed: this.toolsUsed.length
      })

      return execution
    } catch (error: any) {
      const duration = Date.now() - startTime

      logger.error(`Agent ${this.agent.type} failed:`, error)

      eventBus.publish('agent.failed', {
        agentType: this.agent.type,
        projectId: context.projectId,
        duration,
        error: error.message
      })

      throw error
    }
  }

  private async enrichContext(context: AgentContext): Promise<AgentContext> {
    try {
      // Get project info
      const project = await db.getProject(context.projectId)
      if (project) {
        context.projectName = project.name
        context.projectDescription = project.description || undefined
      }

      // Search related memory
      const memoryResults = await searchMemory(context.projectId, 'summary runtime-log', 5)
      context.relatedMemory = memoryResults.map((r) => ({
        text: r.record.text,
        score: r.score
      }))

      // Get current tasks
      const tasksList = tasks.list(context.projectId)
      context.currentTasks = tasksList.map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status
      }))

      // Get recent jobs
      const jobs = await db.listJobs(context.projectId)
      context.recentJobs = jobs
        .slice(-10)
        .reverse()
        .map((j) => ({
          id: j.id,
          status: j.status,
          error: j.error || undefined
        }))

      return context
    } catch (error) {
      logger.warn('Failed to enrich context:', error)
      return context
    }
  }

  private async executeTools(
    response: AgentResponse,
    context: AgentContext
  ): Promise<Array<{ tool: string; params: any; result: any }>> {
    const results: Array<{ tool: string; params: any; result: any }> = []

    // Parse tool calls from response (if any)
    // This is a simplified version - in production, use structured tool calling
    if (response.output && typeof response.output === 'string') {
      try {
        const parsed = JSON.parse(response.output)
        if (parsed.tools && Array.isArray(parsed.tools)) {
          for (const toolCall of parsed.tools) {
            try {
              const result = await executeTool(toolCall.name, toolCall.params, context)
              results.push({
                tool: toolCall.name,
                params: toolCall.params,
                result
              })
            } catch (error: any) {
              logger.error(`Tool ${toolCall.name} execution failed:`, error)
              results.push({
                tool: toolCall.name,
                params: toolCall.params,
                result: { success: false, error: error.message }
              })
            }
          }
        }
      } catch (error) {
        // Not JSON, skip tool execution
      }
    }

    return results
  }
}

// Agent Manager
export class AgentManager {
  private runners: Map<AgentType, AgentRunner> = new Map()

  getRunner(agentType: AgentType): AgentRunner {
    if (!this.runners.has(agentType)) {
      this.runners.set(agentType, new AgentRunner(agentType))
    }
    return this.runners.get(agentType)!
  }

  async runAgent(agentType: AgentType, context: AgentContext): Promise<AgentExecution> {
    const runner = this.getRunner(agentType)
    return await runner.run(context)
  }

  async runAllAgents(context: AgentContext): Promise<AgentExecution[]> {
    const agents: AgentType[] = ['morpheus', 'architect', 'sida', 'vision', 'audit']
    const results: AgentExecution[] = []

    for (const agentType of agents) {
      try {
        const execution = await this.runAgent(agentType, context)
        results.push(execution)
      } catch (error: any) {
        logger.error(`Agent ${agentType} failed:`, error)
        // Continue with other agents
      }
    }

    return results
  }
}

// Global Agent Manager
export const agentManager = new AgentManager()

