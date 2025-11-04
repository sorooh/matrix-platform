/**
 * Advanced Multi-Agent Orchestration System
 * Phase 3 Completion: Advanced AI Capabilities
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { agents, AgentType } from './agents'
import { orchestrator } from './orchestrator'
import { agentMemory } from './agentMemory'
import { agentEvaluator } from './evaluator'
import { getAIProvider } from './providers'

export interface MultiAgentTask {
  id: string
  goal: string
  agents: AgentType[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'running' | 'completed' | 'failed'
  results: Record<string, any>
  createdAt: Date
  completedAt?: Date
}

export interface AgentCollaboration {
  taskId: string
  agents: Array<{
    agent: AgentType
    role: string
    contribution: string
    confidence: number
  }>
  finalResult: string
  quality: number
}

export class AdvancedOrchestrationSystem {
  private tasks: Map<string, MultiAgentTask> = new Map()
  private collaborations: Map<string, AgentCollaboration> = new Map()

  /**
   * Create multi-agent task
   */
  async createTask(
    goal: string,
    agentTypes: AgentType[],
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<{ success: boolean; task?: MultiAgentTask; error?: string }> {
    try {
      const task: MultiAgentTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        goal,
        agents: agentTypes,
        priority,
        status: 'pending',
        results: {},
        createdAt: new Date()
      }

      this.tasks.set(task.id, task)

      logger.info(`Multi-agent task created: ${task.id}`, {
        goal,
        agents: agentTypes.length,
        priority
      })

      // Start execution
      await this.executeTask(task.id)

      return { success: true, task }
    } catch (error: any) {
      logger.error('Multi-agent task creation failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Execute multi-agent task
   */
  private async executeTask(taskId: string): Promise<void> {
    try {
      const task = this.tasks.get(taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      task.status = 'running'
      this.tasks.set(taskId, task)

      logger.info(`Executing multi-agent task: ${taskId}`, {
        goal: task.goal,
        agents: task.agents.length
      })

      // Orchestrate agents sequentially or in parallel
      const results: Record<string, any> = {}

      for (const agentType of task.agents) {
        try {
          const agent = agents[agentType]
          if (!agent) {
            throw new Error(`Agent ${agentType} not found`)
          }

          // Get context from previous agents
          const context = Object.values(results)
            .map((r) => (typeof r === 'string' ? r : JSON.stringify(r)))
            .join('\n')

          // Execute agent
          const result = await agent.analyzeProject(
            taskId,
            `${task.goal}\n\nContext from previous agents:\n${context}`
          )

          results[agentType] = result

          // Store in agent memory
          await agentMemory.store(taskId, agentType, result, {
            taskId,
            goal: task.goal,
            priority: task.priority
          })

          logger.info(`Agent ${agentType} completed for task ${taskId}`, {
            agentType,
            resultLength: result.length
          })
        } catch (error: any) {
          logger.error(`Agent ${agentType} failed for task ${taskId}:`, error)
          results[agentType] = { error: error.message }
        }
      }

      // Generate collaboration summary
      const collaboration = await this.generateCollaboration(task, results)

      task.results = results
      task.status = 'completed'
      task.completedAt = new Date()
      this.tasks.set(taskId, task)
      this.collaborations.set(taskId, collaboration)

      logger.info(`Multi-agent task completed: ${taskId}`, {
        quality: collaboration.quality,
        agents: collaboration.agents.length
      })
    } catch (error: any) {
      logger.error(`Multi-agent task execution failed: ${taskId}`, error)
      const task = this.tasks.get(taskId)
      if (task) {
        task.status = 'failed'
        this.tasks.set(taskId, task)
      }
    }
  }

  /**
   * Generate agent collaboration summary
   */
  private async generateCollaboration(
    task: MultiAgentTask,
    results: Record<string, any>
  ): Promise<AgentCollaboration> {
    try {
      const collaboration: AgentCollaboration = {
        taskId: task.id,
        agents: [],
        finalResult: '',
        quality: 0
      }

      // Analyze each agent's contribution
      for (const agentType of task.agents) {
        const result = results[agentType]
        if (result && !result.error) {
          const contribution = typeof result === 'string' ? result : JSON.stringify(result)
          const confidence = this.calculateConfidence(result, agentType)

          collaboration.agents.push({
            agent: agentType,
            role: this.getAgentRole(agentType),
            contribution: contribution.substring(0, 500), // Limit size
            confidence
          })
        }
      }

      // Generate final result
      const finalResult = collaboration.agents
        .map((a) => `[${a.agent}] ${a.contribution}`)
        .join('\n\n')

      collaboration.finalResult = finalResult

      // Calculate quality score
      const avgConfidence =
        collaboration.agents.reduce((sum, a) => sum + a.confidence, 0) /
        (collaboration.agents.length || 1)
      const completeness = collaboration.agents.length / task.agents.length
      collaboration.quality = (avgConfidence * 0.7 + completeness * 0.3) * 100

      return collaboration
    } catch (error: any) {
      logger.error('Collaboration generation failed:', error)
      return {
        taskId: task.id,
        agents: [],
        finalResult: '',
        quality: 0
      }
    }
  }

  /**
   * Calculate agent confidence
   */
  private calculateConfidence(result: any, agentType: AgentType): number {
    // Simplified confidence calculation
    if (typeof result === 'string') {
      const length = result.length
      const hasKeywords = ['success', 'complete', 'done', 'finished'].some((kw) =>
        result.toLowerCase().includes(kw)
      )
      return Math.min(1, length / 500) * (hasKeywords ? 1 : 0.8)
    }
    return 0.7
  }

  /**
   * Get agent role description
   */
  private getAgentRole(agentType: AgentType): string {
    const roles: Record<AgentType, string> = {
      morpheus: 'Analysis & Strategy',
      architect: 'Architecture & Design',
      sida: 'Code Generation & Implementation',
      audit: 'Testing & Quality Assurance',
      vision: 'Visualization & Documentation'
    }
    return roles[agentType] || 'General Purpose'
  }

  /**
   * Get task status
   */
  getTask(taskId: string): MultiAgentTask | null {
    return this.tasks.get(taskId) || null
  }

  /**
   * Get collaboration
   */
  getCollaboration(taskId: string): AgentCollaboration | null {
    return this.collaborations.get(taskId) || null
  }

  /**
   * List tasks
   */
  listTasks(limit: number = 100): MultiAgentTask[] {
    return Array.from(this.tasks.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
    avgQuality: number
  } {
    const tasks = Array.from(this.tasks.values())
    const collaborations = Array.from(this.collaborations.values())

    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      running: tasks.filter((t) => t.status === 'running').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      avgQuality:
        collaborations.length > 0
          ? collaborations.reduce((sum, c) => sum + c.quality, 0) / collaborations.length
          : 0
    }
  }
}

// Global Advanced Orchestration System
export const advancedOrchestration = new AdvancedOrchestrationSystem()

