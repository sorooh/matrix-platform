/**
 * Self-Evolving System
 * Global-Ready Architecture with auto-learning and improvement
 */

import { logger } from '../config/logger'
import { db } from './storage'
import { searchMemory, addMemory } from './memory'
import { graph } from './graph'
import { kpis } from './suig'
import { agents } from '../ai/agents'

export interface EvolutionInsight {
  type: 'performance' | 'architecture' | 'code_quality' | 'user_feedback'
  insight: string
  recommendation: string
  confidence: number
  timestamp: string
}

export async function analyzeSystemEvolution(): Promise<EvolutionInsight[]> {
  try {
    const insights: EvolutionInsight[] = []

    // Analyze KPIs for performance insights
    const kpiData = await kpis()
    if (kpiData.jobs.successRate < 0.8) {
      insights.push({
        type: 'performance',
        insight: `Job success rate is ${(kpiData.jobs.successRate * 100).toFixed(1)}%`,
        recommendation: 'Review failed jobs and improve error handling',
        confidence: 0.9,
        timestamp: new Date().toISOString()
      })
    }

    // Analyze memory patterns for architecture insights
    const allProjects = await db.listProjects()
    if (allProjects.length > 10) {
      const graphSummary = await graph.summary()
      if (graphSummary.totalEdges / allProjects.length < 5) {
        insights.push({
          type: 'architecture',
          insight: 'Projects have low graph connectivity',
          recommendation: 'Improve project relationships and dependencies',
          confidence: 0.7,
          timestamp: new Date().toISOString()
        })
      }
    }

    // Use AI agent for code quality analysis
    try {
      const codeQualityQuery = 'Analyze code quality and suggest improvements'
      const analysis = await agents.morpheus.analyzeProject('__org__', codeQualityQuery)
      
      insights.push({
        type: 'code_quality',
        insight: 'AI-generated code quality analysis',
        recommendation: analysis,
        confidence: 0.8,
        timestamp: new Date().toISOString()
      })

      // Store insight in memory
      await addMemory('__org__', `Evolution insight: ${analysis}`, {
        kind: 'evolution',
        source: 'self-evolving',
        type: 'code_quality'
      })
    } catch (error) {
      logger.warn('Failed to generate AI evolution insight:', error)
    }

    return insights
  } catch (error) {
    logger.error('Failed to analyze system evolution:', error)
    return []
  }
}

export async function applyEvolutionInsights(insights: EvolutionInsight[]): Promise<void> {
  try {
    for (const insight of insights) {
      if (insight.confidence < 0.7) {
        logger.debug('Skipping low-confidence insight', { insight })
        continue
      }

      // Store insight in org memory
      await addMemory('__org__', `Evolution: ${insight.insight} - ${insight.recommendation}`, {
        kind: 'evolution',
        type: insight.type,
        confidence: insight.confidence
      })

      logger.info('Applied evolution insight', {
        type: insight.type,
        confidence: insight.confidence
      })
    }
  } catch (error) {
    logger.error('Failed to apply evolution insights:', error)
  }
}

export async function evolveSystem(): Promise<void> {
  try {
    logger.info('Starting system evolution analysis...')
    
    const insights = await analyzeSystemEvolution()
    
    if (insights.length > 0) {
      logger.info(`Generated ${insights.length} evolution insights`)
      await applyEvolutionInsights(insights)
    } else {
      logger.info('No evolution insights generated')
    }
  } catch (error) {
    logger.error('System evolution failed:', error)
  }
}

