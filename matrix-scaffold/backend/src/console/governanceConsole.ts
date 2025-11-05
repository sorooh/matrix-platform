/**
 * Phase 8.5 - Matrix Governance Console
 * 
 * Central governance dashboard for Matrix Platform
 * - Monitor internal economy
 * - Track contracts and relationships
 * - Adjust market policies and rates
 * - Generate comprehensive reports
 */

import { logger, logInfo } from '../config/logger'

export interface EconomyMetrics {
  totalMXC: number
  activeWallets: number
  totalTransactions: number
  dailyVolume: number
  averageTransaction: number
  conversionRate: number
}

export interface GovernanceReport {
  id: string
  type: 'economy' | 'contracts' | 'reputation' | 'integration'
  metrics: any
  generatedAt: Date
}

class GovernanceConsole {
  async initialize() {
    logInfo('Initializing Matrix Governance Console...')
    logInfo('✅ Matrix Governance Console initialized')
  }

  async getEconomyMetrics(): Promise<EconomyMetrics> {
    try {
      const { prisma } = await import('../config/database')
      
      const wallets = await prisma.matrixCoinWallet.count()
      const transactions = await prisma.matrixCoinTransaction.count()
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const dailyTransactions = await prisma.matrixCoinTransaction.findMany({
        where: {
          createdAt: { gte: today }
        }
      })

      const dailyVolume = dailyTransactions.reduce((sum, t) => sum + t.amount, 0)
      const averageTransaction = transactions > 0 
        ? dailyTransactions.reduce((sum, t) => sum + t.amount, 0) / dailyTransactions.length
        : 0

      const totalMXC = await prisma.matrixCoinWallet.aggregate({
        _sum: { balance: true }
      })

      return {
        totalMXC: totalMXC._sum.balance || 0,
        activeWallets: wallets,
        totalTransactions: transactions,
        dailyVolume,
        averageTransaction,
        conversionRate: 0.01 // 1 MXC = 0.01 USD
      }
    } catch (error) {
      logger.error('Failed to get economy metrics:', error)
      return {
        totalMXC: 0,
        activeWallets: 0,
        totalTransactions: 0,
        dailyVolume: 0,
        averageTransaction: 0,
        conversionRate: 0.01
      }
    }
  }

  async generateReport(type: 'economy' | 'contracts' | 'reputation' | 'integration'): Promise<GovernanceReport> {
    try {
      const reportId = `report_${Date.now()}`
      const now = new Date()

      let metrics: any = {}

      if (type === 'economy') {
        metrics = await this.getEconomyMetrics()
      } else if (type === 'contracts') {
        // Contract metrics
        const { prisma } = await import('../config/database')
        const contracts = await prisma.aIContract.count()
        const activeContracts = await prisma.aIContract.count({
          where: { status: 'active' }
        })
        metrics = { total: contracts, active: activeContracts }
      } else if (type === 'reputation') {
        // Reputation metrics
        const { aiReputationManager } = await import('../reputation/aiReputation')
        const topAIs = await aiReputationManager.getTopAIs(10)
        metrics = { topAIs }
      } else if (type === 'integration') {
        // Integration metrics
        const { prisma } = await import('../config/database')
        const calls = await prisma.appAICall.count()
        metrics = { totalCalls: calls }
      }

      const report: GovernanceReport = {
        id: reportId,
        type,
        metrics,
        generatedAt: now
      }

      logInfo(`✅ Generated ${type} report ${reportId}`)

      return report
    } catch (error) {
      logger.error('Failed to generate report:', error)
      throw error
    }
  }
}

export const governanceConsole = new GovernanceConsole()

