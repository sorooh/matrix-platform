/**
 * Phase 8.5 - AI Reputation & Ranking System
 * 
 * Automatic reputation tracking for AIs
 * - Performance-based rating
 * - Accuracy tracking
 * - User satisfaction metrics
 * - Automatic ranking and suspension
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export interface AIReputation {
  id: string
  aiId: string
  rating: number // 0-5
  accuracy: number // 0-100
  performance: number // 0-100
  userSatisfaction: number // 0-100
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  averageLatency: number // milliseconds
  rank: number
  status: 'active' | 'suspended' | 'deprecated'
  lastUpdated: Date
}

class AIReputationManager {
  private reputations: Map<string, AIReputation> = new Map()

  async initialize() {
    logInfo('Initializing AI Reputation & Ranking System...')
    logInfo('✅ AI Reputation & Ranking System initialized')
  }

  async updateReputation(
    aiId: string,
    success: boolean,
    latency: number,
    accuracy?: number
  ): Promise<AIReputation> {
    try {
      let reputation = this.reputations.get(aiId)
      
      if (!reputation) {
        reputation = await this.createReputation(aiId)
      }

      reputation.totalCalls++
      if (success) {
        reputation.successfulCalls++
      } else {
        reputation.failedCalls++
      }

      // Update metrics
      const successRate = (reputation.successfulCalls / reputation.totalCalls) * 100
      reputation.performance = successRate
      reputation.accuracy = accuracy || reputation.accuracy

      // Calculate average latency
      const totalLatency = reputation.averageLatency * (reputation.totalCalls - 1) + latency
      reputation.averageLatency = totalLatency / reputation.totalCalls

      // Calculate rating
      reputation.rating = this.calculateRating(reputation)

      // Update rank
      await this.updateRanking()

      reputation.lastUpdated = new Date()

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.aIReputation.upsert({
          where: { aiId },
          create: {
            id: nanoid(),
            aiId,
            rating: reputation.rating,
            accuracy: reputation.accuracy,
            performance: reputation.performance,
            userSatisfaction: reputation.userSatisfaction,
            totalCalls: reputation.totalCalls,
            successfulCalls: reputation.successfulCalls,
            failedCalls: reputation.failedCalls,
            averageLatency: reputation.averageLatency,
            rank: reputation.rank,
            status: reputation.status
          },
          update: {
            rating: reputation.rating,
            accuracy: reputation.accuracy,
            performance: reputation.performance,
            userSatisfaction: reputation.userSatisfaction,
            totalCalls: reputation.totalCalls,
            successfulCalls: reputation.successfulCalls,
            failedCalls: reputation.failedCalls,
            averageLatency: reputation.averageLatency,
            rank: reputation.rank,
            status: reputation.status,
            lastUpdated: reputation.lastUpdated
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Update reputation in database' })
      }

      this.reputations.set(aiId, reputation)

      // Check for suspension
      if (reputation.performance < 50 || reputation.rating < 2.0) {
        await this.suspendAI(aiId)
      }

      return reputation
    } catch (error) {
      logError(error as Error, { context: 'Update reputation' })
      throw error
    }
  }

  private async createReputation(aiId: string): Promise<AIReputation> {
    const reputationId = nanoid()
    const now = new Date()

    const reputation: AIReputation = {
      id: reputationId,
      aiId,
      rating: 5.0,
      accuracy: 100,
      performance: 100,
      userSatisfaction: 100,
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageLatency: 0,
      rank: 0,
      status: 'active',
      lastUpdated: now
    }

    this.reputations.set(aiId, reputation)
    return reputation
  }

  private calculateRating(reputation: AIReputation): number {
    const performanceWeight = 0.4
    const accuracyWeight = 0.3
    const satisfactionWeight = 0.3

    const baseRating = (
      (reputation.performance / 100) * performanceWeight +
      (reputation.accuracy / 100) * accuracyWeight +
      (reputation.userSatisfaction / 100) * satisfactionWeight
    ) * 5

    return Math.max(0, Math.min(5, baseRating))
  }

  private async updateRanking(): Promise<void> {
    const reputations = Array.from(this.reputations.values())
      .filter(r => r.status === 'active')
      .sort((a, b) => {
        const scoreA = a.rating * 0.4 + (a.performance / 100) * 0.3 + (a.accuracy / 100) * 0.3
        const scoreB = b.rating * 0.4 + (b.performance / 100) * 0.3 + (b.accuracy / 100) * 0.3
        return scoreB - scoreA
      })

    for (let i = 0; i < reputations.length; i++) {
      reputations[i].rank = i + 1
      this.reputations.set(reputations[i].aiId, reputations[i])
    }
  }

  private async suspendAI(aiId: string): Promise<void> {
    const reputation = this.reputations.get(aiId)
    if (!reputation) return

    reputation.status = 'suspended'
    this.reputations.set(aiId, reputation)

    logInfo(`⚠️ Suspended AI ${aiId} due to poor performance`)
  }

  async getReputation(aiId: string): Promise<AIReputation | null> {
    return this.reputations.get(aiId) || null
  }

  async getTopAIs(limit: number = 10): Promise<AIReputation[]> {
    const reputations = Array.from(this.reputations.values())
      .filter(r => r.status === 'active')
      .sort((a, b) => b.rank - a.rank)
      .slice(0, limit)
    
    return reputations
  }
}

export const aiReputationManager = new AIReputationManager()

