/**
 * Personal Companion AI System
 * Phase 4: User Experience & Interaction
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { prisma } from '../config/database'
import { agents } from '../ai/agents'
import { personalAIMemory } from './personalMemory'

export interface CompanionAgent {
  id: string
  userId: string
  name: string
  personality: {
    tone: 'friendly' | 'professional' | 'casual' | 'formal'
    style: 'concise' | 'detailed' | 'conversational'
    preferences: string[]
  }
  memory: {
    learnedPreferences: string[]
    commonTasks: string[]
    userHabits: Record<string, unknown>
  }
  stats: {
    totalInteractions: number
    averageResponseTime: number
    userSatisfaction: number
    lastInteractionAt?: Date
  }
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export class PersonalCompanionAI {
  /**
   * Get or create companion agent for user
   */
  async getCompanion(userId: string): Promise<CompanionAgent | null> {
    try {
      let companion = await prisma.companionAgent.findUnique({
        where: { userId },
      })

      if (!companion) {
        // Create default companion
        companion = await prisma.companionAgent.create({
          data: {
            userId,
            name: 'My Companion',
            personality: {
              tone: 'friendly',
              style: 'conversational',
              preferences: [],
            },
            memory: {
              learnedPreferences: [],
              commonTasks: [],
              userHabits: {},
            },
            stats: {
              totalInteractions: 0,
              averageResponseTime: 0,
              userSatisfaction: 0,
            },
            enabled: true,
          },
        })
      }

      return {
        id: companion.id,
        userId: companion.userId,
        name: companion.name,
        personality: companion.personality as any,
        memory: companion.memory as any,
        stats: companion.stats as any,
        enabled: companion.enabled,
        createdAt: companion.createdAt,
        updatedAt: companion.updatedAt,
      }
    } catch (error: any) {
      logger.error('Get companion failed:', error)
      return null
    }
  }

  /**
   * Chat with companion
   */
  async chat(
    userId: string,
    message: string,
    context?: Record<string, unknown>
  ): Promise<{ success: boolean; reply?: string; error?: string }> {
    try {
      const companion = await this.getCompanion(userId)

      if (!companion || !companion.enabled) {
        return { success: false, error: 'Companion not available' }
      }

      // Get user memory context
      const memories = await personalAIMemory.searchMemory(userId, message, 3)
      const memoryContext = memories.map((m) => m.memory.text).join('\n')

      // Build system prompt with personality
      const systemPrompt = this.buildSystemPrompt(companion, memoryContext)

      // Use Morpheus agent for chat (or create dedicated companion agent)
      const agent = (agents as any).morpheus || agents.morpheus

      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user' as const,
          content: message,
        },
      ]

      const response = await agent.chat(messages)

      // Learn from interaction
      await personalAIMemory.learnFromInteraction(userId, {
        type: 'chat',
        content: message,
        metadata: { companion: true, response: response.content },
      })

      // Update stats
      await this.updateStats(userId, {
        totalInteractions: companion.stats.totalInteractions + 1,
        lastInteractionAt: new Date(),
      })

      logger.info(`Companion chat: ${userId}`, { messageLength: message.length })

      return {
        success: true,
        reply: response.content,
      }
    } catch (error: any) {
      logger.error('Companion chat failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Build system prompt with personality
   */
  private buildSystemPrompt(companion: CompanionAgent, memoryContext: string): string {
    const tone = companion.personality.tone
    const style = companion.personality.style
    const preferences = companion.personality.preferences.join(', ')

    let prompt = `You are ${companion.name}, a personal AI companion. `
    prompt += `Your tone is ${tone} and your style is ${style}. `

    if (preferences) {
      prompt += `You prefer: ${preferences}. `
    }

    if (memoryContext) {
      prompt += `\n\nUser context:\n${memoryContext}\n`
    }

    prompt += '\nBe helpful, friendly, and personalized based on the user\'s context and preferences.'

    return prompt
  }

  /**
   * Update companion personality
   */
  async updatePersonality(
    userId: string,
    personality: Partial<CompanionAgent['personality']>
  ): Promise<{ success: boolean; companion?: CompanionAgent; error?: string }> {
    try {
      const companion = await this.getCompanion(userId)

      if (!companion) {
        return { success: false, error: 'Companion not found' }
      }

      const updated = await prisma.companionAgent.update({
        where: { userId },
        data: {
          personality: {
            ...companion.personality,
            ...personality,
          },
        },
      })

      logger.info(`Companion personality updated: ${userId}`, { personality })

      return {
        success: true,
        companion: {
          id: updated.id,
          userId: updated.userId,
          name: updated.name,
          personality: updated.personality as any,
          memory: updated.memory as any,
          stats: updated.stats as any,
          enabled: updated.enabled,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      }
    } catch (error: any) {
      logger.error('Update companion personality failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update companion name
   */
  async updateName(userId: string, name: string): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.companionAgent.update({
        where: { userId },
        data: { name },
      })

      logger.info(`Companion name updated: ${userId}`, { name })

      return { success: true }
    } catch (error: any) {
      logger.error('Update companion name failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Toggle companion
   */
  async toggleCompanion(userId: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.companionAgent.update({
        where: { userId },
        data: { enabled },
      })

      logger.info(`Companion toggled: ${userId}`, { enabled })

      return { success: true }
    } catch (error: any) {
      logger.error('Toggle companion failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update stats
   */
  private async updateStats(userId: string, updates: Partial<CompanionAgent['stats']>): Promise<void> {
    try {
      const companion = await this.getCompanion(userId)
      if (!companion) return

      await prisma.companionAgent.update({
        where: { userId },
        data: {
          stats: {
            ...companion.stats,
            ...updates,
          },
        },
      })
    } catch (error: any) {
      logger.error('Update companion stats failed:', error)
    }
  }

  /**
   * Learn from user feedback
   */
  async learnFromFeedback(userId: string, feedback: { positive: boolean; message?: string }): Promise<{ success: boolean }> {
    try {
      const companion = await this.getCompanion(userId)
      if (!companion) {
        return { success: false }
      }

      // Update satisfaction
      const satisfaction = companion.stats.userSatisfaction
      const newSatisfaction = feedback.positive
        ? Math.min(100, satisfaction + 5)
        : Math.max(0, satisfaction - 2)

      await this.updateStats(userId, {
        userSatisfaction: newSatisfaction,
      })

      // Learn from feedback message
      if (feedback.message) {
        await personalAIMemory.learnFromInteraction(userId, {
          type: 'preference',
          content: feedback.message,
          metadata: { positive: feedback.positive },
        })
      }

      logger.info(`Companion learned from feedback: ${userId}`, { positive: feedback.positive })

      return { success: true }
    } catch (error: any) {
      logger.error('Learn from feedback failed:', error)
      return { success: false }
    }
  }

  /**
   * Get companion stats
   */
  async getStats(userId: string): Promise<CompanionAgent['stats'] | null> {
    try {
      const companion = await this.getCompanion(userId)
      return companion?.stats || null
    } catch (error: any) {
      logger.error('Get companion stats failed:', error)
      return null
    }
  }
}

// Global Personal Companion AI
export const personalCompanionAI = new PersonalCompanionAI()

