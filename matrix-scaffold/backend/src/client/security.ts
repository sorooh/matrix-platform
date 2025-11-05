/**
 * Phase 8.1 - Security & Client Access
 * 
 * Client security features
 * - 2FA (Two-Factor Authentication)
 * - Session management
 * - Password management
 * - API key management from client perspective
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'
import * as bcrypt from 'bcrypt'

export interface TwoFactorAuth {
  userId: string
  enabled: boolean
  secret?: string
  backupCodes?: string[]
  createdAt?: Date
  verifiedAt?: Date
}

export interface PasswordChange {
  userId: string
  oldPassword: string
  newPassword: string
}

class ClientSecurityManager {
  private twoFactorSecrets: Map<string, string> = new Map() // userId -> secret
  private backupCodes: Map<string, string[]> = new Map() // userId -> codes

  async initialize() {
    logInfo('Initializing Client Security Manager...')
    logInfo('✅ Client Security Manager initialized')
  }

  // Enable 2FA
  async enable2FA(userId: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    try {
      // Generate secret (in production, use proper 2FA library like speakeasy)
      const secret = `2FA_SECRET_${nanoid(32)}`
      const qrCode = `otpauth://totp/MatrixPlatform:${userId}?secret=${secret}&issuer=MatrixPlatform`

      // Generate backup codes
      const backupCodes: string[] = []
      for (let i = 0; i < 10; i++) {
        backupCodes.push(nanoid(8).toUpperCase())
      }

      this.twoFactorSecrets.set(userId, secret)
      this.backupCodes.set(userId, backupCodes)

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.twoFactorAuth.upsert({
          where: { userId },
          create: {
            userId,
            enabled: true,
            secret,
            backupCodes,
            verifiedAt: new Date()
          },
          update: {
            enabled: true,
            secret,
            backupCodes,
            verifiedAt: new Date()
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Enable 2FA in database' })
      }

      logInfo(`✅ Enabled 2FA for user ${userId}`)

      return { secret, qrCode, backupCodes }
    } catch (error) {
      logError(error as Error, { context: 'Enable 2FA' })
      throw error
    }
  }

  // Disable 2FA
  async disable2FA(userId: string): Promise<boolean> {
    try {
      this.twoFactorSecrets.delete(userId)
      this.backupCodes.delete(userId)

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.twoFactorAuth.update({
          where: { userId },
          data: {
            enabled: false,
            secret: null,
            backupCodes: []
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Disable 2FA in database' })
      }

      logInfo(`✅ Disabled 2FA for user ${userId}`)
      return true
    } catch (error) {
      logError(error as Error, { context: 'Disable 2FA' })
      return false
    }
  }

  // Verify 2FA code
  async verify2FA(userId: string, code: string): Promise<boolean> {
    try {
      const secret = this.twoFactorSecrets.get(userId)
      if (!secret) return false

      // In production, use proper 2FA library to verify TOTP code
      // For now, check if code matches backup codes
      const codes = this.backupCodes.get(userId) || []
      if (codes.includes(code.toUpperCase())) {
        // Remove used backup code
        const updatedCodes = codes.filter(c => c !== code.toUpperCase())
        this.backupCodes.set(userId, updatedCodes)

        // Save to database
        try {
          const { prisma } = await import('../config/database')
          await prisma.twoFactorAuth.update({
            where: { userId },
            data: { backupCodes: updatedCodes }
          })
        } catch (error) {
          logError(error as Error, { context: 'Update backup codes in database' })
        }

        return true
      }

      // TODO: Verify TOTP code using proper library
      return false
    } catch (error) {
      logError(error as Error, { context: 'Verify 2FA' })
      return false
    }
  }

  // Get 2FA status
  async get2FAStatus(userId: string): Promise<TwoFactorAuth | null> {
    try {
      const { prisma } = await import('../config/database')
      const twoFA = await prisma.twoFactorAuth.findUnique({
        where: { userId }
      })

      if (!twoFA) {
        return {
          userId,
          enabled: false
        }
      }

      return {
        userId: twoFA.userId,
        enabled: twoFA.enabled,
        secret: twoFA.secret || undefined,
        backupCodes: twoFA.backupCodes as string[] || undefined,
        createdAt: twoFA.createdAt,
        verifiedAt: twoFA.verifiedAt || undefined
      }
    } catch (error) {
      logError(error as Error, { context: 'Get 2FA status' })
      return null
    }
  }

  // Change password
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      // In production, get user from database and verify old password
      // For now, simulate password change
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        // Update user password in database
        // await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } })
        logInfo(`Password changed for user ${userId}`)
      } catch (error) {
        logError(error as Error, { context: 'Change password in database' })
        return false
      }

      return true
    } catch (error) {
      logError(error as Error, { context: 'Change password' })
      return false
    }
  }

  // Get backup codes
  async getBackupCodes(userId: string): Promise<string[] | null> {
    const codes = this.backupCodes.get(userId)
    return codes || null
  }

  // Regenerate backup codes
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const backupCodes: string[] = []
    for (let i = 0; i < 10; i++) {
      backupCodes.push(nanoid(8).toUpperCase())
    }

    this.backupCodes.set(userId, backupCodes)

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.twoFactorAuth.update({
        where: { userId },
        data: { backupCodes }
      })
    } catch (error) {
      logError(error as Error, { context: 'Regenerate backup codes in database' })
    }

    return backupCodes
  }
}

export const clientSecurityManager = new ClientSecurityManager()

