/**
 * Referral & Reward System
 * Phase 4: User Experience & Interaction
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { prisma } from '../config/database'
import crypto from 'crypto'

export interface ReferralInfo {
  id: string
  referrerId: string
  referredUserId?: string
  token: string
  status: 'pending' | 'completed' | 'rewarded'
  pointsEarned: number
  createdAt: Date
  completedAt?: Date
}

export interface UserPoints {
  userId: string
  totalPoints: number
  aiCredits: number
  tier: 'bronze' | 'silver' | 'gold' | 'diamond'
  referralsCount: number
}

export interface Tier {
  name: 'bronze' | 'silver' | 'gold' | 'diamond'
  minReferrals: number
  minPoints: number
  benefits: string[]
  aiCreditsMultiplier: number
}

const TIERS: Tier[] = [
  {
    name: 'bronze',
    minReferrals: 0,
    minPoints: 0,
    benefits: ['Basic support', '100 AI credits/month'],
    aiCreditsMultiplier: 1.0,
  },
  {
    name: 'silver',
    minReferrals: 5,
    minPoints: 500,
    benefits: ['Priority support', '500 AI credits/month', 'Early access'],
    aiCreditsMultiplier: 1.5,
  },
  {
    name: 'gold',
    minReferrals: 20,
    minPoints: 2000,
    benefits: ['Premium support', '2000 AI credits/month', 'Beta features', 'Custom AI agent'],
    aiCreditsMultiplier: 2.0,
  },
  {
    name: 'diamond',
    minReferrals: 50,
    minPoints: 10000,
    benefits: ['VIP support', 'Unlimited AI credits', 'All features', 'Dedicated account manager'],
    aiCreditsMultiplier: 3.0,
  },
]

export class ReferralSystem {
  private readonly POINTS_PER_REFERRAL = 100
  private readonly AI_CREDITS_PER_REFERRAL = 50

  /**
   * Generate referral token for user
   */
  async generateReferralToken(userId: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        return { success: false, error: 'User not found' }
      }

      // Generate unique token
      const token = crypto.randomBytes(32).toString('hex')

      // Create referral record
      const referral = await prisma.referral.create({
        data: {
          referrerId: userId,
          token,
          status: 'pending',
        },
      })

      logger.info(`Referral token generated: ${token}`, { userId })

      return { success: true, token }
    } catch (error: any) {
      logger.error('Generate referral token failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get user referral token
   */
  async getUserReferralToken(userId: string): Promise<string | null> {
    try {
      // Find latest pending referral or create new one
      const referral = await prisma.referral.findFirst({
        where: {
          referrerId: userId,
          status: 'pending',
        },
        orderBy: { createdAt: 'desc' },
      })

      if (referral) {
        return referral.token
      }

      // Create new referral token
      const result = await this.generateReferralToken(userId)
      return result.token || null
    } catch (error: any) {
      logger.error('Get user referral token failed:', error)
      return null
    }
  }

  /**
   * Complete referral (when new user signs up with token)
   */
  async completeReferral(
    token: string,
    newUserId: string
  ): Promise<{ success: boolean; pointsEarned?: number; error?: string }> {
    try {
      // Find referral
      const referral = await prisma.referral.findUnique({
        where: { token },
      })

      if (!referral) {
        return { success: false, error: 'Invalid referral token' }
      }

      if (referral.status !== 'pending') {
        return { success: false, error: 'Referral already completed' }
      }

      if (referral.referrerId === newUserId) {
        return { success: false, error: 'Cannot refer yourself' }
      }

      // Update referral
      const updatedReferral = await prisma.referral.update({
        where: { id: referral.id },
        data: {
          referredUserId: newUserId,
          status: 'completed',
          completedAt: new Date(),
        },
      })

      // Award points to referrer
      const pointsResult = await this.awardPoints(referral.referrerId, this.POINTS_PER_REFERRAL)

      // Update referral with points
      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          pointsEarned: pointsResult.pointsEarned || 0,
          status: 'rewarded',
        },
      })

      // Award AI credits to referrer
      await this.awardAICredits(referral.referrerId, this.AI_CREDITS_PER_REFERRAL)

      // Award welcome bonus to new user
      await this.awardAICredits(newUserId, 25) // Welcome bonus

      logger.info(`Referral completed: ${token}`, {
        referrerId: referral.referrerId,
        newUserId,
        pointsEarned: pointsResult.pointsEarned,
      })

      return {
        success: true,
        pointsEarned: pointsResult.pointsEarned,
      }
    } catch (error: any) {
      logger.error('Complete referral failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Award points to user
   */
  async awardPoints(userId: string, points: number): Promise<{ success: boolean; pointsEarned?: number; error?: string }> {
    try {
      // Get or create user points
      let userPoints = await prisma.userPoints.findUnique({
        where: { userId },
      })

      if (!userPoints) {
        userPoints = await prisma.userPoints.create({
          data: {
            userId,
            totalPoints: points,
            aiCredits: 0,
            tier: 'bronze',
            referralsCount: 0,
          },
        })
      } else {
        userPoints = await prisma.userPoints.update({
          where: { userId },
          data: {
            totalPoints: userPoints.totalPoints + points,
          },
        })
      }

      // Check tier upgrade
      await this.checkTierUpgrade(userId)

      logger.info(`Points awarded: ${points}`, { userId, totalPoints: userPoints.totalPoints })

      return { success: true, pointsEarned: userPoints.totalPoints }
    } catch (error: any) {
      logger.error('Award points failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Award AI credits to user
   */
  async awardAICredits(userId: string, credits: number): Promise<{ success: boolean; totalCredits?: number; error?: string }> {
    try {
      // Get or create user points
      let userPoints = await prisma.userPoints.findUnique({
        where: { userId },
      })

      if (!userPoints) {
        userPoints = await prisma.userPoints.create({
          data: {
            userId,
            totalPoints: 0,
            aiCredits: credits,
            tier: 'bronze',
            referralsCount: 0,
          },
        })
      } else {
        userPoints = await prisma.userPoints.update({
          where: { userId },
          data: {
            aiCredits: userPoints.aiCredits + credits,
          },
        })
      }

      logger.info(`AI credits awarded: ${credits}`, { userId, totalCredits: userPoints.aiCredits })

      return { success: true, totalCredits: userPoints.aiCredits }
    } catch (error: any) {
      logger.error('Award AI credits failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Check and upgrade user tier
   */
  async checkTierUpgrade(userId: string): Promise<{ success: boolean; newTier?: string; error?: string }> {
    try {
      const userPoints = await prisma.userPoints.findUnique({
        where: { userId },
      })

      if (!userPoints) {
        return { success: false, error: 'User points not found' }
      }

      // Get referrals count
      const referralsCount = await prisma.referral.count({
        where: {
          referrerId: userId,
          status: { in: ['completed', 'rewarded'] },
        },
      })

      // Update referrals count
      await prisma.userPoints.update({
        where: { userId },
        data: { referralsCount },
      })

      // Determine new tier
      let newTier = userPoints.tier
      for (const tier of TIERS.reverse()) {
        if (referralsCount >= tier.minReferrals && userPoints.totalPoints >= tier.minPoints) {
          newTier = tier.name
          break
        }
      }

      // Upgrade if tier changed
      if (newTier !== userPoints.tier) {
        await prisma.userPoints.update({
          where: { userId },
          data: { tier: newTier },
        })

        logger.info(`Tier upgraded: ${userPoints.tier} -> ${newTier}`, { userId })
      }

      return { success: true, newTier }
    } catch (error: any) {
      logger.error('Check tier upgrade failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get user points
   */
  async getUserPoints(userId: string): Promise<UserPoints | null> {
    try {
      const userPoints = await prisma.userPoints.findUnique({
        where: { userId },
      })

      if (!userPoints) {
        return null
      }

      return {
        userId: userPoints.userId,
        totalPoints: userPoints.totalPoints,
        aiCredits: userPoints.aiCredits,
        tier: userPoints.tier as any,
        referralsCount: userPoints.referralsCount,
      }
    } catch (error: any) {
      logger.error('Get user points failed:', error)
      return null
    }
  }

  /**
   * Get referral stats
   */
  async getReferralStats(userId: string): Promise<{
    totalReferrals: number
    completedReferrals: number
    pendingReferrals: number
    totalPointsEarned: number
    currentTier: string
    nextTier?: Tier
  }> {
    try {
      const referrals = await prisma.referral.findMany({
        where: { referrerId: userId },
      })

      const userPoints = await this.getUserPoints(userId)

      const completedReferrals = referrals.filter((r) => r.status === 'completed' || r.status === 'rewarded').length
      const pendingReferrals = referrals.filter((r) => r.status === 'pending').length
      const totalPointsEarned = referrals.reduce((sum, r) => sum + r.pointsEarned, 0)

      // Find next tier
      const currentTier = userPoints?.tier || 'bronze'
      const currentTierIndex = TIERS.findIndex((t) => t.name === currentTier)
      const nextTier = currentTierIndex < TIERS.length - 1 ? TIERS[currentTierIndex + 1] : undefined

      return {
        totalReferrals: referrals.length,
        completedReferrals,
        pendingReferrals,
        totalPointsEarned,
        currentTier,
        nextTier,
      }
    } catch (error: any) {
      logger.error('Get referral stats failed:', error)
      return {
        totalReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        totalPointsEarned: 0,
        currentTier: 'bronze',
      }
    }
  }

  /**
   * Get referrals list
   */
  async getReferrals(userId: string, limit: number = 50): Promise<ReferralInfo[]> {
    try {
      const referrals = await prisma.referral.findMany({
        where: { referrerId: userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

      return referrals.map((r) => ({
        id: r.id,
        referrerId: r.referrerId,
        referredUserId: r.referredUserId || undefined,
        token: r.token,
        status: r.status as any,
        pointsEarned: r.pointsEarned,
        createdAt: r.createdAt,
        completedAt: r.completedAt || undefined,
      }))
    } catch (error: any) {
      logger.error('Get referrals failed:', error)
      return []
    }
  }
}

// Global Referral System
export const referralSystem = new ReferralSystem()

