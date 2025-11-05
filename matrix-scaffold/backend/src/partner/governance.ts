/**
 * Phase 8.2 - Partner Governance & Permissions
 * 
 * Partner governance and permission system
 * - Role-based permissions (Owner, Manager, Sales, Support, Viewer)
 * - Audit trail for all actions
 * - Freeze/suspend partner capabilities
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'
import { partnerPortalManager } from './partnerPortal'

export type AuditAction = 'create' | 'update' | 'delete' | 'suspend' | 'activate' | 'payment' | 'payout'

export interface AuditLog {
  id: string
  partnerId: string
  userId: string
  action: AuditAction
  resource: string
  resourceId?: string
  changes?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

export interface PartnerPermission {
  action: string
  resource: string
  allowed: boolean
}

class PartnerGovernanceManager {
  private auditLogs: Map<string, AuditLog> = new Map()
  private permissions: Map<string, string[]> = new Map() // role -> permissions

  async initialize() {
    logInfo('Initializing Partner Governance & Permissions...')

    // Initialize role permissions
    this.permissions.set('owner', ['*'])
    this.permissions.set('manager', [
      'view', 'edit', 'manage_members', 'view_reports', 'manage_billing'
    ])
    this.permissions.set('sales', [
      'view', 'create_customers', 'view_reports', 'manage_subscriptions'
    ])
    this.permissions.set('support', [
      'view', 'manage_tickets', 'view_customers'
    ])
    this.permissions.set('viewer', ['view'])

    // Load audit logs from database
    try {
      const { prisma } = await import('../config/database')
      const logs = await prisma.partnerAuditLog.findMany({
        take: 10000 // Load last 10k logs
      })
      for (const log of logs) {
        this.auditLogs.set(log.id, {
          id: log.id,
          partnerId: log.partnerId,
          userId: log.userId,
          action: log.action as AuditAction,
          resource: log.resource,
          resourceId: log.resourceId || undefined,
          changes: log.changes as Record<string, any> || undefined,
          ipAddress: log.ipAddress || undefined,
          userAgent: log.userAgent || undefined,
          timestamp: log.timestamp
        })
      }
      logInfo(`✅ Loaded ${logs.length} audit logs from database`)
    } catch (error) {
      logError(error as Error, { context: 'Partner Governance initialization' })
    }

    logInfo('✅ Partner Governance & Permissions initialized')
  }

  // Check permission
  async checkPermission(
    role: string,
    action: string,
    resource: string
  ): Promise<boolean> {
    const rolePermissions = this.permissions.get(role) || []
    
    // Owner has all permissions
    if (rolePermissions.includes('*')) {
      return true
    }

    // Check specific permission
    const permission = `${action}:${resource}`
    return rolePermissions.includes(permission) || rolePermissions.includes(action)
  }

  // Log audit action
  async logAction(
    partnerId: string,
    userId: string,
    action: AuditAction,
    resource: string,
    resourceId?: string,
    changes?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    try {
      const logId = nanoid()

      const log: AuditLog = {
        id: logId,
        partnerId,
        userId,
        action,
        resource,
        resourceId,
        changes,
        ipAddress,
        userAgent,
        timestamp: new Date()
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.partnerAuditLog.create({
          data: {
            id: logId,
            partnerId,
            userId,
            action,
            resource,
            resourceId: resourceId || null,
            changes: changes || {},
            ipAddress: ipAddress || null,
            userAgent: userAgent || null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Log audit action in database' })
      }

      this.auditLogs.set(logId, log)
      return log
    } catch (error) {
      logError(error as Error, { context: 'Log audit action' })
      throw error
    }
  }

  // Get audit logs
  async getAuditLogs(
    partnerId: string,
    limit: number = 100,
    action?: AuditAction
  ): Promise<AuditLog[]> {
    const logs: AuditLog[] = []
    for (const log of this.auditLogs.values()) {
      if (log.partnerId === partnerId) {
        if (action && log.action !== action) continue
        logs.push(log)
      }
    }
    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  // Freeze partner
  async freezePartner(partnerId: string, reason?: string): Promise<boolean> {
    try {
      const partner = await partnerPortalManager.getPartner(partnerId)
      if (!partner) return false

      await partnerPortalManager.updatePartner(partnerId, {
        status: 'suspended'
      })

      // Log action
      await this.logAction(
        partnerId,
        'system',
        'suspend',
        'partner',
        partnerId,
        { reason },
        undefined,
        'System'
      )

      logInfo(`✅ Frozen partner ${partnerId}`)
      return true
    } catch (error) {
      logError(error as Error, { context: 'Freeze partner' })
      return false
    }
  }

  // Activate partner
  async activatePartner(partnerId: string): Promise<boolean> {
    try {
      const partner = await partnerPortalManager.getPartner(partnerId)
      if (!partner) return false

      await partnerPortalManager.updatePartner(partnerId, {
        status: 'active'
      })

      // Log action
      await this.logAction(
        partnerId,
        'system',
        'activate',
        'partner',
        partnerId,
        {},
        undefined,
        'System'
      )

      logInfo(`✅ Activated partner ${partnerId}`)
      return true
    } catch (error) {
      logError(error as Error, { context: 'Activate partner' })
      return false
    }
  }

  // Get permissions for role
  getRolePermissions(role: string): string[] {
    return this.permissions.get(role) || []
  }
}

export const partnerGovernanceManager = new PartnerGovernanceManager()

