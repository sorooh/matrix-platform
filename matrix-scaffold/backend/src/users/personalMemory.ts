/**
 * Personal AI Memory System
 * Phase 4: User Experience & Interaction
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { prisma } from '../config/database'
import { embed } from '../core/memoryProvider'
import { hashSensitiveData } from '../enterprise/encryption'

export interface PersonalMemory {
  id: string
  userId: string
  text: string
  vector?: number[]
  metadata?: Record<string, unknown>
  createdAt: Date
}

export interface SmartSuggestion {
  id: string
  userId: string
  type: 'action' | 'reminder' | 'insight' | 'recommendation'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  actionUrl?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

export class PersonalAIMemory {
  /**
   * Add memory for user
   */
  async addMemory(
    userId: string,
    text: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; memory?: PersonalMemory; error?: string }> {
    try {
      // Generate vector embedding
      const vector = embed(text)

      // Store in database
      const memory = await prisma.userMemory.create({
        data: {
          userId,
          text,
          vector: vector.length > 0 ? `[${vector.join(',')}]` : undefined,
          metadata: metadata || {},
        },
      })

      logger.info(`Personal memory added: ${memory.id}`, { userId, textLength: text.length })

      return {
        success: true,
        memory: {
          id: memory.id,
          userId: memory.userId,
          text: memory.text,
          metadata: memory.metadata as Record<string, unknown>,
          createdAt: memory.createdAt,
        },
      }
    } catch (error: any) {
      logger.error('Add personal memory failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Search user memory
   */
  async searchMemory(
    userId: string,
    query: string,
    topK: number = 5
  ): Promise<Array<{ score: number; memory: PersonalMemory }>> {
    try {
      // Generate query vector
      const queryVector = embed(query)

      // Search in database (simplified - in production, use pgvector similarity search)
      const memories = await prisma.userMemory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: topK * 2, // Get more to filter
      })

      // Simple cosine similarity (simplified - in production, use pgvector)
      const scored = memories
        .map((m) => {
          const textMatch = m.text.toLowerCase().includes(query.toLowerCase()) ? 0.5 : 0
          const vectorMatch = m.vector ? 0.3 : 0 // Simplified
          return {
            score: textMatch + vectorMatch,
            memory: {
              id: m.id,
              userId: m.userId,
              text: m.text,
              metadata: m.metadata as Record<string, unknown>,
              createdAt: m.createdAt,
            },
          }
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)

      return scored
    } catch (error: any) {
      logger.error('Search personal memory failed:', error)
      return []
    }
  }

  /**
   * Learn from user interaction
   */
  async learnFromInteraction(
    userId: string,
    interaction: {
      type: 'chat' | 'command' | 'action' | 'preference'
      content: string
      metadata?: Record<string, unknown>
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const memoryText = `User ${interaction.type}: ${interaction.content}`
      const memoryMetadata = {
        type: interaction.type,
        ...interaction.metadata,
        learnedAt: new Date().toISOString(),
      }

      const result = await this.addMemory(userId, memoryText, memoryMetadata)

      if (result.success) {
        logger.info(`Learned from interaction: ${interaction.type}`, { userId })
      }

      return result
    } catch (error: any) {
      logger.error('Learn from interaction failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Generate smart suggestions
   */
  async generateSuggestions(
    userId: string,
    context?: string
  ): Promise<{ success: boolean; suggestions?: SmartSuggestion[]; error?: string }> {
    try {
      const suggestions: SmartSuggestion[] = []

      // Get user memory context
      const recentMemories = await prisma.userMemory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      // Analyze patterns and generate suggestions
      const chatCount = recentMemories.filter((m) => {
        const metadata = m.metadata as any
        return metadata?.type === 'chat'
      }).length

      const actionCount = recentMemories.filter((m) => {
        const metadata = m.metadata as any
        return metadata?.type === 'action'
      }).length

      // Generate suggestions based on patterns
      if (chatCount > 5) {
        suggestions.push({
          id: `suggestion-${Date.now()}-1`,
          userId,
          type: 'insight',
          title: 'Active Chat User',
          description: 'You\'ve been very active in chat. Consider exploring advanced features.',
          priority: 'medium',
          actionUrl: '/chat',
          createdAt: new Date(),
        })
      }

      if (actionCount === 0) {
        suggestions.push({
          id: `suggestion-${Date.now()}-2`,
          userId,
          type: 'recommendation',
          title: 'Try Actions',
          description: 'Try using actions to automate your workflows.',
          priority: 'high',
          actionUrl: '/automation',
          createdAt: new Date(),
        })
      }

      // Context-based suggestions
      if (context) {
        const contextMemories = await this.searchMemory(userId, context, 3)
        if (contextMemories.length > 0) {
          suggestions.push({
            id: `suggestion-${Date.now()}-3`,
            userId,
            type: 'reminder',
            title: 'Related Context',
            description: `Found ${contextMemories.length} related memories. Review them?`,
            priority: 'low',
            actionUrl: '/memory',
            metadata: { relatedMemories: contextMemories.length },
            createdAt: new Date(),
          })
        }
      }

      logger.info(`Generated ${suggestions.length} suggestions`, { userId })

      return { success: true, suggestions }
    } catch (error: any) {
      logger.error('Generate suggestions failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get user memory stats
   */
  async getMemoryStats(userId: string): Promise<{
    total: number
    byType: Record<string, number>
    recentActivity: number
  }> {
    try {
      const memories = await prisma.userMemory.findMany({
        where: { userId },
      })

      const byType: Record<string, number> = {}
      for (const m of memories) {
        const metadata = m.metadata as any
        const type = metadata?.type || 'generic'
        byType[type] = (byType[type] || 0) + 1
      }

      const recentActivity = memories.filter((m) => {
        const daysAgo = (Date.now() - m.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        return daysAgo <= 7
      }).length

      return {
        total: memories.length,
        byType,
        recentActivity,
      }
    } catch (error: any) {
      logger.error('Get memory stats failed:', error)
      return { total: 0, byType: {}, recentActivity: 0 }
    }
  }

  /**
   * Get user memory timeline
   */
  async getMemoryTimeline(userId: string, limit: number = 50): Promise<PersonalMemory[]> {
    try {
      const memories = await prisma.userMemory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

      return memories.map((m) => ({
        id: m.id,
        userId: m.userId,
        text: m.text,
        metadata: m.metadata as Record<string, unknown>,
        createdAt: m.createdAt,
      }))
    } catch (error: any) {
      logger.error('Get memory timeline failed:', error)
      return []
    }
  }

  /**
   * Delete memory
   */
  async deleteMemory(memoryId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const memory = await prisma.userMemory.findUnique({
        where: { id: memoryId },
      })

      if (!memory || memory.userId !== userId) {
        return { success: false, error: 'Memory not found or access denied' }
      }

      await prisma.userMemory.delete({
        where: { id: memoryId },
      })

      logger.info(`Memory deleted: ${memoryId}`, { userId })

      return { success: true }
    } catch (error: any) {
      logger.error('Delete memory failed:', error)
      return { success: false, error: error.message }
    }
  }
}

// Global Personal AI Memory
export const personalAIMemory = new PersonalAIMemory()

