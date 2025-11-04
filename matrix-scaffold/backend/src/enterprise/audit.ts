/**
 * Audit Logging System
 * Phase 2: Enterprise Features - Audit logging
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { prisma } from '../config/database'
import { captureException } from '../config/sentry'

export interface AuditLog {
  id: string
  userId?: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  ip?: string
  userAgent?: string
  timestamp: Date
}

export interface AuditLogQuery {
  userId?: string
  action?: string
  resource?: string
  resourceId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export class AuditLogger {
  /**
   * Log an audit event
   */
  async log(
    action: string,
    resource: string,
    options?: {
      userId?: string
      resourceId?: string
      details?: Record<string, unknown>
      ip?: string
      userAgent?: string
    }
  ): Promise<void> {
    try {
      const auditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        userId: options?.userId,
        action,
        resource,
        resourceId: options?.resourceId,
        details: options?.details,
        ip: options?.ip,
        userAgent: options?.userAgent,
        timestamp: new Date()
      }

      // Store in database
      try {
        await prisma.auditLog.create({
          data: {
            id: auditLog.id,
            userId: auditLog.userId,
            action: auditLog.action,
            resource: auditLog.resource,
            ip: auditLog.ip,
            userAgent: auditLog.userAgent,
            timestamp: auditLog.timestamp
          }
        })
      } catch (error: any) {
        logger.warn('Failed to store audit log in database:', error)
        // Fallback to file logging
        logger.info('Audit log', auditLog)
      }

      logger.info(`Audit log: ${action} on ${resource}`, {
        userId: options?.userId,
        resourceId: options?.resourceId,
        action,
        resource
      })
    } catch (error: any) {
      logger.error('Audit logging failed:', error)
      captureException(error as Error, { context: 'audit logging' })
    }
  }

  /**
   * Query audit logs
   */
  async query(query: AuditLogQuery): Promise<AuditLog[]> {
    try {
      const where: any = {}

      if (query.userId) {
        where.userId = query.userId
      }

      if (query.action) {
        where.action = query.action
      }

      if (query.resource) {
        where.resource = query.resource
      }

      if (query.startDate || query.endDate) {
        where.timestamp = {}
        if (query.startDate) {
          where.timestamp.gte = query.startDate
        }
        if (query.endDate) {
          where.timestamp.lte = query.endDate
        }
      }

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: query.limit || 100,
        skip: query.offset || 0
      })

      return logs.map((log) => ({
        id: log.id,
        userId: log.userId || undefined,
        action: log.action,
        resource: log.resource,
        ip: log.ip || undefined,
        userAgent: log.userAgent || undefined,
        timestamp: log.timestamp
      }))
    } catch (error: any) {
      logger.error('Audit log query failed:', error)
      return []
    }
  }

  /**
   * Get audit statistics
   */
  async getStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number
    byAction: Record<string, number>
    byResource: Record<string, number>
    byUser: Record<string, number>
  }> {
    try {
      const where: any = {}
      if (startDate || endDate) {
        where.timestamp = {}
        if (startDate) {
          where.timestamp.gte = startDate
        }
        if (endDate) {
          where.timestamp.lte = endDate
        }
      }

      const logs = await prisma.auditLog.findMany({ where })

      const stats = {
        total: logs.length,
        byAction: {} as Record<string, number>,
        byResource: {} as Record<string, number>,
        byUser: {} as Record<string, number>
      }

      for (const log of logs) {
        stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1
        stats.byResource[log.resource] = (stats.byResource[log.resource] || 0) + 1
        if (log.userId) {
          stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1
        }
      }

      return stats
    } catch (error: any) {
      logger.error('Audit stats query failed:', error)
      return {
        total: 0,
        byAction: {},
        byResource: {},
        byUser: {}
      }
    }
  }

  /**
   * Export audit logs (for compliance)
   */
  async export(startDate: Date, endDate: Date): Promise<AuditLog[]> {
    try {
      return await this.query({
        startDate,
        endDate,
        limit: 10000
      })
    } catch (error: any) {
      logger.error('Audit log export failed:', error)
      return []
    }
  }
}

// Global Audit Logger
export const auditLogger = new AuditLogger()

