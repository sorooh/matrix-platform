/**
 * Phase 8.3 - Cost Optimization Engine
 * 
 * Automatic cost optimization and recommendations
 * - Usage pattern analysis
 * - Cost reduction recommendations
 * - Resource optimization
 * - Pricing optimization
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type OptimizationType = 'tier' | 'usage' | 'resource' | 'pricing' | 'instance'
export type RecommendationSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface CostOptimization {
  id: string
  userId: string
  subscriptionId?: string
  type: OptimizationType
  currentCost: number
  potentialSavings: number
  savingsPercent: number
  recommendation: string
  description: string
  severity: RecommendationSeverity
  actionRequired: boolean
  estimatedImpact: string
  createdAt: Date
}

export interface OptimizationReport {
  id: string
  userId: string
  totalCurrentCost: number
  totalPotentialSavings: number
  optimizations: CostOptimization[]
  createdAt: Date
}

class CostOptimizer {
  private optimizations: Map<string, CostOptimization> = new Map()

  async initialize() {
    logInfo('Initializing Cost Optimization Engine...')
    logInfo('✅ Cost Optimization Engine initialized')
  }

  // Analyze and generate optimizations
  async analyzeCostOptimization(userId: string): Promise<OptimizationReport> {
    try {
      const reportId = nanoid()
      const now = new Date()

      const { prisma } = await import('../config/database')
      
      // Get user's subscriptions
      const subscriptions = await prisma.subscription.findMany({
        where: { userId, status: 'active' }
      })

      // Get usage metrics
      const usageMetrics = await prisma.usageMetrics.findMany({
        where: {
          subscriptionId: { in: subscriptions.map(s => s.id) }
        }
      })

      // Get invoices
      const invoices = await prisma.invoice.findMany({
        where: {
          userId,
          status: 'paid',
          createdAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
          }
        }
      })

      const totalCurrentCost = invoices.reduce((sum, inv) => sum + inv.amount, 0)
      const optimizations: CostOptimization[] = []

      // Analyze each subscription
      for (const subscription of subscriptions) {
        const subscriptionUsage = usageMetrics.filter(m => m.subscriptionId === subscription.id)
        const totalUsage = subscriptionUsage.reduce((sum, m) => sum + m.requests, 0)
        const totalCost = subscriptionUsage.reduce((sum, m) => sum + m.cost, 0)

        // Tier optimization
        const tierOptimization = await this.analyzeTierOptimization(
          userId,
          subscription.id,
          subscription.tier,
          totalUsage,
          totalCost
        )
        if (tierOptimization) {
          optimizations.push(tierOptimization)
        }

        // Usage optimization
        const usageOptimization = await this.analyzeUsageOptimization(
          userId,
          subscription.id,
          subscriptionUsage
        )
        if (usageOptimization) {
          optimizations.push(usageOptimization)
        }

        // Instance optimization
        const instanceOptimization = await this.analyzeInstanceOptimization(
          userId,
          subscription.id
        )
        if (instanceOptimization) {
          optimizations.push(instanceOptimization)
        }
      }

      const totalPotentialSavings = optimizations.reduce(
        (sum, opt) => sum + opt.potentialSavings,
        0
      )

      const report: OptimizationReport = {
        id: reportId,
        userId,
        totalCurrentCost,
        totalPotentialSavings,
        optimizations,
        createdAt: now
      }

      logInfo(`✅ Generated cost optimization report ${reportId} for user ${userId}`)

      return report
    } catch (error) {
      logError(error as Error, { context: 'Analyze cost optimization' })
      throw error
    }
  }

  // Analyze tier optimization
  private async analyzeTierOptimization(
    userId: string,
    subscriptionId: string,
    currentTier: string,
    totalUsage: number,
    totalCost: number
  ): Promise<CostOptimization | null> {
    try {
      // Define tier limits
      const tierLimits: Record<string, { requests: number; cost: number }> = {
        free: { requests: 1000, cost: 0 },
        pro: { requests: 10000, cost: 50 },
        enterprise: { requests: 100000, cost: 500 }
      }

      const currentLimit = tierLimits[currentTier as keyof typeof tierLimits]
      if (!currentLimit) return null

      // Check if user is under-utilizing
      if (totalUsage < currentLimit.requests * 0.5 && currentTier !== 'free') {
        // Recommend downgrade
        const lowerTier = currentTier === 'enterprise' ? 'pro' : 'free'
        const lowerLimit = tierLimits[lowerTier as keyof typeof tierLimits]
        const savings = currentLimit.cost - lowerLimit.cost

        return {
          id: nanoid(),
          userId,
          subscriptionId,
          type: 'tier',
          currentCost: currentLimit.cost,
          potentialSavings: savings,
          savingsPercent: (savings / currentLimit.cost) * 100,
          recommendation: `Consider downgrading from ${currentTier} to ${lowerTier} tier`,
          description: `Your usage (${totalUsage} requests) is below 50% of your current tier limit (${currentLimit.requests} requests).`,
          severity: savings > 100 ? 'high' : 'medium',
          actionRequired: false,
          estimatedImpact: `Save ${savings} per month`,
          createdAt: new Date()
        }
      }

      // Check if user is over-utilizing
      if (totalUsage > currentLimit.requests * 0.9 && currentTier !== 'enterprise') {
        // Recommend upgrade for better cost efficiency
        const higherTier = currentTier === 'free' ? 'pro' : 'enterprise'
        const higherLimit = tierLimits[higherTier as keyof typeof tierLimits]
        
        // Calculate potential savings from better pricing
        const currentCostPerRequest = totalUsage > 0 ? totalCost / totalUsage : 0
        const higherCostPerRequest = higherLimit.cost / higherLimit.requests
        const savings = (currentCostPerRequest - higherCostPerRequest) * totalUsage

        if (savings > 0) {
          return {
            id: nanoid(),
            userId,
            subscriptionId,
            type: 'tier',
            currentCost: totalCost,
            potentialSavings: savings,
            savingsPercent: (savings / totalCost) * 100,
            recommendation: `Consider upgrading to ${higherTier} tier for better pricing`,
            description: `Your usage (${totalUsage} requests) exceeds 90% of your current tier limit.`,
            severity: 'medium',
            actionRequired: false,
            estimatedImpact: `Save ${savings.toFixed(2)} per month with better pricing`,
            createdAt: new Date()
          }
        }
      }

      return null
    } catch (error) {
      logError(error as Error, { context: 'Analyze tier optimization' })
      return null
    }
  }

  // Analyze usage optimization
  private async analyzeUsageOptimization(
    userId: string,
    subscriptionId: string,
    usageMetrics: any[]
  ): Promise<CostOptimization | null> {
    try {
      // Analyze usage patterns
      const peakHours: Record<number, number> = {}
      let totalPeakUsage = 0

      for (const metric of usageMetrics) {
        const hour = new Date(metric.periodStart).getHours()
        peakHours[hour] = (peakHours[hour] || 0) + metric.requests
        totalPeakUsage += metric.requests
      }

      // Find peak hours
      const sortedHours = Object.entries(peakHours)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

      // Check if usage is concentrated in peak hours
      const peakUsagePercent = sortedHours.reduce(
        (sum, [_, usage]) => sum + usage,
        0
      ) / totalPeakUsage

      if (peakUsagePercent > 0.7) {
        const avgCostPerRequest = usageMetrics.reduce(
          (sum, m) => sum + (m.cost / m.requests),
          0
        ) / usageMetrics.length

        const potentialSavings = totalPeakUsage * 0.1 * avgCostPerRequest // 10% reduction

        return {
          id: nanoid(),
          userId,
          subscriptionId,
          type: 'usage',
          currentCost: usageMetrics.reduce((sum, m) => sum + m.cost, 0),
          potentialSavings,
          savingsPercent: 10,
          recommendation: 'Distribute usage across off-peak hours',
          description: `70% of your usage is concentrated in peak hours. Consider distributing requests throughout the day.`,
          severity: 'low',
          actionRequired: false,
          estimatedImpact: `Save approximately ${potentialSavings.toFixed(2)} per month`,
          createdAt: new Date()
        }
      }

      return null
    } catch (error) {
      logError(error as Error, { context: 'Analyze usage optimization' })
      return null
    }
  }

  // Analyze instance optimization
  private async analyzeInstanceOptimization(
    userId: string,
    subscriptionId: string
  ): Promise<CostOptimization | null> {
    try {
      const { prisma } = await import('../config/database')
      
      const instances = await prisma.privateInstance.findMany({
        where: { subscriptionId, status: 'active' }
      })

      // Check for idle instances
      const idleInstances = instances.filter(inst => {
        // In production, check actual usage
        return inst.status === 'active' && inst.requests === 0
      })

      if (idleInstances.length > 0) {
        const estimatedCostPerInstance = 50 // Monthly cost per instance
        const savings = idleInstances.length * estimatedCostPerInstance

        return {
          id: nanoid(),
          userId,
          subscriptionId,
          type: 'instance',
          currentCost: instances.length * estimatedCostPerInstance,
          potentialSavings: savings,
          savingsPercent: (savings / (instances.length * estimatedCostPerInstance)) * 100,
          recommendation: `Suspend or delete ${idleInstances.length} idle instance(s)`,
          description: `You have ${idleInstances.length} instance(s) with no usage. Consider suspending them to save costs.`,
          severity: idleInstances.length > 2 ? 'high' : 'medium',
          actionRequired: false,
          estimatedImpact: `Save ${savings} per month`,
          createdAt: new Date()
        }
      }

      return null
    } catch (error) {
      logError(error as Error, { context: 'Analyze instance optimization' })
      return null
    }
  }

  // Get optimizations
  async getOptimizations(userId: string): Promise<CostOptimization[]> {
    const userOptimizations: CostOptimization[] = []
    for (const opt of this.optimizations.values()) {
      if (opt.userId === userId) {
        userOptimizations.push(opt)
      }
    }
    return userOptimizations.sort((a, b) => b.potentialSavings - a.potentialSavings)
  }
}

export const costOptimizer = new CostOptimizer()

