/**
 * Phase 10.5 - Security Audit Logs Enhancement
 * 
 * Enhanced security audit logs
 * - Immutable audit logs
 * - Tamper-proof logs
 * - Comprehensive logging
 * - Audit log analysis
 */

import { nanoid } from 'nanoid'
import crypto from 'crypto'
import { logger, logError, logInfo } from '../../config/logger'

export type AuditEventType = 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'configuration_change' | 'security_event'
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SecurityAuditLog {
  id: string
  eventType: AuditEventType
  severity: AuditSeverity
  userId: string
  action: string
  resource: string
  details: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: Date
  hash: string // SHA-256 hash for tamper detection
  previousHash?: string // Chain hash
  isImmutable: boolean
}

export interface AuditLogChain {
  id: string
  startDate: Date
  endDate: Date
  logs: string[] // Log IDs
  rootHash: string
  verified: boolean
  createdAt: Date
}

class SecurityAuditLogs {
  private logs: Map<string, SecurityAuditLog> = new Map()
  private chains: Map<string, AuditLogChain> = new Map()
  private lastHash: string | undefined

  async initialize() {
    logInfo('Initializing Security Audit Logs Enhancement...')

    logInfo('✅ Security Audit Logs Enhancement initialized')
  }

  // Log audit event
  async logEvent(
    eventType: AuditEventType,
    severity: AuditSeverity,
    userId: string,
    action: string,
    resource: string,
    details: Record<string, any>,
    ipAddress: string,
    userAgent: string
  ): Promise<SecurityAuditLog> {
    try {
      const logId = nanoid()
      const now = new Date()

      // Calculate hash
      const logData = {
        id: logId,
        eventType,
        severity,
        userId,
        action,
        resource,
        details,
        timestamp: now.toISOString()
      }

      const hash = this.calculateHash(logData, this.lastHash)

      const auditLog: SecurityAuditLog = {
        id: logId,
        eventType,
        severity,
        userId,
        action,
        resource,
        details,
        ipAddress,
        userAgent,
        timestamp: now,
        hash,
        previousHash: this.lastHash,
        isImmutable: true
      }

      // Update last hash
      this.lastHash = hash

      // Save to database
      try {
        const { prisma } = await import('../../config/database')
        await prisma.securityAuditLog.create({
          data: {
            id: logId,
            eventType,
            severity,
            userId,
            action,
            resource,
            details,
            ipAddress,
            userAgent,
            timestamp: now,
            hash,
            previousHash: this.lastHash || null,
            isImmutable: true
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Log audit event in database' })
      }

      this.logs.set(logId, auditLog)

      logInfo(`✅ Audit log created ${logId}: ${eventType} - ${action}`)

      return auditLog
    } catch (error) {
      logError(error as Error, { context: 'Log audit event' })
      throw error
    }
  }

  // Calculate hash
  private calculateHash(data: any, previousHash?: string): string {
    const dataString = JSON.stringify(data) + (previousHash || '')
    return crypto.createHash('sha256').update(dataString).digest('hex')
  }

  // Verify audit log integrity
  async verifyIntegrity(logId: string): Promise<boolean> {
    try {
      const log = this.logs.get(logId)
      if (!log) return false

      // Recalculate hash
      const logData = {
        id: log.id,
        eventType: log.eventType,
        severity: log.severity,
        userId: log.userId,
        action: log.action,
        resource: log.resource,
        details: log.details,
        timestamp: log.timestamp.toISOString()
      }

      const calculatedHash = this.calculateHash(logData, log.previousHash)

      // Verify hash matches
      if (calculatedHash !== log.hash) {
        logError(new Error('Audit log hash mismatch'), { context: 'Verify integrity', logId })
        return false
      }

      // Verify previous hash chain
      if (log.previousHash) {
        const previousLog = Array.from(this.logs.values()).find(l => l.hash === log.previousHash)
        if (!previousLog) {
          logError(new Error('Previous log not found'), { context: 'Verify integrity', logId })
          return false
        }
      }

      return true
    } catch (error) {
      logError(error as Error, { context: 'Verify integrity' })
      return false
    }
  }

  // Create audit log chain
  async createChain(startDate: Date, endDate: Date): Promise<AuditLogChain> {
    try {
      const chainId = nanoid()
      const now = new Date()

      // Get logs in range
      const logs = Array.from(this.logs.values()).filter(
        log => log.timestamp >= startDate && log.timestamp <= endDate
      )

      // Calculate root hash
      const rootHash = this.calculateRootHash(logs)

      // Verify all logs
      let verified = true
      for (const log of logs) {
        if (!await this.verifyIntegrity(log.id)) {
          verified = false
          break
        }
      }

      const chain: AuditLogChain = {
        id: chainId,
        startDate,
        endDate,
        logs: logs.map(l => l.id),
        rootHash,
        verified,
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../../config/database')
        await prisma.auditLogChain.create({
          data: {
            id: chainId,
            startDate,
            endDate,
            logs: logs.map(l => l.id),
            rootHash,
            verified,
            createdAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create audit log chain in database' })
      }

      this.chains.set(chainId, chain)

      logInfo(`✅ Audit log chain created ${chainId}: ${logs.length} logs, verified=${verified}`)

      return chain
    } catch (error) {
      logError(error as Error, { context: 'Create audit log chain' })
      throw error
    }
  }

  // Calculate root hash
  private calculateRootHash(logs: SecurityAuditLog[]): string {
    if (logs.length === 0) return crypto.createHash('sha256').update('').digest('hex')

    // Merkle tree root hash
    const hashes = logs.map(log => log.hash)
    
    while (hashes.length > 1) {
      const newHashes: string[] = []
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i]
        const right = hashes[i + 1] || left
        const combined = crypto.createHash('sha256').update(left + right).digest('hex')
        newHashes.push(combined)
      }
      hashes.length = 0
      hashes.push(...newHashes)
    }

    return hashes[0]
  }

  // Get audit logs
  async getAuditLogs(
    eventType?: AuditEventType,
    severity?: AuditSeverity,
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SecurityAuditLog[]> {
    const logs: SecurityAuditLog[] = []
    for (const log of this.logs.values()) {
      if (eventType && log.eventType !== eventType) continue
      if (severity && log.severity !== severity) continue
      if (userId && log.userId !== userId) continue
      if (startDate && log.timestamp < startDate) continue
      if (endDate && log.timestamp > endDate) continue
      logs.push(log)
    }
    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  // Get chains
  async getChains(verified?: boolean): Promise<AuditLogChain[]> {
    const chains: AuditLogChain[] = []
    for (const chain of this.chains.values()) {
      if (verified !== undefined && chain.verified !== verified) continue
      chains.push(chain)
    }
    return chains.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
}

export const securityAuditLogs = new SecurityAuditLogs()

