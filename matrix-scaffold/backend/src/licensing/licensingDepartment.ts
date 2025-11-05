/**
 * Phase 9.2 - Matrix Licensing & Certification Department
 * 
 * Centralized license management
 * - Application licenses
 * - AI licenses
 * - Partner and developer licenses
 * - Automatic license key generation
 * - License period management
 * - Automatic renewal and verification
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type LicenseType = 'application' | 'ai' | 'partner' | 'developer' | 'custom'
export type LicenseStatus = 'pending' | 'active' | 'expired' | 'suspended' | 'revoked'
export type LicensePeriod = 'monthly' | 'yearly' | 'lifetime' | 'custom'

export interface MatrixLicense {
  id: string
  type: LicenseType
  entityId: string // appId, aiId, partnerId, developerId
  entityType: string // app, ai, partner, developer
  status: LicenseStatus
  licenseKey: string
  token?: string
  period: LicensePeriod
  startDate: Date
  endDate?: Date
  autoRenew: boolean
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface LicenseVerification {
  id: string
  licenseId: string
  licenseKey: string
  verified: boolean
  verifiedAt: Date
  ipAddress?: string
  userAgent?: string
  error?: string
}

class MatrixLicensingDepartment {
  private licenses: Map<string, MatrixLicense> = new Map()
  private verifications: Map<string, LicenseVerification> = new Map()

  async initialize() {
    logInfo('Initializing Matrix Licensing & Certification Department...')

    // Start license monitoring
    this.startLicenseMonitoring()

    logInfo('✅ Matrix Licensing & Certification Department initialized')
  }

  // Create license
  async createLicense(
    type: LicenseType,
    entityId: string,
    entityType: string,
    period: LicensePeriod,
    autoRenew: boolean = true,
    metadata?: Record<string, any>
  ): Promise<MatrixLicense> {
    try {
      const licenseId = nanoid()
      const licenseKey = `MX-${type.toUpperCase()}-${nanoid(16).toUpperCase()}`
      const token = nanoid(32)
      const now = new Date()

      let endDate: Date | undefined
      if (period === 'monthly') {
        endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      } else if (period === 'yearly') {
        endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      } else if (period === 'lifetime') {
        endDate = undefined
      }

      const license: MatrixLicense = {
        id: licenseId,
        type,
        entityId,
        entityType,
        status: 'active',
        licenseKey,
        token,
        period,
        startDate: now,
        endDate,
        autoRenew,
        metadata: metadata || {},
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.matrixLicense.create({
          data: {
            id: licenseId,
            type,
            entityId,
            entityType,
            status: 'active',
            licenseKey,
            token: token,
            period,
            startDate: now,
            endDate: endDate || null,
            autoRenew,
            metadata: metadata || {}
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create license in database' })
      }

      this.licenses.set(licenseId, license)

      logInfo(`✅ Created license ${licenseId} for ${entityType} ${entityId}`)

      return license
    } catch (error) {
      logError(error as Error, { context: 'Create license' })
      throw error
    }
  }

  // Verify license
  async verifyLicense(
    licenseKey: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LicenseVerification> {
    try {
      const verificationId = nanoid()
      const now = new Date()

      // Find license
      let verified = false
      let license: MatrixLicense | null = null
      let error: string | undefined

      for (const lic of this.licenses.values()) {
        if (lic.licenseKey === licenseKey) {
          license = lic

          // Check status
          if (lic.status !== 'active') {
            error = `License status is ${lic.status}`
            break
          }

          // Check expiration
          if (lic.endDate && lic.endDate < now) {
            if (lic.autoRenew) {
              await this.renewLicense(lic.id)
            } else {
              lic.status = 'expired'
              error = 'License has expired'
              break
            }
          }

          verified = true
          break
        }
      }

      if (!license) {
        error = 'License not found'
      }

      const verification: LicenseVerification = {
        id: verificationId,
        licenseId: license?.id || '',
        licenseKey,
        verified,
        verifiedAt: now,
        ipAddress,
        userAgent,
        error
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.licenseVerification.create({
          data: {
            id: verificationId,
            licenseId: license?.id || '',
            licenseKey,
            verified,
            verifiedAt: now,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            error: error || null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Verify license in database' })
      }

      this.verifications.set(verificationId, verification)

      logInfo(`✅ Verified license ${licenseKey}: ${verified ? 'valid' : 'invalid'}`)

      return verification
    } catch (error) {
      logError(error as Error, { context: 'Verify license' })
      throw error
    }
  }

  // Renew license
  async renewLicense(licenseId: string): Promise<boolean> {
    try {
      const license = this.licenses.get(licenseId)
      if (!license) return false

      if (license.period === 'lifetime') return true

      const now = new Date()
      let newEndDate: Date

      if (license.period === 'monthly') {
        newEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      } else if (license.period === 'yearly') {
        newEndDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      } else {
        return false
      }

      license.endDate = newEndDate
      license.status = 'active'
      license.updatedAt = now

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.matrixLicense.update({
          where: { id: licenseId },
          data: {
            status: 'active',
            endDate: newEndDate,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Renew license in database' })
      }

      this.licenses.set(licenseId, license)

      logInfo(`✅ Renewed license ${licenseId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Renew license' })
      return false
    }
  }

  // Start license monitoring
  private startLicenseMonitoring(): void {
    // Monitor licenses daily
    setInterval(async () => {
      try {
        for (const license of this.licenses.values()) {
          // Check expiration
          if (license.endDate && license.endDate < new Date() && license.status === 'active') {
            if (license.autoRenew) {
              await this.renewLicense(license.id)
            } else {
              license.status = 'expired'
              license.updatedAt = new Date()

              // Update database
              try {
                const { prisma } = await import('../config/database')
                await prisma.matrixLicense.update({
                  where: { id: license.id },
                  data: {
                    status: 'expired',
                    updatedAt: license.updatedAt
                  }
                })
              } catch (error) {
                logError(error as Error, { context: 'Expire license in database' })
              }

              this.licenses.set(license.id, license)
            }
          }

          // Alert if expires within 7 days
          if (license.endDate) {
            const daysUntilExpiry = Math.floor(
              (license.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
            if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
              logError(new Error(`License ${license.id} expires in ${daysUntilExpiry} days`), {
                context: 'License Monitoring'
              })
            }
          }
        }
      } catch (error) {
        logError(error as Error, { context: 'License monitoring' })
      }
    }, 24 * 60 * 60 * 1000) // Daily
  }

  // Get license
  async getLicense(licenseId: string): Promise<MatrixLicense | null> {
    return this.licenses.get(licenseId) || null
  }

  // Get licenses by entity
  async getLicensesByEntity(entityId: string, entityType: string): Promise<MatrixLicense[]> {
    const licenses: MatrixLicense[] = []
    for (const license of this.licenses.values()) {
      if (license.entityId === entityId && license.entityType === entityType) {
        licenses.push(license)
      }
    }
    return licenses
  }

  // Revoke license
  async revokeLicense(licenseId: string): Promise<boolean> {
    try {
      const license = this.licenses.get(licenseId)
      if (!license) return false

      license.status = 'revoked'
      license.updatedAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.matrixLicense.update({
          where: { id: licenseId },
          data: {
            status: 'revoked',
            updatedAt: license.updatedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Revoke license in database' })
      }

      this.licenses.set(licenseId, license)

      logInfo(`✅ Revoked license ${licenseId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Revoke license' })
      return false
    }
  }
}

export const matrixLicensingDepartment = new MatrixLicensingDepartment()

