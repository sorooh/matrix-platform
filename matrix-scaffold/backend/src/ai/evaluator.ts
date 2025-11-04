/**
 * Agent Evaluator System
 * Phase 2: Real AI Agents - Agent evaluation and quality metrics
 * Global-Ready Architecture
 */

import { AgentExecution, AgentType } from './agentRunner'
import { agentMemory, AgentMemoryQuery } from './agentMemory'
import { logger } from '../config/logger'
import { Identifier } from '../core/schema'

export interface AgentEvaluation {
  agentType: AgentType
  projectId: Identifier
  score: number
  metrics: {
    successRate: number
    avgDuration: number
    toolEfficiency: number
    responseQuality: number
    contextRelevance: number
  }
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  timestamp: string
}

export interface EvaluationReport {
  projectId: Identifier
  evaluations: AgentEvaluation[]
  overallScore: number
  bestAgent: AgentType
  worstAgent: AgentType
  timestamp: string
}

export class AgentEvaluator {
  /**
   * Evaluate agent performance
   */
  async evaluate(
    projectId: Identifier,
    agentType: AgentType,
    executions: AgentExecution[]
  ): Promise<AgentEvaluation> {
    try {
      if (executions.length === 0) {
        return this.createEmptyEvaluation(projectId, agentType)
      }

      const metrics = this.calculateMetrics(executions)
      const score = this.calculateScore(metrics)
      const { strengths, weaknesses, recommendations } = this.analyzePerformance(
        metrics,
        executions
      )

      const evaluation: AgentEvaluation = {
        agentType,
        projectId,
        score,
        metrics,
        strengths,
        weaknesses,
        recommendations,
        timestamp: new Date().toISOString()
      }

      logger.info(`Agent evaluation completed: ${agentType}`, {
        projectId,
        score,
        successRate: metrics.successRate
      })

      return evaluation
    } catch (error: any) {
      logger.error('Agent evaluation failed:', error)
      return this.createEmptyEvaluation(projectId, agentType)
    }
  }

  /**
   * Evaluate all agents for a project
   */
  async evaluateAll(projectId: Identifier): Promise<EvaluationReport> {
    try {
      const agentTypes: AgentType[] = ['morpheus', 'architect', 'sida', 'vision', 'audit']
      const evaluations: AgentEvaluation[] = []

      for (const agentType of agentTypes) {
        try {
          // Get memories for this agent
          const memories = await agentMemory.retrieveMemory({ projectId, agentType })

          // Convert memories to executions (simplified)
          const executions: AgentExecution[] = memories.map((m) => ({
            agentType: m.agentType,
            projectId: m.projectId,
            context: {} as any,
            response: {
              action: '',
              reasoning: m.response,
              output: m.response
            },
            toolsUsed: m.toolsUsed.map((t) => ({
              tool: t,
              params: {},
              result: { success: m.success }
            })),
            duration: (m.metadata?.duration as number) || 0,
            timestamp: m.timestamp
          }))

          const evaluation = await this.evaluate(projectId, agentType, executions)
          evaluations.push(evaluation)
        } catch (error: any) {
          logger.error(`Evaluation failed for ${agentType}:`, error)
        }
      }

      const overallScore = this.calculateOverallScore(evaluations)
      const bestAgent = this.findBestAgent(evaluations)
      const worstAgent = this.findWorstAgent(evaluations)

      const report: EvaluationReport = {
        projectId,
        evaluations,
        overallScore,
        bestAgent,
        worstAgent,
        timestamp: new Date().toISOString()
      }

      logger.info(`Evaluation report generated: ${projectId}`, {
        overallScore,
        bestAgent,
        worstAgent
      })

      return report
    } catch (error: any) {
      logger.error('Evaluation report generation failed:', error)
      throw error
    }
  }

  private calculateMetrics(executions: AgentExecution[]) {
    const successCount = executions.filter(
      (e) => e.response && !e.response.error
    ).length
    const totalDuration = executions.reduce((sum, e) => sum + e.duration, 0)
    const toolUsage = executions.reduce((sum, e) => sum + e.toolsUsed.length, 0)

    return {
      successRate: executions.length > 0 ? successCount / executions.length : 0,
      avgDuration: executions.length > 0 ? totalDuration / executions.length : 0,
      toolEfficiency: executions.length > 0 ? toolUsage / executions.length : 0,
      responseQuality: this.calculateResponseQuality(executions),
      contextRelevance: this.calculateContextRelevance(executions)
    }
  }

  private calculateResponseQuality(executions: AgentExecution[]): number {
    if (executions.length === 0) return 0

    let quality = 0
    for (const execution of executions) {
      const response = execution.response
      let score = 0

      // Check if response has reasoning
      if (response.reasoning && response.reasoning.length > 50) score += 0.3
      // Check if response has output
      if (response.output && response.output.length > 50) score += 0.3
      // Check if response has action
      if (response.action) score += 0.2
      // Check if response has suggestions
      if (response.suggestions && response.suggestions.length > 0) score += 0.2

      quality += score
    }

    return quality / executions.length
  }

  private calculateContextRelevance(executions: AgentExecution[]): number {
    if (executions.length === 0) return 0

    let relevance = 0
    for (const execution of executions) {
      const context = execution.context
      let score = 0

      // Check if context has project info
      if (context.projectId) score += 0.3
      // Check if context has related memory
      if (context.relatedMemory && context.relatedMemory.length > 0) score += 0.4
      // Check if context has current tasks
      if (context.currentTasks && context.currentTasks.length > 0) score += 0.3

      relevance += score
    }

    return relevance / executions.length
  }

  private calculateScore(metrics: {
    successRate: number
    avgDuration: number
    toolEfficiency: number
    responseQuality: number
    contextRelevance: number
  }): number {
    // Weighted score calculation
    const weights = {
      successRate: 0.3,
      avgDuration: 0.2,
      toolEfficiency: 0.15,
      responseQuality: 0.2,
      contextRelevance: 0.15
    }

    // Normalize duration (lower is better, max 10s)
    const normalizedDuration = Math.max(0, 1 - metrics.avgDuration / 10000)

    const score =
      metrics.successRate * weights.successRate +
      normalizedDuration * weights.avgDuration +
      Math.min(metrics.toolEfficiency / 5, 1) * weights.toolEfficiency +
      metrics.responseQuality * weights.responseQuality +
      metrics.contextRelevance * weights.contextRelevance

    return Math.round(score * 100) / 100
  }

  private analyzePerformance(
    metrics: ReturnType<typeof this.calculateMetrics>,
    executions: AgentExecution[]
  ): {
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
  } {
    const strengths: string[] = []
    const weaknesses: string[] = []
    const recommendations: string[] = []

    // Analyze success rate
    if (metrics.successRate >= 0.9) {
      strengths.push('Excellent success rate')
    } else if (metrics.successRate < 0.7) {
      weaknesses.push('Low success rate')
      recommendations.push('Review error handling and agent prompts')
    }

    // Analyze duration
    if (metrics.avgDuration < 2000) {
      strengths.push('Fast execution time')
    } else if (metrics.avgDuration > 5000) {
      weaknesses.push('Slow execution time')
      recommendations.push('Optimize agent processing and tool usage')
    }

    // Analyze tool efficiency
    if (metrics.toolEfficiency > 0 && metrics.toolEfficiency < 3) {
      strengths.push('Efficient tool usage')
    } else if (metrics.toolEfficiency > 5) {
      weaknesses.push('Excessive tool usage')
      recommendations.push('Reduce tool calls and batch operations')
    }

    // Analyze response quality
    if (metrics.responseQuality >= 0.8) {
      strengths.push('High response quality')
    } else if (metrics.responseQuality < 0.5) {
      weaknesses.push('Low response quality')
      recommendations.push('Improve agent prompts and response formatting')
    }

    // Analyze context relevance
    if (metrics.contextRelevance >= 0.8) {
      strengths.push('High context relevance')
    } else if (metrics.contextRelevance < 0.5) {
      weaknesses.push('Low context relevance')
      recommendations.push('Enrich context with more project information')
    }

    return { strengths, weaknesses, recommendations }
  }

  private calculateOverallScore(evaluations: AgentEvaluation[]): number {
    if (evaluations.length === 0) return 0

    const totalScore = evaluations.reduce((sum, e) => sum + e.score, 0)
    return Math.round((totalScore / evaluations.length) * 100) / 100
  }

  private findBestAgent(evaluations: AgentEvaluation[]): AgentType {
    if (evaluations.length === 0) return 'morpheus'

    const best = evaluations.reduce((best, current) =>
      current.score > best.score ? current : best
    )
    return best.agentType
  }

  private findWorstAgent(evaluations: AgentEvaluation[]): AgentType {
    if (evaluations.length === 0) return 'morpheus'

    const worst = evaluations.reduce((worst, current) =>
      current.score < worst.score ? current : worst
    )
    return worst.agentType
  }

  private createEmptyEvaluation(
    projectId: Identifier,
    agentType: AgentType
  ): AgentEvaluation {
    return {
      agentType,
      projectId,
      score: 0,
      metrics: {
        successRate: 0,
        avgDuration: 0,
        toolEfficiency: 0,
        responseQuality: 0,
        contextRelevance: 0
      },
      strengths: [],
      weaknesses: ['No execution history available'],
      recommendations: ['Start using this agent to generate evaluation data'],
      timestamp: new Date().toISOString()
    }
  }
}

// Global Agent Evaluator
export const agentEvaluator = new AgentEvaluator()

