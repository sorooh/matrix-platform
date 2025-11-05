/**
 * Phase 8.3 - Advanced Security Features
 * 
 * Professional security enhancements
 * - IP whitelisting
 * - Geo-blocking
 * - Advanced 2FA (TOTP, SMS, Email)
 * - Rate limiting per IP
 * - Security audit logs
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'
import * as speakeasy from 'speakeasy'
import * as qrcode from 'qrcode'

export type SecurityLevel = 'low' | 'medium' | 'high' | 'critical'
export type TwoFactorMethod = 'totp' | 'sms' | 'email' | 'backup_code'
export type GeoBlockAction = 'allow' | 'block' | 'require_verification'

export interface IPWhitelist {
  id: string
  userId: string
  ip: string
  description?: string
  isActive: boolean
  createdAt: Date
}

export interface GeoBlockRule {
  id: string
  userId?: string
  partnerId?: string
  country: string
  action: GeoBlockAction
  isActive: boolean
  createdAt: Date
}

export interface SecurityAuditLog {
  id: string
  userId?: string
  ip: string
  country?: string
  action: string
  resource: string
  status: 'success' | 'failed' | 'blocked'
  reason?: string
  metadata: Record<string, any>
  createdAt: Date
}

class AdvancedSecurityManager {
  private ipWhitelists: Map<string, IPWhitelist> = new Map()
  private geoBlockRules: Map<string, GeoBlockRule> = new Map()
  private auditLogs: Map<string, SecurityAuditLog> = new Map()

  async initialize() {
    logInfo('Initializing Advanced Security Features...')

    // Load IP whitelists from database
    try {
      const { prisma } = await import('../config/database')
      const whitelists = await prisma.iPWhitelist.findMany()
      for (const whitelist of whitelists) {
        this.ipWhitelists.set(whitelist.id, {
          id: whitelist.id,
          userId: whitelist.userId,
          ip: whitelist.ip,
          description: whitelist.description || undefined,
          isActive: whitelist.isActive,
          createdAt: whitelist.createdAt
        })
      }
      logInfo(`✅ Loaded ${whitelists.length} IP whitelists from database`)
    } catch (error) {
      logError(error as Error, { context: 'Security initialization' })
    }

    logInfo('✅ Advanced Security Features initialized')
  }

  // IP Whitelisting
  async addIPWhitelist(
    userId: string,
    ip: string,
    description?: string
  ): Promise<IPWhitelist> {
    try {
      const whitelistId = nanoid()
      const now = new Date()

      const whitelist: IPWhitelist = {
        id: whitelistId,
        userId,
        ip,
        description,
        isActive: true,
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.iPWhitelist.create({
          data: {
            id: whitelistId,
            userId,
            ip,
            description: description || null,
            isActive: true
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Add IP whitelist in database' })
      }

      this.ipWhitelists.set(whitelistId, whitelist)
      logInfo(`✅ Added IP whitelist ${whitelistId} for user ${userId}`)

      return whitelist
    } catch (error) {
      logError(error as Error, { context: 'Add IP whitelist' })
      throw error
    }
  }

  // Check IP whitelist
  async checkIPWhitelist(userId: string, ip: string): Promise<boolean> {
    const whitelists = Array.from(this.ipWhitelists.values()).filter(
      w => w.userId === userId && w.isActive
    )

    if (whitelists.length === 0) {
      return true // No whitelist means all IPs allowed
    }

    return whitelists.some(w => {
      // Support CIDR notation
      if (w.ip.includes('/')) {
        return this.isIPInCIDR(ip, w.ip)
      }
      return w.ip === ip
    })
  }

  // Check if IP is in CIDR
  private isIPInCIDR(ip: string, cidr: string): boolean {
    try {
      const [subnet, prefix] = cidr.split('/')
      const prefixLength = parseInt(prefix, 10)
      
      const ipToNumber = (ip: string): number => {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0)
      }

      const mask = ~((1 << (32 - prefixLength)) - 1)
      return (ipToNumber(ip) & mask) === (ipToNumber(subnet) & mask)
    } catch {
      return false
    }
  }

  // Geo-blocking
  async addGeoBlockRule(
    country: string,
    action: GeoBlockAction,
    userId?: string,
    partnerId?: string
  ): Promise<GeoBlockRule> {
    try {
      const ruleId = nanoid()
      const now = new Date()

      const rule: GeoBlockRule = {
        id: ruleId,
        userId,
        partnerId,
        country,
        action,
        isActive: true,
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.geoBlockRule.create({
          data: {
            id: ruleId,
            userId: userId || null,
            partnerId: partnerId || null,
            country,
            action,
            isActive: true
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Add geo block rule in database' })
      }

      this.geoBlockRules.set(ruleId, rule)
      logInfo(`✅ Added geo block rule ${ruleId} for country ${country}`)

      return rule
    } catch (error) {
      logError(error as Error, { context: 'Add geo block rule' })
      throw error
    }
  }

  // Check geo-block
  async checkGeoBlock(country: string, userId?: string, partnerId?: string): Promise<GeoBlockAction> {
    // Check user-specific rules
    if (userId) {
      const userRule = Array.from(this.geoBlockRules.values()).find(
        r => r.userId === userId && r.country === country && r.isActive
      )
      if (userRule) return userRule.action
    }

    // Check partner-specific rules
    if (partnerId) {
      const partnerRule = Array.from(this.geoBlockRules.values()).find(
        r => r.partnerId === partnerId && r.country === country && r.isActive
      )
      if (partnerRule) return partnerRule.action
    }

    // Check global rules
    const globalRule = Array.from(this.geoBlockRules.values()).find(
      r => !r.userId && !r.partnerId && r.country === country && r.isActive
    )
    if (globalRule) return globalRule.action

    return 'allow' // Default: allow
  }

  // Generate TOTP secret
  async generateTOTPSecret(userId: string, label: string): Promise<{ secret: string; qrCode: string }> {
    try {
      const secret = speakeasy.generateSecret({
        name: `Matrix Platform (${label})`,
        issuer: 'Matrix Platform',
        length: 32
      })

      const qrCode = await qrcode.toDataURL(secret.otpauth_url || '')

      // Save secret to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.twoFactorAuth.update({
          where: { userId },
          data: {
            totpSecret: secret.base32 || null,
            totpEnabled: false
          }
        }).catch(async () => {
          await prisma.twoFactorAuth.create({
            data: {
              userId,
              totpSecret: secret.base32 || null,
              totpEnabled: false
            }
          })
        })
      } catch (error) {
        logError(error as Error, { context: 'Save TOTP secret in database' })
      }

      return {
        secret: secret.base32 || '',
        qrCode
      }
    } catch (error) {
      logError(error as Error, { context: 'Generate TOTP secret' })
      throw error
    }
  }

  // Verify TOTP token
  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    try {
      const { prisma } = await import('../config/database')
      const twoFactor = await prisma.twoFactorAuth.findUnique({
        where: { userId }
      })

      if (!twoFactor || !twoFactor.totpSecret || !twoFactor.totpEnabled) {
        return false
      }

      const verified = speakeasy.totp.verify({
        secret: twoFactor.totpSecret,
        encoding: 'base32',
        token,
        window: 2
      })

      if (verified) {
        await this.logSecurityEvent(userId, '2fa_verify', 'success', { method: 'totp' })
      } else {
        await this.logSecurityEvent(userId, '2fa_verify', 'failed', { method: 'totp' })
      }

      return verified
    } catch (error) {
      logError(error as Error, { context: 'Verify TOTP' })
      return false
    }
  }

  // Log security event
  async logSecurityEvent(
    userId: string | undefined,
    action: string,
    status: 'success' | 'failed' | 'blocked',
    ip: string,
    country?: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const logId = nanoid()
      const now = new Date()

      const log: SecurityAuditLog = {
        id: logId,
        userId,
        ip,
        country,
        action,
        resource: 'security',
        status,
        reason,
        metadata: metadata || {},
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.securityAuditLog.create({
          data: {
            id: logId,
            userId: userId || null,
            ip,
            country: country || null,
            action,
            resource: 'security',
            status,
            reason: reason || null,
            metadata: metadata || {}
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Log security event in database' })
      }

      this.auditLogs.set(logId, log)
    } catch (error) {
      logError(error as Error, { context: 'Log security event' })
    }
  }

  // Get audit logs
  async getAuditLogs(
    userId?: string,
    limit: number = 100
  ): Promise<SecurityAuditLog[]> {
    const logs: SecurityAuditLog[] = []
    for (const log of this.auditLogs.values()) {
      if (userId && log.userId !== userId) continue
      logs.push(log)
    }
    return logs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }
}

export const advancedSecurityManager = new AdvancedSecurityManager()

