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
