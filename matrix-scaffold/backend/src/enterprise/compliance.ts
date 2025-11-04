/**
 * Compliance System
 * Phase 2: Enterprise Features - Compliance (GDPR, SOC2, ISO27001)
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { auditLogger } from './audit'
import { prisma } from '../config/database'
import { encrypt, decrypt } from './encryption'

export interface ComplianceConfig {
  gdpr: {
    enabled: boolean
    dataRetentionDays: number
    rightToErasure: boolean
    dataPortability: boolean
  }
  soc2: {
    enabled: boolean
    auditLogging: boolean
    accessControls: boolean
  }
  iso27001: {
    enabled: boolean
    encryption: boolean
    accessLogging: boolean
  }
}

export class ComplianceSystem {
  private config: ComplianceConfig = {
    gdpr: {
      enabled: process.env.GDPR_ENABLED === 'true',
      dataRetentionDays: Number(process.env.GDPR_DATA_RETENTION_DAYS || 365),
      rightToErasure: process.env.GDPR_RIGHT_TO_ERASURE === 'true',
      dataPortability: process.env.GDPR_DATA_PORTABILITY === 'true'
    },
    soc2: {
      enabled: process.env.SOC2_ENABLED === 'true',
      auditLogging: process.env.SOC2_AUDIT_LOGGING === 'true',
      accessControls: process.env.SOC2_ACCESS_CONTROLS === 'true'
    },
    iso27001: {
      enabled: process.env.ISO27001_ENABLED === 'true',
      encryption: process.env.ISO27001_ENCRYPTION === 'true',
      accessLogging: process.env.ISO27001_ACCESS_LOGGING === 'true'
    }
  }

  /**
   * GDPR - Right to Erasure
   */
  async gdprErasure(userId: string): Promise<{ success: boolean; deleted: number; error?: string }> {
    try {
      if (!this.config.gdpr.enabled || !this.config.gdpr.rightToErasure) {
        return { success: false, deleted: 0, error: 'GDPR erasure not enabled' }
      }

      // Log the erasure request
      await auditLogger.log('gdpr_erasure', 'user', {
        userId,
        details: { timestamp: new Date().toISOString() }
      })

      let deleted = 0

      // Delete user data (anonymized)
      try {
        // Delete user projects (anonymized)
        const projects = await prisma.project.findMany({
          where: { userId }
        })

        for (const project of projects) {
          await prisma.project.update({
            where: { id: project.id },
            data: { userId: null, name: '[DELETED]', description: '[DELETED]' }
          })
          deleted++
        }

        // Delete audit logs (anonymized)
        await prisma.auditLog.updateMany({
          where: { userId },
          data: { userId: '[DELETED]' }
        })
        deleted++

        logger.info(`GDPR erasure completed for user ${userId}`, {
          deleted
        })

        return { success: true, deleted }
      } catch (error: any) {
        logger.error('GDPR erasure failed:', error)
        return { success: false, deleted: 0, error: error.message }
      }
    } catch (error: any) {
      logger.error('GDPR erasure request failed:', error)
      return { success: false, deleted: 0, error: error.message }
    }
  }

  /**
   * GDPR - Data Portability
   */
  async gdprPortability(userId: string): Promise<{
    success: boolean
    data?: Record<string, unknown>
    error?: string
  }> {
    try {
      if (!this.config.gdpr.enabled || !this.config.gdpr.dataPortability) {
        return { success: false, error: 'GDPR portability not enabled' }
      }

      // Log the portability request
      await auditLogger.log('gdpr_portability', 'user', {
        userId,
        details: { timestamp: new Date().toISOString() }
      })

      // Collect user data
      const projects = await prisma.project.findMany({
        where: { userId }
      })

      const auditLogs = await prisma.auditLog.findMany({
        where: { userId },
        take: 1000
      })

      const data = {
        userId,
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        })),
        auditLogs: auditLogs.map((log) => ({
          action: log.action,
          resource: log.resource,
          timestamp: log.timestamp
        })),
        exportedAt: new Date().toISOString()
      }

      logger.info(`GDPR portability data exported for user ${userId}`)

      return { success: true, data }
    } catch (error: any) {
      logger.error('GDPR portability failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * GDPR - Data Retention
   */
  async gdprRetention(): Promise<{ success: boolean; deleted: number; error?: string }> {
    try {
      if (!this.config.gdpr.enabled) {
        return { success: false, deleted: 0, error: 'GDPR not enabled' }
      }

      const retentionDate = new Date()
      retentionDate.setDate(retentionDate.getDate() - this.config.gdpr.dataRetentionDays)

      // Delete old data
      let deleted = 0

      try {
        // Delete old audit logs
        const deletedLogs = await prisma.auditLog.deleteMany({
          where: {
            timestamp: {
              lt: retentionDate
            }
          }
        })
        deleted += deletedLogs.count

        logger.info(`GDPR retention cleanup completed`, {
          deleted,
          retentionDate: retentionDate.toISOString()
        })

        return { success: true, deleted }
      } catch (error: any) {
        logger.error('GDPR retention cleanup failed:', error)
        return { success: false, deleted: 0, error: error.message }
      }
    } catch (error: any) {
      logger.error('GDPR retention failed:', error)
      return { success: false, deleted: 0, error: error.message }
    }
  }

  /**
   * SOC2 - Access Control Audit
   */
  async soc2AccessAudit(): Promise<{
    success: boolean
    report?: Record<string, unknown>
    error?: string
  }> {
    try {
      if (!this.config.soc2.enabled || !this.config.soc2.auditLogging) {
        return { success: false, error: 'SOC2 audit logging not enabled' }
      }

      // Get audit statistics
      const stats = await auditLogger.getStats()

      // Generate report
      const report = {
        timestamp: new Date().toISOString(),
        accessLogs: stats.total,
        byAction: stats.byAction,
        byResource: stats.byResource,
        byUser: Object.keys(stats.byUser).length,
        compliance: {
          auditLogging: this.config.soc2.auditLogging,
          accessControls: this.config.soc2.accessControls
        }
      }

      logger.info('SOC2 access audit completed', report)

      return { success: true, report }
    } catch (error: any) {
      logger.error('SOC2 access audit failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * ISO27001 - Security Audit
   */
  async iso27001SecurityAudit(): Promise<{
    success: boolean
    report?: Record<string, unknown>
    error?: string
  }> {
    try {
      if (!this.config.iso27001.enabled) {
        return { success: false, error: 'ISO27001 not enabled' }
      }

      // Generate security report
      const report = {
        timestamp: new Date().toISOString(),
        encryption: {
          enabled: this.config.iso27001.encryption,
          status: this.config.iso27001.encryption ? 'enabled' : 'disabled'
        },
        accessLogging: {
          enabled: this.config.iso27001.accessLogging,
          status: this.config.iso27001.accessLogging ? 'enabled' : 'disabled'
        },
        compliance: {
          iso27001: this.config.iso27001.enabled,
          encryption: this.config.iso27001.encryption,
          accessLogging: this.config.iso27001.accessLogging
        }
      }

      logger.info('ISO27001 security audit completed', report)

      return { success: true, report }
    } catch (error: any) {
      logger.error('ISO27001 security audit failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get compliance status
   */
  getStatus(): ComplianceConfig {
    return this.config
  }
}

// Global Compliance System
export const complianceSystem = new ComplianceSystem()

