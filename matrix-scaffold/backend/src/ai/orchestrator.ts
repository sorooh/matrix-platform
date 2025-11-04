/**
 * AI Agent Orchestrator
 * Phase 2: Real AI Agents - Tool orchestration and agent coordination
 * Global-Ready Architecture
 */

import { BaseAgent, AgentType, AgentContext, AgentResponse } from './agents'
import { allTools, executeTool, getToolDescriptions, Tool } from './tools'
import { agentManager, AgentExecution } from './agentRunner'
import { logger } from '../config/logger'
import { captureException } from '../config/sentry'

export interface OrchestrationPlan {
  agentType: AgentType
  context: AgentContext
  tools: Array<{ tool: string; params: any; condition?: string }>
  dependencies?: AgentType[]
  priority: number
}

export interface OrchestrationResult {
  executions: AgentExecution[]
  toolsUsed: Array<{ tool: string; params: any; result: any }>
  errors: Array<{ agent: AgentType; error: string }>
  duration: number
  timestamp: string
}

export class AgentOrchestrator {
  private executionHistory: Map<string, AgentExecution[]> = new Map()
  private toolCache: Map<string, any> = new Map()

  /**
   * Orchestrate multiple agents with tool coordination
   */
  async orchestrate(
    plan: OrchestrationPlan[],
    context: AgentContext
  ): Promise<OrchestrationResult> {
    const startTime = Date.now()
    const timestamp = new Date().toISOString()
    const executions: AgentExecution[] = []
    const toolsUsed: Array<{ tool: string; params: any; result: any }> = []
    const errors: Array<{ agent: AgentType; error: string }> = []

    try {
      // Sort by priority
      const sortedPlan = plan.sort((a, b) => b.priority - a.priority)

      // Execute agents sequentially with dependencies
      for (const step of sortedPlan) {
        try {
          // Check dependencies
          if (step.dependencies && step.dependencies.length > 0) {
            const dependencyResults = step.dependencies
              .map((dep) => executions.find((e) => e.agentType === dep))
              .filter(Boolean)

            if (dependencyResults.length !== step.dependencies.length) {
              logger.warn(`Dependencies not met for ${step.agentType}, skipping`)
              continue
            }

            // Enrich context with dependency results
            const enrichedContext = this.enrichContextWithDependencies(
              context,
              dependencyResults
            )
            step.context = enrichedContext
          }

          // Execute agent
          const execution = await agentManager.runAgent(step.agentType, step.context)

          // Execute tools if needed
          if (step.tools && step.tools.length > 0) {
            for (const toolStep of step.tools) {
              try {
                // Check condition if provided
                if (toolStep.condition) {
                  const shouldExecute = this.evaluateCondition(
                    toolStep.condition,
                    execution,
                    context
                  )
                  if (!shouldExecute) continue
                }

                // Check cache
                const cacheKey = `${toolStep.tool}:${JSON.stringify(toolStep.params)}`
                let toolResult = this.toolCache.get(cacheKey)

                if (!toolResult) {
                  toolResult = await executeTool(toolStep.tool, toolStep.params, context)
                  this.toolCache.set(cacheKey, toolResult)
                }

                toolsUsed.push({
                  tool: toolStep.tool,
                  params: toolStep.params,
                  result: toolResult
                })

                // Update context with tool result
                context = this.updateContextWithToolResult(context, toolResult)
              } catch (error: any) {
                logger.error(`Tool ${toolStep.tool} execution failed:`, error)
                toolsUsed.push({
                  tool: toolStep.tool,
                  params: toolStep.params,
                  result: { success: false, error: error.message }
                })
              }
            }
          }

          executions.push(execution)

          // Store in history
          const historyKey = `${context.projectId}:${step.agentType}`
          const history = this.executionHistory.get(historyKey) || []
          history.push(execution)
          this.executionHistory.set(historyKey, history.slice(-10)) // Keep last 10
        } catch (error: any) {
          logger.error(`Agent ${step.agentType} orchestration failed:`, error)
          errors.push({ agent: step.agentType, error: error.message })
          captureException(error as Error, { context: `orchestration:${step.agentType}` })
        }
      }

      const duration = Date.now() - startTime

      logger.info(`Orchestration completed: ${executions.length} agents, ${toolsUsed.length} tools`, {
        projectId: context.projectId,
        duration,
        errors: errors.length
      })

      return {
        executions,
        toolsUsed,
        errors,
        duration,
        timestamp
      }
    } catch (error: any) {
      logger.error('Orchestration failed:', error)
      captureException(error as Error, { context: 'orchestration' })
      throw error
    }
  }

  /**
   * Create orchestration plan for a project
   */
  async createPlan(
    projectId: string,
    goal: string
  ): Promise<OrchestrationPlan[]> {
    const plans: OrchestrationPlan[] = []

    // Analyze goal and create plan
    if (goal.includes('analyze') || goal.includes('analysis')) {
      plans.push({
        agentType: 'morpheus',
        context: { projectId },
        tools: [{ tool: 'search_memory', params: { query: goal, topK: 5 } }],
        priority: 10
      })
    }

    if (goal.includes('architecture') || goal.includes('design')) {
      plans.push({
        agentType: 'architect',
        context: { projectId },
        dependencies: ['morpheus'],
        tools: [{ tool: 'get_project_info', params: { projectId } }],
        priority: 9
      })
    }

    if (goal.includes('code') || goal.includes('implement')) {
      plans.push({
        agentType: 'sida',
        context: { projectId },
        dependencies: ['architect'],
        tools: [
          { tool: 'get_project_info', params: { projectId } },
          { tool: 'search_memory', params: { query: 'code implementation', topK: 3 } }
        ],
        priority: 8
      })
    }

    if (goal.includes('test') || goal.includes('testing')) {
      plans.push({
        agentType: 'audit',
        context: { projectId },
        dependencies: ['sida'],
        tools: [{ tool: 'search_memory', params: { query: 'test code', topK: 3 } }],
        priority: 7
      })
    }

    if (goal.includes('visual') || goal.includes('ui')) {
      plans.push({
        agentType: 'vision',
        context: { projectId },
        tools: [{ tool: 'get_project_info', params: { projectId } }],
        priority: 6
      })
    }

    return plans
  }

  private enrichContextWithDependencies(
    context: AgentContext,
    dependencyResults: AgentExecution[]
  ): AgentContext {
    const enriched = { ...context }

    // Add dependency outputs to context
    for (const result of dependencyResults) {
      if (result.response.output) {
        enriched.relatedMemory = enriched.relatedMemory || []
        enriched.relatedMemory.push({
          text: result.response.output,
          score: 1.0
        })
      }
    }

    return enriched
  }

  private updateContextWithToolResult(context: AgentContext, toolResult: any): AgentContext {
    const updated = { ...context }

    if (toolResult.success && toolResult.results) {
      updated.relatedMemory = updated.relatedMemory || []
      updated.relatedMemory.push(
        ...toolResult.results.map((r: any) => ({
          text: r.text || JSON.stringify(r),
          score: r.score || 0.5
        }))
      )
    }

    return updated
  }

  private evaluateCondition(
    condition: string,
    execution: AgentExecution,
    context: AgentContext
  ): boolean {
    try {
      // Simple condition evaluation
      // Example: "response.success === true"
      const conditionFunc = new Function(
        'execution',
        'context',
        `return ${condition}`
      )
      return conditionFunc(execution, context)
    } catch (error) {
      logger.warn('Condition evaluation failed:', error)
      return false
    }
  }

  /**
   * Get execution history for an agent
   */
  getHistory(projectId: string, agentType?: AgentType): AgentExecution[] {
    if (agentType) {
      const key = `${projectId}:${agentType}`
      return this.executionHistory.get(key) || []
    }

    // Return all history for project
    const allHistory: AgentExecution[] = []
    for (const [key, history] of this.executionHistory.entries()) {
      if (key.startsWith(`${projectId}:`)) {
        allHistory.push(...history)
      }
    }
    return allHistory.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.toolCache.clear()
    logger.info('Orchestrator cache cleared')
  }

  /**
   * Clear history
   */
  clearHistory(projectId?: string): void {
    if (projectId) {
      for (const key of this.executionHistory.keys()) {
        if (key.startsWith(`${projectId}:`)) {
          this.executionHistory.delete(key)
        }
      }
    } else {
      this.executionHistory.clear()
    }
    logger.info('Orchestrator history cleared', { projectId })
  }
}

// Global Orchestrator
export const orchestrator = new AgentOrchestrator()

