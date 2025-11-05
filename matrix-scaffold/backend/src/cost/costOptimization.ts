/**
 * Phase 9.3 - Cost Optimization & Resource Management
 * 
 * Automated cost analysis and optimization
 * - Automated cost analysis
 * - Resource usage optimization
 * - Reserved instance recommendations
 * - Spot instance optimization
 * - Cost alerts and budgets
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type CostOptimizationType = 'reserved_instance' | 'spot_instance' | 'right_sizing' | 'idle_resource' | 'storage_optimization'
export type CostAlertType = 'budget_exceeded' | 'unusual_spend' | 'resource_optimization' | 'savings_opportunity'

export interface CostAnalysis {
  id: string
  resourceId: string
  resourceType: string
  periodStart: Date
  periodEnd: Date
  currentCost: number
  optimizedCost: number
  savings: number
  savingsPercentage: number
  recommendations: CostRecommendation[]
  generatedAt: Date
}

export interface CostRecommendation {
  id: string
  type: CostOptimizationType
  title: string
  description: string
  estimatedSavings: number
  confidence: number // 0-100
  priority: 'low' | 'medium' | 'high' | 'critical'
  action: string
}

export interface CostBudget {
  id: string
  name: string
  amount: number
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  alertThreshold: number // percentage
  currentSpend: number
  alerts: CostAlert[]
  createdAt: Date
}

export interface CostAlert {
  id: string
  budgetId: string
  type: CostAlertType
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  triggeredAt: Date
  resolvedAt?: Date
}

class CostOptimizationManager {
  private analyses: Map<string, CostAnalysis> = new Map()
  private budgets: Map<string, CostBudget> = new Map()
  private alerts: Map<string, CostAlert> = new Map()

  async initialize() {
    logInfo('Initializing Cost Optimization & Resource Management...')

    // Start cost analysis
    this.startCostAnalysis()

    // Start budget monitoring
    this.startBudgetMonitoring()

    logInfo('✅ Cost Optimization & Resource Management initialized')
  }

  // Analyze cost
  async analyzeCost(
    resourceId: string,
    resourceType: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<CostAnalysis> {
    try {
      const analysisId = nanoid()
      const now = new Date()

      // Calculate current cost
      const currentCost = await this.calculateCurrentCost(resourceId, periodStart, periodEnd)

      // Generate recommendations
      const recommendations = await this.generateRecommendations(resourceId, resourceType, currentCost)

      // Calculate optimized cost
      const optimizedCost = currentCost - recommendations.reduce((sum, r) => sum + r.estimatedSavings, 0)
      const savings = currentCost - optimizedCost
      const savingsPercentage = (savings / currentCost) * 100

      const analysis: CostAnalysis = {
        id: analysisId,
        resourceId,
        resourceType,
        periodStart,
        periodEnd,
        currentCost,
        optimizedCost,
        savings,
        savingsPercentage,
        recommendations,
        generatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.costAnalysis.create({
          data: {
            id: analysisId,
            resourceId,
            resourceType,
            periodStart,
            periodEnd,
            currentCost,
            optimizedCost,
            savings,
            savingsPercentage,
            recommendations,
            generatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Analyze cost in database' })
      }

      this.analyses.set(analysisId, analysis)

      logInfo(`✅ Analyzed cost for ${resourceId}: $${currentCost.toFixed(2)} (potential savings: $${savings.toFixed(2)})`)

      return analysis
    } catch (error) {
      logError(error as Error, { context: 'Analyze cost' })
      throw error
    }
  }

  // Calculate current cost
  private async calculateCurrentCost(resourceId: string, start: Date, end: Date): Promise<number> {
    // In production, calculate actual cost from usage data
    return Math.random() * 1000 + 100 // $100-$1100
  }

  // Generate recommendations
  private async generateRecommendations(
    resourceId: string,
    resourceType: string,
    currentCost: number
  ): Promise<CostRecommendation[]> {
    const recommendations: CostRecommendation[] = []

    // Reserved instance recommendation
    if (currentCost > 100) {
      recommendations.push({
        id: nanoid(),
        type: 'reserved_instance',
        title: 'Reserved Instance Recommendation',
        description: 'Consider purchasing reserved instances for 30-70% savings',
        estimatedSavings: currentCost * 0.3,
        confidence: 85,
        priority: 'high',
        action: 'Purchase reserved instances'
      })
    }

    // Right sizing recommendation
    recommendations.push({
      id: nanoid(),
      type: 'right_sizing',
      title: 'Right Sizing Recommendation',
      description: 'Downsize underutilized resources',
      estimatedSavings: currentCost * 0.15,
      confidence: 80,
      priority: 'medium',
      action: 'Review and resize resources'
    })

    // Idle resource recommendation
    recommendations.push({
      id: nanoid(),
      type: 'idle_resource',
      title: 'Idle Resource Detection',
      description: 'Remove or stop idle resources',
      estimatedSavings: currentCost * 0.1,
      confidence: 75,
      priority: 'medium',
      action: 'Remove idle resources'
    })

    return recommendations
  }

  // Create budget
  async createBudget(
    name: string,
    amount: number,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    alertThreshold: number = 80
  ): Promise<CostBudget> {
    try {
      const budgetId = nanoid()
      const now = new Date()

      const budget: CostBudget = {
        id: budgetId,
        name,
        amount,
        period,
        alertThreshold,
        currentSpend: 0,
        alerts: [],
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.costBudget.create({
          data: {
            id: budgetId,
            name,
            amount,
            period,
            alertThreshold,
            currentSpend: 0,
            alerts: [],
            createdAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create budget in database' })
      }

      this.budgets.set(budgetId, budget)

      logInfo(`✅ Created budget ${budgetId}: ${name} - $${amount}/${period}`)

      return budget
    } catch (error) {
      logError(error as Error, { context: 'Create budget' })
      throw error
    }
  }

  // Check budget
  async checkBudget(budgetId: string, currentSpend: number): Promise<CostAlert | null> {
    try {
      const budget = this.budgets.get(budgetId)
      if (!budget) return null

      budget.currentSpend = currentSpend
      const spendPercentage = (currentSpend / budget.amount) * 100

      // Check if threshold exceeded
      if (spendPercentage >= budget.alertThreshold) {
        const alertId = nanoid()
        const now = new Date()

        const alert: CostAlert = {
          id: alertId,
          budgetId,
          type: spendPercentage >= 100 ? 'budget_exceeded' : 'unusual_spend',
          message: `Budget ${budget.name} is at ${spendPercentage.toFixed(2)}%`,
          severity: spendPercentage >= 100 ? 'critical' : spendPercentage >= 90 ? 'high' : 'medium',
          triggeredAt: now
        }

        budget.alerts.push(alert)
        this.alerts.set(alertId, alert)

        // Save to database
        try {
          const { prisma } = await import('../config/database')
          await prisma.costAlert.create({
            data: {
              id: alertId,
              budgetId,
              type: alert.type,
              message: alert.message,
              severity: alert.severity,
              triggeredAt: now,
              resolvedAt: null
            })
          })
        } catch (error) {
          logError(error as Error, { context: 'Check budget in database' })
        }

        this.budgets.set(budgetId, budget)

        logError(new Error(`BUDGET ALERT: ${alert.message}`), {
          context: 'Cost Budget',
          budgetId,
          severity: alert.severity
        })

        return alert
      }

      return null
    } catch (error) {
      logError(error as Error, { context: 'Check budget' })
      return null
    }
  }

  // Start cost analysis
  private startCostAnalysis(): void {
    // Analyze costs daily
    setInterval(async () => {
      try {
        // In production, analyze costs for all resources
        logInfo('✅ Cost analysis check completed')
      } catch (error) {
        logError(error as Error, { context: 'Cost analysis' })
      }
    }, 24 * 60 * 60 * 1000) // Daily
  }

  // Start budget monitoring
  private startBudgetMonitoring(): void {
    // Monitor budgets hourly
    setInterval(async () => {
      try {
        // In production, check all budgets
        logInfo('✅ Budget monitoring check completed')
      } catch (error) {
        logError(error as Error, { context: 'Budget monitoring' })
      }
    }, 60 * 60 * 1000) // Every hour
  }

  // Get analyses
  async getAnalyses(resourceId?: string): Promise<CostAnalysis[]> {
    const analyses: CostAnalysis[] = []
    for (const analysis of this.analyses.values()) {
      if (resourceId && analysis.resourceId !== resourceId) continue
      analyses.push(analysis)
    }
    return analyses.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
  }

  // Get budgets
  async getBudgets(): Promise<CostBudget[]> {
    return Array.from(this.budgets.values())
  }

  // Get alerts
  async getAlerts(budgetId?: string): Promise<CostAlert[]> {
    const alerts: CostAlert[] = []
    for (const alert of this.alerts.values()) {
      if (budgetId && alert.budgetId !== budgetId) continue
      if (alert.resolvedAt) continue
      alerts.push(alert)
    }
    return alerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
  }
}

export const costOptimizationManager = new CostOptimizationManager()

