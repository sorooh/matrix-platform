/**
 * Phase 9.1 - Audit & Traceability System
 * 
 * Comprehensive audit trail system
 * - Data access tracking
 * - Admin actions tracking
 * - API calls tracking
 * - Immutable ledger
 * - Compliance report export
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'
import * as crypto from 'crypto'

export type AuditAction = 'data_access' | 'admin_action' | 'api_call' | 'data_modification' | 'data_deletion' | 'user_login' | 'permission_change'
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ReportFormat = 'json' | 'csv' | 'pdf' | 'xlsx'

export interface AuditLog {
  id: string
  action: AuditAction
  userId?: string
  resourceId?: string
  resourceType?: string
  ipAddress: string
  userAgent?: string
  country?: string
  timestamp: Date
  details: Record<string, any>
  severity: AuditSeverity
  hash: string // Immutable hash
  previousHash?: string // Link to previous log
}

export interface AuditReport {
  id: string
  type: 'compliance' | 'security' | 'data_access' | 'admin_actions'
  startDate: Date
  endDate: Date
  format: ReportFormat
  generatedAt: Date
  data: any
  hash: string // Immutable hash
}

class AuditAndTraceabilitySystem {
  private auditLogs: Map<string, AuditLog> = new Map()
  private reports: Map<string, AuditReport> = new Map()
  private lastHash: string = ''

  async initialize() {
    logInfo('Initializing Audit & Traceability System...')
    logInfo('✅ Audit & Traceability System initialized')
  }

  // Log audit event
  async logAuditEvent(
    action: AuditAction,
    userId?: string,
    resourceId?: string,
    resourceType?: string,
    ipAddress: string = 'unknown',
    userAgent?: string,
    country?: string,
    details: Record<string, any> = {},
    severity: AuditSeverity = 'low'
  ): Promise<AuditLog> {
    try {
      const logId = nanoid()
      const now = new Date()

      // Calculate hash
      const logData = JSON.stringify({
        id: logId,
        action,
        userId,
        resourceId,
        resourceType,
        ipAddress,
        timestamp: now.toISOString(),
        details
      })
      const hash = crypto.createHash('sha256').update(logData + this.lastHash).digest('hex')

      const auditLog: AuditLog = {
        id: logId,
        action,
        userId,
        resourceId,
        resourceType,
        ipAddress,
        userAgent,
        country,
        timestamp: now,
        details,
        severity,
        hash,
        previousHash: this.lastHash || undefined
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.auditLog.create({
          data: {
            id: logId,
            action,
            userId: userId || null,
            resourceId: resourceId || null,
            resourceType: resourceType || null,
            ipAddress,
            userAgent: userAgent || null,
            country: country || null,
            timestamp: now,
            details,
            severity,
            hash,
            previousHash: this.lastHash || null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Log audit event in database' })
      }

      this.auditLogs.set(logId, auditLog)
      this.lastHash = hash

      logInfo(`✅ Logged audit event ${logId}: ${action}`)

      return auditLog
    } catch (error) {
      logError(error as Error, { context: 'Log audit event' })
      throw error
    }
  }

  // Generate compliance report
  async generateComplianceReport(
    type: 'compliance' | 'security' | 'data_access' | 'admin_actions',
    startDate: Date,
    endDate: Date,
    format: ReportFormat = 'json'
  ): Promise<AuditReport> {
    try {
      const reportId = nanoid()
      const now = new Date()

      // Filter logs by type and date range
      const logs = await this.getAuditLogs(startDate, endDate, type)

      // Generate report data
      const reportData = this.generateReportData(logs, type)

      // Calculate hash
      const reportDataString = JSON.stringify(reportData)
      const hash = crypto.createHash('sha256').update(reportDataString + reportId).digest('hex')

      const report: AuditReport = {
        id: reportId,
        type,
        startDate,
        endDate,
        format,
        generatedAt: now,
        data: reportData,
        hash
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.auditReport.create({
          data: {
            id: reportId,
            type,
            startDate,
            endDate,
            format,
            generatedAt: now,
            data: reportData,
            hash
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Generate compliance report in database' })
      }

      this.reports.set(reportId, report)

      logInfo(`✅ Generated compliance report ${reportId}: ${type}`)

      return report
    } catch (error) {
      logError(error as Error, { context: 'Generate compliance report' })
      throw error
    }
  }

  // Get audit logs
  async getAuditLogs(
    startDate?: Date,
    endDate?: Date,
    type?: 'compliance' | 'security' | 'data_access' | 'admin_actions',
    userId?: string,
    limit: number = 1000
  ): Promise<AuditLog[]> {
    const logs: AuditLog[] = []

    for (const log of this.auditLogs.values()) {
      // Filter by date range
      if (startDate && log.timestamp < startDate) continue
      if (endDate && log.timestamp > endDate) continue

      // Filter by user
      if (userId && log.userId !== userId) continue

      // Filter by type
      if (type) {
        const actionTypes: Record<string, AuditAction[]> = {
          'data_access': ['data_access'],
          'admin_actions': ['admin_action', 'permission_change'],
          'security': ['user_login', 'data_modification', 'data_deletion'],
          'compliance': ['data_access', 'data_modification', 'data_deletion']
        }
        if (!actionTypes[type]?.includes(log.action)) continue
      }

      logs.push(log)
    }

    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  // Generate report data
  private generateReportData(
    logs: AuditLog[],
    type: 'compliance' | 'security' | 'data_access' | 'admin_actions'
  ): any {
    const summary = {
      totalLogs: logs.length,
      byAction: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      byCountry: {} as Record<string, number>,
      timeline: [] as any[]
    }

    for (const log of logs) {
      // Count by action
      summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1

      // Count by severity
      summary.bySeverity[log.severity] = (summary.bySeverity[log.severity] || 0) + 1

      // Count by user
      if (log.userId) {
        summary.byUser[log.userId] = (summary.byUser[log.userId] || 0) + 1
      }

      // Count by country
      if (log.country) {
        summary.byCountry[log.country] = (summary.byCountry[log.country] || 0) + 1
      }
    }

    return {
      summary,
      logs: logs.slice(0, 1000) // Limit to 1000 logs in report
    }
  }

  // Export report
  async exportReport(reportId: string): Promise<string> {
    try {
      const report = this.reports.get(reportId)
      if (!report) throw new Error('Report not found')

      if (report.format === 'json') {
        return JSON.stringify(report.data, null, 2)
      } else if (report.format === 'csv') {
        return this.exportToCSV(report.data)
      } else if (report.format === 'pdf') {
        return this.exportToPDF(report.data)
      } else if (report.format === 'xlsx') {
        return this.exportToXLSX(report.data)
      }

      return ''
    } catch (error) {
      logError(error as Error, { context: 'Export report' })
      throw error
    }
  }

  // Export to CSV
  private exportToCSV(data: any): string {
    // In production, use CSV library
    return JSON.stringify(data)
  }

  // Export to PDF
  private exportToPDF(data: any): string {
    // In production, use PDF library
    return JSON.stringify(data)
  }

  // Export to XLSX
  private exportToXLSX(data: any): string {
    // In production, use XLSX library
    return JSON.stringify(data)
  }

  // Verify audit log integrity
  async verifyIntegrity(logId: string): Promise<boolean> {
    try {
      const log = this.auditLogs.get(logId)
      if (!log) return false

      // Recalculate hash
      const logData = JSON.stringify({
        id: log.id,
        action: log.action,
        userId: log.userId,
        resourceId: log.resourceId,
        resourceType: log.resourceType,
        ipAddress: log.ipAddress,
        timestamp: log.timestamp.toISOString(),
        details: log.details
      })
      const calculatedHash = crypto.createHash('sha256').update(logData + (log.previousHash || '')).digest('hex')

      return calculatedHash === log.hash
    } catch (error) {
      logError(error as Error, { context: 'Verify integrity' })
      return false
    }
  }

  // Get report
  async getReport(reportId: string): Promise<AuditReport | null> {
    return this.reports.get(reportId) || null
  }
}

export const auditAndTraceabilitySystem = new AuditAndTraceabilitySystem()
