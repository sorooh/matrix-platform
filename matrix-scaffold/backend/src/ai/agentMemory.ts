/**
 * Agent Memory System
 * Phase 2: Real AI Agents - Agent memory and learning
 * Global-Ready Architecture
 */

import { AgentExecution, AgentType } from './agentRunner'
import { addMemory, searchMemory } from '../core/memory'
import { db } from '../core/storage'
import { logger } from '../config/logger'
import { Identifier } from '../core/schema'

export interface AgentMemory {
  agentType: AgentType
  projectId: Identifier
  context: string
  response: string
  toolsUsed: string[]
  success: boolean
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface AgentMemoryQuery {
  agentType?: AgentType
  projectId?: Identifier
  query?: string
  limit?: number
}

export class AgentMemorySystem {
  private memoryCache: Map<string, AgentMemory[]> = new Map()

  /**
   * Store agent execution in memory
   */
  async storeExecution(
    execution: AgentExecution,
    projectId: Identifier
  ): Promise<void> {
    try {
      const memory: AgentMemory = {
        agentType: execution.agentType,
        projectId,
        context: JSON.stringify(execution.context),
        response: execution.response.reasoning || execution.response.output || '',
        toolsUsed: execution.toolsUsed.map((t) => t.tool),
        success: !execution.response.error,
        timestamp: execution.timestamp,
        metadata: {
          duration: execution.duration,
          toolsCount: execution.toolsUsed.length,
          action: execution.response.action
        }
      }

      // Store in database memory
      const memoryText = this.formatMemoryText(memory)
      await addMemory(projectId, memoryText, {
        kind: 'agent-memory',
        agentType: execution.agentType,
        timestamp: memory.timestamp,
        success: memory.success,
        toolsUsed: memory.toolsUsed
      })

      // Store in cache
      const cacheKey = `${projectId}:${execution.agentType}`
      const cache = this.memoryCache.get(cacheKey) || []
      cache.push(memory)
      this.memoryCache.set(cacheKey, cache.slice(-50)) // Keep last 50

      logger.info(`Agent memory stored: ${execution.agentType}`, {
        projectId,
        success: memory.success
      })
    } catch (error: any) {
      logger.error('Failed to store agent memory:', error)
    }
  }

  /**
   * Retrieve agent memory
   */
  async retrieveMemory(query: AgentMemoryQuery): Promise<AgentMemory[]> {
    try {
      const projectId = query.projectId || '__org__'
      const queryText = query.query || ''
      const limit = query.limit || 10

      // Search in memory
      const results = await searchMemory(projectId, queryText, limit * 2)

      // Filter by agent type if specified
      const filtered = results
        .filter((r) => {
          if (query.agentType) {
            const metadata = r.record.metadata as any
            return metadata?.agentType === query.agentType
          }
          return true
        })
        .slice(0, limit)

      // Convert to AgentMemory format
      const memories: AgentMemory[] = filtered.map((r) => {
        const metadata = r.record.metadata as any
        return {
          agentType: metadata?.agentType || 'morpheus',
          projectId: r.record.projectId,
          context: '',
          response: r.record.text,
          toolsUsed: metadata?.toolsUsed || [],
          success: metadata?.success !== false,
          timestamp: metadata?.timestamp || r.record.createdAt,
          metadata: metadata
        }
      })

      return memories
    } catch (error: any) {
      logger.error('Failed to retrieve agent memory:', error)
      return []
    }
  }

  /**
   * Get agent statistics
   */
  async getAgentStats(
    projectId: Identifier,
    agentType?: AgentType
  ): Promise<{
    total: number
    success: number
    failure: number
    avgDuration: number
    toolsUsed: Record<string, number>
  }> {
    try {
      const memories = await this.retrieveMemory({ projectId, agentType })

      const stats = {
        total: memories.length,
        success: memories.filter((m) => m.success).length,
        failure: memories.filter((m) => !m.success).length,
        avgDuration: 0,
        toolsUsed: {} as Record<string, number>
      }

      let totalDuration = 0
      for (const memory of memories) {
        const duration = (memory.metadata?.duration as number) || 0
        totalDuration += duration

        for (const tool of memory.toolsUsed) {
          stats.toolsUsed[tool] = (stats.toolsUsed[tool] || 0) + 1
        }
      }

      stats.avgDuration = stats.total > 0 ? totalDuration / stats.total : 0

      return stats
    } catch (error: any) {
      logger.error('Failed to get agent stats:', error)
      return {
        total: 0,
        success: 0,
        failure: 0,
        avgDuration: 0,
        toolsUsed: {}
      }
    }
  }

  /**
   * Learn from past executions
   */
  async learnFromHistory(
    projectId: Identifier,
    agentType: AgentType
  ): Promise<{
    improvements: string[]
    patterns: Record<string, number>
    recommendations: string[]
  }> {
    try {
      const memories = await this.retrieveMemory({ projectId, agentType })

      const improvements: string[] = []
      const patterns: Record<string, number> = {}
      const recommendations: string[] = []

      // Analyze patterns
      for (const memory of memories) {
        // Track tool usage patterns
        for (const tool of memory.toolsUsed) {
          patterns[`tool:${tool}`] = (patterns[`tool:${tool}`] || 0) + 1
        }

        // Track success patterns
        patterns[`success:${memory.success}`] =
          (patterns[`success:${memory.success}`] || 0) + 1
      }

      // Generate improvements
      const successRate = memories.filter((m) => m.success).length / memories.length
      if (successRate < 0.8 && memories.length > 5) {
        improvements.push('Success rate is below 80%, review agent prompts and tool usage')
      }

      // Generate recommendations
      const mostUsedTool = Object.entries(patterns)
        .filter(([k]) => k.startsWith('tool:'))
        .sort(([, a], [, b]) => b - a)[0]

      if (mostUsedTool) {
        recommendations.push(
          `Most used tool: ${mostUsedTool[0].replace('tool:', '')}, consider optimizing its usage`
        )
      }

      return {
        improvements,
        patterns,
        recommendations
      }
    } catch (error: any) {
      logger.error('Failed to learn from history:', error)
      return {
        improvements: [],
        patterns: {},
        recommendations: []
      }
    }
  }

  private formatMemoryText(memory: AgentMemory): string {
    const lines: string[] = []
    lines.push(`Agent: ${memory.agentType}`)
    lines.push(`Project: ${memory.projectId}`)
    lines.push(`Context: ${memory.context}`)
    lines.push(`Response: ${memory.response}`)
    lines.push(`Tools: ${memory.toolsUsed.join(', ')}`)
    lines.push(`Success: ${memory.success}`)
    lines.push(`Timestamp: ${memory.timestamp}`)
    return lines.join('\n')
  }

  /**
   * Clear cache
   */
  clearCache(projectId?: Identifier): void {
    if (projectId) {
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(`${projectId}:`)) {
          this.memoryCache.delete(key)
        }
      }
    } else {
      this.memoryCache.clear()
    }
    logger.info('Agent memory cache cleared', { projectId })
  }
}

// Global Agent Memory System
export const agentMemory = new AgentMemorySystem()

