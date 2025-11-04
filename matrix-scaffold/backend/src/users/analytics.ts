/**
 * User Analytics System
 * Phase 4: User Experience & Interaction
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { prisma } from '../config/database'
import { personalAIMemory } from './personalMemory'

export interface UserAnalytics {
  userId: string
  usage: {
    totalCommands: number
    totalChats: number
    totalActions: number
    totalProjects: number
    averageResponseTime: number
  }
  performance: {
    accuracy: number
    speed: number
    satisfaction: number
  }
  progress: {
    weekly: {
      commands: number
      chats: number
      actions: number
      improvement: number
    }
    monthly: {
      commands: number
      chats: number
      actions: number
      improvement: number
    }
  }
  goals: Array<{
    id: string
    title: string
    description: string
    target: number
    current: number
    progress: number
    deadline?: Date
    status: 'active' | 'completed' | 'paused'
  }>
  trends: {
    commandsTrend: 'up' | 'down' | 'stable'
    chatsTrend: 'up' | 'down' | 'stable'
    satisfactionTrend: 'up' | 'down' | 'stable'
  }
}

export class UserAnalyticsSystem {
  /**
   * Get user analytics
   */
  async getUserAnalytics(userId: string): Promise<UserAnalytics | null> {
    try {
      // Get user activities
      const activities = await prisma.userActivity.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
      })

      // Get user projects
      const projects = await prisma.project.findMany({
        where: { userId },
      })

      // Get user memory stats
      const memoryStats = await personalAIMemory.getMemoryStats(userId)

      // Calculate usage
      const totalCommands = activities.filter((a) => a.type === 'api_call').length
      const totalChats = memoryStats.byType['chat'] || 0
      const totalActions = activities.filter((a) => a.type === 'action').length
      const totalProjects = projects.length

      // Calculate performance (simplified)
      const accuracy = 85 + Math.min(15, totalCommands / 100) // Simplified
      const speed = 90 + Math.min(10, totalChats / 50) // Simplified
      const satisfaction = 80 + Math.min(20, totalChats / 100) // Simplified

      // Calculate weekly progress
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const weeklyActivities = activities.filter((a) => a.timestamp >= weekAgo)
      const weeklyCommands = weeklyActivities.filter((a) => a.type === 'api_call').length
      const weeklyChats = weeklyActivities.filter((a) => a.type === 'action').length
      const weeklyActions = weeklyActivities.filter((a) => a.type === 'action').length

      // Calculate monthly progress
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const monthlyActivities = activities.filter((a) => a.timestamp >= monthAgo)
      const monthlyCommands = monthlyActivities.filter((a) => a.type === 'api_call').length
      const monthlyChats = monthlyActivities.filter((a) => a.type === 'action').length
      const monthlyActions = monthlyActivities.filter((a) => a.type === 'action').length

      // Calculate trends (simplified)
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      const twoWeeksActivities = activities.filter((a) => a.timestamp >= twoWeeksAgo && a.timestamp < weekAgo)
      const twoWeeksCommands = twoWeeksActivities.filter((a) => a.type === 'api_call').length

      const commandsTrend: 'up' | 'down' | 'stable' =
        weeklyCommands > twoWeeksCommands ? 'up' : weeklyCommands < twoWeeksCommands ? 'down' : 'stable'

      // Get or create goals (simplified - in production, store in database)
      const goals = await this.getUserGoals(userId)

      return {
        userId,
        usage: {
          totalCommands,
          totalChats,
          totalActions,
          totalProjects,
          averageResponseTime: 0.5, // Simplified
        },
        performance: {
          accuracy,
          speed,
          satisfaction,
        },
        progress: {
          weekly: {
            commands: weeklyCommands,
            chats: weeklyChats,
            actions: weeklyActions,
            improvement: 10, // Simplified
          },
          monthly: {
            commands: monthlyCommands,
            chats: monthlyChats,
            actions: monthlyActions,
            improvement: 25, // Simplified
          },
        },
        goals,
        trends: {
          commandsTrend,
          chatsTrend: 'stable', // Simplified
          satisfactionTrend: 'up', // Simplified
        },
      }
    } catch (error: any) {
      logger.error('Get user analytics failed:', error)
      return null
    }
  }

  /**
   * Get user goals
   */
  async getUserGoals(userId: string): Promise<UserAnalytics['goals']> {
    try {
      // Simplified - in production, store in database
      const memoryStats = await personalAIMemory.getMemoryStats(userId)

      return [
        {
          id: 'goal-1',
          title: 'Complete 100 AI Commands',
          description: 'Use AI features 100 times',
          target: 100,
          current: memoryStats.total,
          progress: Math.min(100, (memoryStats.total / 100) * 100),
          status: memoryStats.total >= 100 ? 'completed' : 'active',
        },
        {
          id: 'goal-2',
          title: 'Create 5 Projects',
          description: 'Create and manage 5 projects',
          target: 5,
          current: (await prisma.project.count({ where: { userId } })),
          progress: Math.min(100, ((await prisma.project.count({ where: { userId } })) / 5) * 100),
          status: (await prisma.project.count({ where: { userId } })) >= 5 ? 'completed' : 'active',
        },
      ]
    } catch (error: any) {
      logger.error('Get user goals failed:', error)
      return []
    }
  }

  /**
   * Create goal
   */
  async createGoal(
    userId: string,
    goal: {
      title: string
      description: string
      target: number
      deadline?: Date
    }
  ): Promise<{ success: boolean; goalId?: string; error?: string }> {
    try {
      // Simplified - in production, store in database
      const goalId = `goal-${Date.now()}`

      logger.info(`Goal created: ${goalId}`, { userId, title: goal.title })

      return { success: true, goalId }
    } catch (error: any) {
      logger.error('Create goal failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(
    userId: string,
    goalId: string,
    current: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Simplified - in production, update in database
      logger.info(`Goal progress updated: ${goalId}`, { userId, current })

      return { success: true }
    } catch (error: any) {
      logger.error('Update goal progress failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get usage stats
   */
  async getUsageStats(userId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<{
    period: string
    commands: number
    chats: number
    actions: number
    projects: number
  }> {
    try {
      const now = new Date()
      let startDate: Date

      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }

      const activities = await prisma.userActivity.findMany({
        where: {
          userId,
          timestamp: { gte: startDate },
        },
      })

      const commands = activities.filter((a) => a.type === 'api_call').length
      const chats = activities.filter((a) => a.type === 'action').length
      const actions = activities.filter((a) => a.type === 'action').length

      const projects = await prisma.project.count({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
      })

      return {
        period,
        commands,
        chats,
        actions,
        projects,
      }
    } catch (error: any) {
      logger.error('Get usage stats failed:', error)
      return {
        period,
        commands: 0,
        chats: 0,
        actions: 0,
        projects: 0,
      }
    }
  }
}

// Global User Analytics System
export const userAnalyticsSystem = new UserAnalyticsSystem()

