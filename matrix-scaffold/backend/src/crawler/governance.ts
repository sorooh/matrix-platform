/**
 * Governance & Legal Layer
 * Phase 6: AI Crawler & Simulation Environment
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { prisma } from '../config/database'
import { auditLogger } from '../enterprise/audit'
import { complianceSystem } from '../enterprise/compliance'

export interface CrawlOperation {
  id: string
  url: string
  userId?: string
  startedAt: Date
  completedAt?: Date
  status: 'pending' | 'approved' | 'rejected' | 'running' | 'completed' | 'failed'
  approvalStatus: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedAt?: Date
  reason?: string
  complianceChecks: ComplianceCheck[]
  auditLog: AuditLogEntry[]
}

export interface ComplianceCheck {
  id: string
  type: 'robots.txt' | 'legal' | 'privacy' | 'terms' | 'copyright'
  status: 'passed' | 'failed' | 'warning'
  details: string
  timestamp: Date
}

export interface AuditLogEntry {
  id: string
  timestamp: Date
  action: string
  userId?: string
  details: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export interface GovernancePolicy {
  id: string
  name: string
  description: string
  rules: Array<{
    type: string
    condition: string
    action: 'allow' | 'block' | 'warn' | 'require-approval'
  }>
  enabled: boolean
}

export class GovernanceLayer {
  private operations: Map<string, CrawlOperation> = new Map()
  private policies: Map<string, GovernancePolicy> = new Map()

  constructor() {
    this.initializeDefaultPolicies()
  }

  /**
   * Initialize default policies
   */
  private initializeDefaultPolicies(): void {
    // Default policy: Require approval for sensitive domains
    const sensitiveDomainsPolicy: GovernancePolicy = {
      id: 'sensitive-domains',
      name: 'Sensitive Domains Policy',
      description: 'Require approval for crawling sensitive domains',
      rules: [
        {
          type: 'domain',
          condition: '(facebook|instagram|twitter|linkedin|google|microsoft|apple)\\.com',
          action: 'require-approval',
        },
      ],
      enabled: true,
    }

    this.policies.set(sensitiveDomainsPolicy.id, sensitiveDomainsPolicy)

    // Default policy: Block explicit content
    const explicitContentPolicy: GovernancePolicy = {
      id: 'explicit-content',
      name: 'Explicit Content Policy',
      description: 'Block crawling of explicit content',
      rules: [
        {
          type: 'content',
          condition: '(explicit|adult|nsfw|18\\+)',
          action: 'block',
        },
      ],
      enabled: true,
    }

    this.policies.set(explicitContentPolicy.id, explicitContentPolicy)

    logger.info('Default governance policies initialized', {
      policiesCount: this.policies.size,
    })
  }

  /**
   * Request crawl operation
   */
  async requestCrawlOperation(
    url: string,
    options?: {
      userId?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<string> {
    try {
      const operationId = `crawl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      // Check policies
      const policyCheck = await this.checkPolicies(url)
      const requiresApproval = policyCheck.requiresApproval
      const blocked = policyCheck.blocked

      if (blocked) {
        const operation: CrawlOperation = {
          id: operationId,
          url,
          userId: options?.userId,
          startedAt: new Date(),
          status: 'rejected',
          approvalStatus: 'rejected',
          reason: policyCheck.reason || 'Blocked by governance policy',
          complianceChecks: policyCheck.complianceChecks,
          auditLog: [
            {
              id: `audit-${Date.now()}`,
              timestamp: new Date(),
              action: 'crawl_request_blocked',
              userId: options?.userId,
              details: { url, reason: policyCheck.reason },
              ipAddress: options?.ipAddress,
              userAgent: options?.userAgent,
            },
          ],
        }

        this.operations.set(operationId, operation)
        await this.logAudit(operation)

        logger.warn('Crawl operation blocked by policy', {
          operationId,
          url,
          reason: policyCheck.reason,
        })

        throw new Error(`Crawl operation blocked: ${policyCheck.reason}`)
      }

      const operation: CrawlOperation = {
        id: operationId,
        url,
        userId: options?.userId,
        startedAt: new Date(),
        status: requiresApproval ? 'pending' : 'approved',
        approvalStatus: requiresApproval ? 'pending' : 'approved',
        complianceChecks: policyCheck.complianceChecks,
        auditLog: [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date(),
            action: requiresApproval ? 'crawl_request_pending_approval' : 'crawl_request_approved',
            userId: options?.userId,
            details: { url },
            ipAddress: options?.ipAddress,
            userAgent: options?.userAgent,
          },
        ],
      }

      this.operations.set(operationId, operation)
      await this.logAudit(operation)

      logger.info('Crawl operation requested', {
        operationId,
        url,
        requiresApproval,
      })

      eventBus.publish('crawler.governance.operation.requested', {
        operationId,
        operation,
      })

      return operationId
    } catch (error: any) {
      logger.error('Request crawl operation failed:', error)
      throw error
    }
  }

  /**
   * Approve crawl operation
   */
  async approveOperation(
    operationId: string,
    options?: {
      approvedBy: string
      reason?: string
    }
  ): Promise<void> {
    try {
      const operation = this.operations.get(operationId)
      if (!operation) {
        throw new Error(`Operation ${operationId} not found`)
      }

      if (operation.status !== 'pending') {
        throw new Error(`Operation ${operationId} is not pending approval`)
      }

      operation.status = 'approved'
      operation.approvalStatus = 'approved'
      operation.approvedBy = options?.approvedBy
      operation.approvedAt = new Date()
      operation.reason = options?.reason

      operation.auditLog.push({
        id: `audit-${Date.now()}`,
        timestamp: new Date(),
        action: 'crawl_operation_approved',
        userId: options?.approvedBy,
        details: { operationId, reason: options?.reason },
      })

      await this.logAudit(operation)

      logger.info('Crawl operation approved', {
        operationId,
        approvedBy: options?.approvedBy,
      })

      eventBus.publish('crawler.governance.operation.approved', {
        operationId,
        operation,
      })
    } catch (error: any) {
      logger.error('Approve operation failed:', error)
      throw error
    }
  }

  /**
   * Reject crawl operation
   */
  async rejectOperation(
    operationId: string,
    options?: {
      rejectedBy: string
      reason?: string
    }
  ): Promise<void> {
    try {
      const operation = this.operations.get(operationId)
      if (!operation) {
        throw new Error(`Operation ${operationId} not found`)
      }

      operation.status = 'rejected'
      operation.approvalStatus = 'rejected'
      operation.reason = options?.reason || 'Rejected by governance'

      operation.auditLog.push({
        id: `audit-${Date.now()}`,
        timestamp: new Date(),
        action: 'crawl_operation_rejected',
        userId: options?.rejectedBy,
        details: { operationId, reason: options?.reason },
      })

      await this.logAudit(operation)

      logger.info('Crawl operation rejected', {
        operationId,
        rejectedBy: options?.rejectedBy,
        reason: options?.reason,
      })

      eventBus.publish('crawler.governance.operation.rejected', {
        operationId,
        operation,
      })
    } catch (error: any) {
      logger.error('Reject operation failed:', error)
      throw error
    }
  }

  /**
   * Check policies
   */
  private async checkPolicies(url: string): Promise<{
    requiresApproval: boolean
    blocked: boolean
    reason?: string
    complianceChecks: ComplianceCheck[]
  }> {
    const complianceChecks: ComplianceCheck[] = []
    let requiresApproval = false
    let blocked = false
    let reason: string | undefined

    // Check robots.txt
    try {
      const urlObj = new URL(url)
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`
      const response = await fetch(robotsUrl).catch(() => null)

      complianceChecks.push({
        id: `check-${Date.now()}-1`,
        type: 'robots.txt',
        status: response ? 'passed' : 'warning',
        details: response ? 'robots.txt accessible' : 'robots.txt not accessible',
        timestamp: new Date(),
      })
    } catch (error) {
      complianceChecks.push({
        id: `check-${Date.now()}-1`,
        type: 'robots.txt',
        status: 'warning',
        details: 'robots.txt check failed',
        timestamp: new Date(),
      })
    }

    // Check enabled policies
    for (const [policyId, policy] of this.policies.entries()) {
      if (!policy.enabled) {
        continue
      }

      for (const rule of policy.rules) {
        const regex = new RegExp(rule.condition, 'i')
        if (regex.test(url)) {
          complianceChecks.push({
            id: `check-${Date.now()}-${policyId}`,
            type: 'legal',
            status: rule.action === 'block' ? 'failed' : rule.action === 'warn' ? 'warning' : 'passed',
            details: `Policy: ${policy.name}, Rule: ${rule.type}`,
            timestamp: new Date(),
          })

          if (rule.action === 'block') {
            blocked = true
            reason = `Blocked by policy: ${policy.name}`
          } else if (rule.action === 'require-approval') {
            requiresApproval = true
            if (!reason) {
              reason = `Requires approval by policy: ${policy.name}`
            }
          }
        }
      }
    }

    return {
      requiresApproval,
      blocked,
      reason,
      complianceChecks,
    }
  }

  /**
   * Log audit entry
   */
  private async logAudit(operation: CrawlOperation): Promise<void> {
    try {
      // Log to audit system
      await auditLogger.log({
        action: 'crawl_operation',
        resource: operation.url,
        userId: operation.userId,
        metadata: {
          operationId: operation.id,
          status: operation.status,
          approvalStatus: operation.approvalStatus,
          complianceChecks: operation.complianceChecks,
        },
      })

      // Log to compliance system
      await complianceSystem.recordActivity({
        type: 'crawl',
        action: operation.auditLog[operation.auditLog.length - 1]?.action || 'unknown',
        userId: operation.userId,
        metadata: {
          operationId: operation.id,
          url: operation.url,
        },
      })
    } catch (error: any) {
      logger.error('Log audit failed:', error)
    }
  }

  /**
   * Get operation
   */
  getOperation(operationId: string): CrawlOperation | null {
    return this.operations.get(operationId) || null
  }

  /**
   * Get all operations
   */
  getAllOperations(): CrawlOperation[] {
    return Array.from(this.operations.values())
  }

  /**
   * Get pending operations
   */
  getPendingOperations(): CrawlOperation[] {
    return Array.from(this.operations.values()).filter((o) => o.approvalStatus === 'pending')
  }

  /**
   * Add policy
   */
  addPolicy(policy: GovernancePolicy): void {
    this.policies.set(policy.id, policy)

    logger.info('Governance policy added', {
      policyId: policy.id,
      policyName: policy.name,
    })

    eventBus.publish('crawler.governance.policy.added', {
      policy,
    })
  }

  /**
   * Remove policy
   */
  removePolicy(policyId: string): void {
    const policy = this.policies.get(policyId)
    if (policy) {
      this.policies.delete(policyId)
      logger.info('Governance policy removed', { policyId })
    }
  }

  /**
   * Get all policies
   */
  getAllPolicies(): GovernancePolicy[] {
    return Array.from(this.policies.values())
  }

  /**
   * Get policy
   */
  getPolicy(policyId: string): GovernancePolicy | null {
    return this.policies.get(policyId) || null
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate?: Date, endDate?: Date): Promise<{
    totalOperations: number
    approvedOperations: number
    rejectedOperations: number
    pendingOperations: number
    complianceRate: number
    operations: CrawlOperation[]
  }> {
    try {
      let operations = Array.from(this.operations.values())

      if (startDate && endDate) {
        operations = operations.filter(
          (o) => o.startedAt >= startDate && o.startedAt <= endDate
        )
      }

      const approvedOperations = operations.filter((o) => o.approvalStatus === 'approved').length
      const rejectedOperations = operations.filter((o) => o.approvalStatus === 'rejected').length
      const pendingOperations = operations.filter((o) => o.approvalStatus === 'pending').length
      const totalOperations = operations.length
      const complianceRate = totalOperations > 0 ? approvedOperations / totalOperations : 0

      const report = {
        totalOperations,
        approvedOperations,
        rejectedOperations,
        pendingOperations,
        complianceRate,
        operations,
      }

      logger.info('Compliance report generated', {
        totalOperations,
        complianceRate,
      })

      return report
    } catch (error: any) {
      logger.error('Generate compliance report failed:', error)
      throw error
    }
  }
}

// Global Governance Layer
export const governanceLayer = new GovernanceLayer()

