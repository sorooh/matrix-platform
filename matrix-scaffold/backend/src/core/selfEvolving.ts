/**
 * Self-Evolving System
 * Phase 2: Auto-improvement system
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { db } from './storage'
import { addMemory, searchMemory } from './memory'
import { kpis } from './suig'
import { tasks } from './tasks'
import { graph } from './graph'
import { agentEvaluator } from '../ai/evaluator'
import { agentMemory } from '../ai/agentMemory'

export interface EvolutionInsight {
  type: 'performance' | 'error' | 'pattern' | 'optimization'
  description: string
  suggestion: string
  priority: 'low' | 'medium' | 'high'
  confidence: number
}

export class SelfEvolvingSystem {
  private insights: EvolutionInsight[] = []
  private lastAnalysis: Date | null = null

  async analyze(): Promise<EvolutionInsight[]> {
    try {
      const now = new Date()
      const kpisData = await kpis()
      const allProjects = await db.listProjects()
      const allJobs = await db.listJobs()
      const allTasks = tasks.list()

      const insights: EvolutionInsight[] = []

      // Performance insights
      if (kpisData.jobs.successRate < 0.8) {
        insights.push({
          type: 'performance',
          description: `Job success rate is ${(kpisData.jobs.successRate * 100).toFixed(1)}%`,
          suggestion: 'Review failed jobs and improve error handling',
          priority: 'high',
          confidence: 0.9
        })
      }

      // Error insights
      const failedJobs = allJobs.filter((j: any) => j.status === 'failed')
      if (failedJobs.length > 0) {
        const errorPatterns = this.analyzeErrorPatterns(failedJobs)
        for (const pattern of errorPatterns) {
          insights.push({
            type: 'error',
            description: `Error pattern detected: ${pattern.error}`,
            suggestion: pattern.suggestion,
            priority: 'medium',
            confidence: 0.7
          })
        }
      }

      // Pattern insights
      const taskPatterns = this.analyzeTaskPatterns(allTasks)
      for (const pattern of taskPatterns) {
        insights.push({
          type: 'pattern',
          description: pattern.description,
          suggestion: pattern.suggestion,
          priority: 'low',
          confidence: 0.6
        })
      }

      // Optimization insights
      const optimizationInsights = await this.analyzeOptimizations(allProjects)
      insights.push(...optimizationInsights)

      // Agent performance insights
      const agentInsights = await this.analyzeAgentPerformance(allProjects)
      insights.push(...agentInsights)

      this.insights = insights
      this.lastAnalysis = now

      // Store insights in memory
      await this.storeInsights(insights)

      logger.info(`Self-evolving analysis completed: ${insights.length} insights`, {
        insights: insights.length,
        timestamp: now.toISOString()
      })

      return insights
    } catch (error) {
      logger.error('Self-evolving analysis failed:', error)
      return []
    }
  }

  private analyzeErrorPatterns(failedJobs: any[]): Array<{ error: string; suggestion: string }> {
    const patterns: Record<string, number> = {}
    const suggestions: Record<string, string> = {}

    for (const job of failedJobs) {
      const error = job.error || 'unknown'
      const errorKey = error.toLowerCase().slice(0, 50)
      patterns[errorKey] = (patterns[errorKey] || 0) + 1

      if (!suggestions[errorKey]) {
        if (error.includes('timeout')) {
          suggestions[errorKey] = 'Increase timeout limits or optimize slow operations'
        } else if (error.includes('memory')) {
          suggestions[errorKey] = 'Optimize memory usage or increase resource limits'
        } else if (error.includes('connection')) {
          suggestions[errorKey] = 'Check database/Redis connections and retry logic'
        } else {
          suggestions[errorKey] = 'Review error logs and improve error handling'
        }
      }
    }

    return Object.entries(patterns)
      .filter(([_, count]) => count >= 2)
      .map(([error, count]) => ({
        error,
        suggestion: suggestions[error] || 'Review and fix'
      }))
  }

  private analyzeTaskPatterns(allTasks: any[]): Array<{ description: string; suggestion: string }> {
    const patterns: Array<{ description: string; suggestion: string }> = []

    // Analyze task distribution
    const taskTypes: Record<string, number> = {}
    for (const task of allTasks) {
      taskTypes[task.type] = (taskTypes[task.type] || 0) + 1
    }

    const totalTasks = allTasks.length
    for (const [type, count] of Object.entries(taskTypes)) {
      const percentage = (count / totalTasks) * 100
      if (percentage > 50) {
        patterns.push({
          description: `${type} tasks represent ${percentage.toFixed(1)}% of all tasks`,
          suggestion: `Consider optimizing ${type} task processing`
        })
      }
    }

    return patterns
  }

  private async analyzeAgentPerformance(projects: any[]): Promise<EvolutionInsight[]> {
    const insights: EvolutionInsight[] = []

    for (const project of projects) {
      try {
        // Get agent evaluation
        const evaluation = await agentEvaluator.evaluateAll(project.id)

        // Check overall score
        if (evaluation.overallScore < 0.7) {
          insights.push({
            type: 'performance',
            description: `Agent performance score is ${(evaluation.overallScore * 100).toFixed(1)}% for project ${project.id}`,
            suggestion: 'Review agent prompts and improve tool usage',
            priority: 'high',
            confidence: 0.9
          })
        }

        // Check worst agent
        const worstEval = evaluation.evaluations.find(
          (e) => e.agentType === evaluation.worstAgent
        )
        if (worstEval && worstEval.score < 0.6) {
          insights.push({
            type: 'performance',
            description: `Agent ${evaluation.worstAgent} is underperforming (score: ${(worstEval.score * 100).toFixed(1)}%)`,
            suggestion: worstEval.recommendations.join('; ') || 'Review agent implementation',
            priority: 'medium',
            confidence: 0.8
          })
        }

        // Check for learning opportunities
        const learnings = await agentMemory.learnFromHistory(project.id, evaluation.bestAgent)
        if (learnings.recommendations.length > 0) {
          insights.push({
            type: 'optimization',
            description: `Learning opportunities identified for agent ${evaluation.bestAgent}`,
            suggestion: learnings.recommendations.join('; '),
            priority: 'low',
            confidence: 0.7
          })
        }
      } catch (error) {
        logger.warn(`Failed to analyze agent performance for project ${project.id}:`, error)
      }
    }

    return insights
  }

  private async analyzeOptimizations(projects: any[]): Promise<EvolutionInsight[]> {
    const insights: EvolutionInsight[] = []

    for (const project of projects) {
      try {
        const memories = await db.listMemory(project.id)
        if (memories.length > 1000) {
          insights.push({
            type: 'optimization',
            description: `Project ${project.id} has ${memories.length} memory records`,
            suggestion: 'Consider compacting old memory records',
            priority: 'low',
            confidence: 0.8
          })
        }
      } catch (error) {
        logger.warn(`Failed to analyze project ${project.id}:`, error)
      }
    }

    return insights
  }

  private async storeInsights(insights: EvolutionInsight[]): Promise<void> {
    try {
      const summary = insights
        .map((i) => `[${i.priority}] ${i.type}: ${i.description} - ${i.suggestion}`)
        .join('\n')

      await addMemory('__org__', `Self-evolving insights:\n${summary}`, {
        kind: 'self-evolving',
        timestamp: new Date().toISOString(),
        count: insights.length
      })
    } catch (error) {
      logger.warn('Failed to store insights:', error)
    }
  }

  getInsights(): EvolutionInsight[] {
    return this.insights
  }

  getLastAnalysis(): Date | null {
    return this.lastAnalysis
  }
}

// Global Self-Evolving System
export const selfEvolvingSystem = new SelfEvolvingSystem()

// Auto-improvement system
export class AutoImprovementSystem {
  async improve(): Promise<{
    improvements: string[]
    applied: number
    errors: string[]
  }> {
    const improvements: string[] = []
    const applied: string[] = []
    const errors: string[] = []

    try {
      // Get insights
      const insights = await selfEvolvingSystem.analyze()

      // Apply high-priority improvements
      for (const insight of insights) {
        if (insight.priority === 'high' && insight.confidence > 0.8) {
          try {
            const result = await this.applyImprovement(insight)
            if (result.success) {
              applied.push(insight.suggestion)
              improvements.push(`Applied: ${insight.suggestion}`)
            } else {
              errors.push(`Failed to apply: ${insight.suggestion} - ${result.error}`)
            }
          } catch (error: any) {
            errors.push(`Error applying improvement: ${error.message}`)
          }
        }
      }

      logger.info(`Auto-improvement completed: ${applied.length} improvements applied`, {
        applied: applied.length,
        errors: errors.length
      })

      return {
        improvements,
        applied: applied.length,
        errors
      }
    } catch (error: any) {
      logger.error('Auto-improvement failed:', error)
      return {
        improvements: [],
        applied: 0,
        errors: [error.message]
      }
    }
  }

  private async applyImprovement(insight: EvolutionInsight): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // This is a simplified version - in production, implement actual improvements
      // For example:
      // - Update agent prompts
      // - Adjust tool configurations
      // - Optimize database queries
      // - Update error handling

      logger.info(`Applying improvement: ${insight.suggestion}`, {
        type: insight.type,
        priority: insight.priority
      })

      // Store improvement in memory
      await addMemory('__org__', `Auto-improvement applied: ${insight.suggestion}`, {
        kind: 'auto-improvement',
        type: insight.type,
        priority: insight.priority,
        timestamp: new Date().toISOString()
      })

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

// Global Auto-Improvement System
export const autoImprovement = new AutoImprovementSystem()

// Periodic analysis
export function startSelfEvolvingAnalysis(intervalMs: number = 3600000): void {
  setInterval(async () => {
    try {
      await selfEvolvingSystem.analyze()
    } catch (error) {
      logger.error('Self-evolving analysis error:', error)
    }
  }, intervalMs)

  logger.info('Self-evolving analysis started', { intervalMs })
}

// Periodic auto-improvement
export function startAutoImprovement(intervalMs: number = 7200000): void {
  setInterval(async () => {
    try {
      await autoImprovement.improve()
    } catch (error) {
      logger.error('Auto-improvement error:', error)
    }
  }, intervalMs)

  logger.info('Auto-improvement started', { intervalMs })
}
