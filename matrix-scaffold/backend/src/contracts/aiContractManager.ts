/**
 * Phase 8.5 - AI-to-AI Contract System
 * 
 * Smart AI contracts between AIs
 * - Service details, pricing, duration
 * - Execution conditions and success criteria
 * - Contract status tracking
 * - Ledger recording for audit
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type ContractStatus = 'active' | 'completed' | 'failed' | 'cancelled'
export type ContractType = 'service' | 'payment' | 'data' | 'computation'

export interface AIContract {
  id: string
  fromAI: string
  toAI: string
  type: ContractType
  service: string
  description: string
  price: number
  currency: string
  duration?: number // seconds
  conditions: ContractCondition[]
  status: ContractStatus
  result?: Record<string, any>
  error?: string
  createdAt: Date
  completedAt?: Date
}

export interface ContractCondition {
  id: string
  type: 'success' | 'failure' | 'timeout' | 'payment'
  condition: string
  value: any
  met: boolean
}

class AIContractManager {
  private contracts: Map<string, AIContract> = new Map()

  async initialize() {
    logInfo('Initializing AI-to-AI Contract System...')
    logInfo('✅ AI-to-AI Contract System initialized')
  }

  async createContract(
    fromAI: string,
    toAI: string,
    type: ContractType,
    service: string,
    description: string,
    price: number,
    currency: string = 'MXC',
    duration?: number,
    conditions?: ContractCondition[]
  ): Promise<AIContract> {
    try {
      const contractId = nanoid()
      const now = new Date()

      const contract: AIContract = {
        id: contractId,
        fromAI,
        toAI,
        type,
        service,
        description,
        price,
        currency,
        duration,
        conditions: conditions || [],
        status: 'active',
        createdAt: now
      }

      // Save to ledger
      await this.recordToLedger(contract)

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.aIContract.create({
          data: {
            id: contractId,
            fromAI,
            toAI,
            type,
            service,
            description,
            price,
            currency,
            duration: duration || null,
            conditions: conditions || [],
            status: 'active',
            metadata: {}
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create contract in database' })
      }

      this.contracts.set(contractId, contract)
      logInfo(`✅ Created AI contract ${contractId} from ${fromAI} to ${toAI}`)

      return contract
    } catch (error) {
      logError(error as Error, { context: 'Create contract' })
      throw error
    }
  }

  async completeContract(contractId: string, result: Record<string, any>): Promise<boolean> {
    try {
      const contract = this.contracts.get(contractId)
      if (!contract) return false

      contract.status = 'completed'
      contract.result = result
      contract.completedAt = new Date()

      // Process payment
      const { matrixCoinManager } = await import('../economy/matrixCoin')
      await matrixCoinManager.transferCoins(
        contract.fromAI,
        contract.toAI,
        contract.price,
        'payment',
        `Contract ${contractId} payment`
      )

      // Record to ledger
      await this.recordToLedger(contract, 'completed')

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.aIContract.update({
          where: { id: contractId },
          data: {
            status: 'completed',
            result: result,
            completedAt: contract.completedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Complete contract in database' })
      }

      this.contracts.set(contractId, contract)
      logInfo(`✅ Completed AI contract ${contractId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Complete contract' })
      return false
    }
  }

  private async recordToLedger(contract: AIContract, action: string = 'created'): Promise<void> {
    try {
      const { prisma } = await import('../config/database')
      await prisma.ledgerEntry.create({
        data: {
          id: nanoid(),
          type: 'ai_contract',
          entityId: contract.id,
          action,
          data: contract,
          timestamp: new Date()
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Record to ledger' })
    }
  }

  async getContract(contractId: string): Promise<AIContract | null> {
    return this.contracts.get(contractId) || null
  }

  async getContracts(aiId: string, status?: ContractStatus): Promise<AIContract[]> {
    const contracts: AIContract[] = []
    for (const contract of this.contracts.values()) {
      if (contract.fromAI !== aiId && contract.toAI !== aiId) continue
      if (status && contract.status !== status) continue
      contracts.push(contract)
    }
    return contracts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
}

export const aiContractManager = new AIContractManager()

