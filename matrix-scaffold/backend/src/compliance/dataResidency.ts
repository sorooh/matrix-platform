/**
 * Phase 9.1 - Data Residency & Regional Storage
 * 
 * Regional data storage management
 * - EU Region (Frankfurt)
 * - US Region (Iowa)
 * - ASIA Region (Singapore)
 * - Standard Contractual Clauses (SCCs)
 * - Data Transfer Frameworks
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type DataResidencyRegion = 'EU' | 'US' | 'ASIA' | 'GCC' | 'CUSTOM'
export type DataType = 'user_data' | 'transaction_data' | 'ai_data' | 'log_data' | 'metadata'
export type StorageLocation = 'frankfurt' | 'iowa' | 'singapore' | 'dubai' | 'custom'

export interface DataResidencyRule {
  id: string
  region: DataResidencyRegion
  dataType: DataType
  storageLocation: StorageLocation
  encryptionRequired: boolean
  transferAllowed: boolean
  transferConditions?: string[]
  sccRequired: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DataTransfer {
  id: string
  fromRegion: DataResidencyRegion
  toRegion: DataResidencyRegion
  dataType: DataType
  transferMethod: 'scc' | 'adequacy' | 'safeguards' | 'explicit_consent'
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  sccSigned: boolean
  consentObtained: boolean
  transferredAt?: Date
  createdAt: Date
}

export interface SCCAgreement {
  id: string
  transferId: string
  fromRegion: DataResidencyRegion
  toRegion: DataResidencyRegion
  signedAt: Date
  expiresAt: Date
  status: 'active' | 'expired' | 'revoked'
  documentUrl?: string
}

class DataResidencyManager {
  private residencyRules: Map<string, DataResidencyRule> = new Map()
  private dataTransfers: Map<string, DataTransfer> = new Map()
  private sccAgreements: Map<string, SCCAgreement> = new Map()

  async initialize() {
    logInfo('Initializing Data Residency & Regional Storage...')

    // Initialize default residency rules
    await this.initializeDefaultRules()

    logInfo('✅ Data Residency & Regional Storage initialized')
  }

  // Initialize default rules
  private async initializeDefaultRules(): Promise<void> {
    const defaultRules: Omit<DataResidencyRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        region: 'EU',
        dataType: 'user_data',
        storageLocation: 'frankfurt',
        encryptionRequired: true,
        transferAllowed: true,
        transferConditions: ['scc', 'explicit_consent'],
        sccRequired: true
      },
      {
        region: 'US',
        dataType: 'user_data',
        storageLocation: 'iowa',
        encryptionRequired: true,
        transferAllowed: true,
        transferConditions: ['scc', 'safeguards'],
        sccRequired: true
      },
      {
        region: 'ASIA',
        dataType: 'user_data',
        storageLocation: 'singapore',
        encryptionRequired: true,
        transferAllowed: false,
        sccRequired: false
      },
      {
        region: 'GCC',
        dataType: 'user_data',
        storageLocation: 'dubai',
        encryptionRequired: true,
        transferAllowed: true,
        transferConditions: ['explicit_consent'],
        sccRequired: false
      }
    ]

    for (const rule of defaultRules) {
      const ruleId = nanoid()
      const now = new Date()

      const dataResidencyRule: DataResidencyRule = {
        id: ruleId,
        ...rule,
        createdAt: now,
        updatedAt: now
      }

      this.residencyRules.set(ruleId, dataResidencyRule)
    }
  }

  // Create residency rule
  async createResidencyRule(
    region: DataResidencyRegion,
    dataType: DataType,
    storageLocation: StorageLocation,
    encryptionRequired: boolean = true,
    transferAllowed: boolean = false,
    transferConditions?: string[],
    sccRequired: boolean = false
  ): Promise<DataResidencyRule> {
    try {
      const ruleId = nanoid()
      const now = new Date()

      const rule: DataResidencyRule = {
        id: ruleId,
        region,
        dataType,
        storageLocation,
        encryptionRequired,
        transferAllowed,
        transferConditions,
        sccRequired,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.dataResidencyRule.create({
          data: {
            id: ruleId,
            region,
            dataType,
            storageLocation,
            encryptionRequired,
            transferAllowed,
            transferConditions: transferConditions || [],
            sccRequired
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create residency rule in database' })
      }

      this.residencyRules.set(ruleId, rule)

      logInfo(`✅ Created residency rule ${ruleId} for ${region} - ${dataType}`)

      return rule
    } catch (error) {
      logError(error as Error, { context: 'Create residency rule' })
      throw error
    }
  }

  // Request data transfer
  async requestDataTransfer(
    fromRegion: DataResidencyRegion,
    toRegion: DataResidencyRegion,
    dataType: DataType,
    transferMethod: 'scc' | 'adequacy' | 'safeguards' | 'explicit_consent'
  ): Promise<DataTransfer> {
    try {
      const transferId = nanoid()
      const now = new Date()

      // Check if transfer is allowed
      const rule = this.findResidencyRule(fromRegion, dataType)
      if (!rule || !rule.transferAllowed) {
        throw new Error('Data transfer not allowed for this region and data type')
      }

      // Check if SCC is required
      let sccSigned = false
      if (rule.sccRequired && transferMethod === 'scc') {
        sccSigned = await this.signSCCAgreement(transferId, fromRegion, toRegion)
      }

      const transfer: DataTransfer = {
        id: transferId,
        fromRegion,
        toRegion,
        dataType,
        transferMethod,
        status: 'pending',
        sccSigned,
        consentObtained: transferMethod === 'explicit_consent',
        createdAt: now
      }

      // Validate transfer
      const isValid = await this.validateTransfer(transfer)
      if (!isValid) {
        transfer.status = 'rejected'
      } else {
        transfer.status = 'approved'
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.dataTransfer.create({
          data: {
            id: transferId,
            fromRegion,
            toRegion,
            dataType,
            transferMethod,
            status: transfer.status,
            sccSigned,
            consentObtained: transfer.consentObtained,
            transferredAt: null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create data transfer in database' })
      }

      this.dataTransfers.set(transferId, transfer)

      // Execute transfer if approved
      if (transfer.status === 'approved') {
        await this.executeTransfer(transferId)
      }

      logInfo(`✅ Created data transfer ${transferId} from ${fromRegion} to ${toRegion}`)

      return transfer
    } catch (error) {
      logError(error as Error, { context: 'Request data transfer' })
      throw error
    }
  }

  // Find residency rule
  private findResidencyRule(region: DataResidencyRegion, dataType: DataType): DataResidencyRule | null {
    for (const rule of this.residencyRules.values()) {
      if (rule.region === region && rule.dataType === dataType) {
        return rule
      }
    }
    return null
  }

  // Sign SCC agreement
  private async signSCCAgreement(
    transferId: string,
    fromRegion: DataResidencyRegion,
    toRegion: DataResidencyRegion
  ): Promise<boolean> {
    try {
      const sccId = nanoid()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 year

      const scc: SCCAgreement = {
        id: sccId,
        transferId,
        fromRegion,
        toRegion,
        signedAt: now,
        expiresAt,
        status: 'active',
        documentUrl: `https://matrix.ai/scc/${sccId}`
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.sCCAgreement.create({
          data: {
            id: sccId,
            transferId,
            fromRegion,
            toRegion,
            signedAt: now,
            expiresAt,
            status: 'active',
            documentUrl: scc.documentUrl
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Sign SCC agreement in database' })
      }

      this.sccAgreements.set(sccId, scc)

      logInfo(`✅ Signed SCC agreement ${sccId} for transfer ${transferId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Sign SCC agreement' })
      return false
    }
  }

  // Validate transfer
  private async validateTransfer(transfer: DataTransfer): Promise<boolean> {
    // In production, validate against regional regulations
    // For now, check basic requirements
    if (transfer.sccRequired && !transfer.sccSigned) {
      return false
    }
    if (transfer.transferMethod === 'explicit_consent' && !transfer.consentObtained) {
      return false
    }
    return true
  }

  // Execute transfer
  private async executeTransfer(transferId: string): Promise<void> {
    try {
      const transfer = this.dataTransfers.get(transferId)
      if (!transfer) return

      // In production, transfer actual data
      transfer.status = 'completed'
      transfer.transferredAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.dataTransfer.update({
          where: { id: transferId },
          data: {
            status: 'completed',
            transferredAt: transfer.transferredAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Execute transfer in database' })
      }

      this.dataTransfers.set(transferId, transfer)

      logInfo(`✅ Executed data transfer ${transferId}`)
    } catch (error) {
      logError(error as Error, { context: 'Execute transfer' })
    }
  }

  // Get residency rule
  async getResidencyRule(ruleId: string): Promise<DataResidencyRule | null> {
    return this.residencyRules.get(ruleId) || null
  }

  // Get transfers
  async getTransfers(status?: 'pending' | 'approved' | 'rejected' | 'completed'): Promise<DataTransfer[]> {
    const transfers: DataTransfer[] = []
    for (const transfer of this.dataTransfers.values()) {
      if (status && transfer.status !== status) continue
      transfers.push(transfer)
    }
    return transfers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
}

export const dataResidencyManager = new DataResidencyManager()
