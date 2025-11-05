/**
 * Phase 9.1 - Security & Certification Management
 * 
 * Security certifications management
 * - ISO 27001
 * - SOC 2 Type II
 * - HIPAA Compliance
 * - PCI-DSS
 * - Certificate storage and renewal
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type CertificationType = 'ISO27001' | 'SOC2' | 'HIPAA' | 'PCI-DSS' | 'GDPR' | 'CUSTOM'
export type CertificationStatus = 'pending' | 'issued' | 'expired' | 'revoked' | 'suspended'

export interface SecurityCertification {
  id: string
  type: CertificationType
  status: CertificationStatus
  issuer: string
  certificateNumber: string
  issuedAt: Date
  expiresAt: Date
  autoRenew: boolean
  documentUrl?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface CertificationRequirement {
  id: string
  certificationType: CertificationType
  name: string
  description: string
  status: 'pending' | 'met' | 'not_met'
  evidence?: string
  checkedAt?: Date
}

class SecurityCertificationManager {
  private certifications: Map<string, SecurityCertification> = new Map()
  private requirements: Map<string, CertificationRequirement[]> = new Map()

  async initialize() {
    logInfo('Initializing Security & Certification Management...')

    // Initialize default certifications
    await this.initializeDefaultCertifications()

    // Start certificate monitoring
    this.startCertificateMonitoring()

    logInfo('✅ Security & Certification Management initialized')
  }

  // Initialize default certifications
  private async initializeDefaultCertifications(): Promise<void> {
    const defaultCertifications: Omit<SecurityCertification, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        type: 'ISO27001',
        status: 'pending',
        issuer: 'ISO',
        certificateNumber: 'ISO-27001-PENDING',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        autoRenew: true
      },
      {
        type: 'SOC2',
        status: 'pending',
        issuer: 'AICPA',
        certificateNumber: 'SOC2-PENDING',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        autoRenew: true
      },
      {
        type: 'HIPAA',
        status: 'pending',
        issuer: 'HHS',
        certificateNumber: 'HIPAA-PENDING',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        autoRenew: true
      },
      {
        type: 'PCI-DSS',
        status: 'pending',
        issuer: 'PCI SSC',
        certificateNumber: 'PCI-DSS-PENDING',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        autoRenew: true
      }
    ]

    for (const cert of defaultCertifications) {
      const certId = nanoid()
      const now = new Date()

      const certification: SecurityCertification = {
        id: certId,
        ...cert,
        createdAt: now,
        updatedAt: now
      }

      this.certifications.set(certId, certification)

      // Initialize requirements
      await this.initializeRequirements(certId, cert.type)
    }
  }

  // Initialize requirements
  private async initializeRequirements(certId: string, type: CertificationType): Promise<void> {
    const requirements: Omit<CertificationRequirement, 'id'>[] = []

    if (type === 'ISO27001') {
      requirements.push(
        {
          certificationType: 'ISO27001',
          name: 'Information Security Management System',
          description: 'ISMS is implemented and documented',
          status: 'pending'
        },
        {
          certificationType: 'ISO27001',
          name: 'Risk Assessment',
          description: 'Regular risk assessments are conducted',
          status: 'pending'
        },
        {
          certificationType: 'ISO27001',
          name: 'Access Controls',
          description: 'Access controls are properly implemented',
          status: 'pending'
        }
      )
    } else if (type === 'SOC2') {
      requirements.push(
        {
          certificationType: 'SOC2',
          name: 'Security Controls',
          description: 'Security controls are in place',
          status: 'pending'
        },
        {
          certificationType: 'SOC2',
          name: 'Availability Controls',
          description: 'Availability controls are in place',
          status: 'pending'
        },
        {
          certificationType: 'SOC2',
          name: 'Processing Integrity',
          description: 'Processing integrity is maintained',
          status: 'pending'
        }
      )
    } else if (type === 'HIPAA') {
      requirements.push(
        {
          certificationType: 'HIPAA',
          name: 'Administrative Safeguards',
          description: 'Administrative safeguards are in place',
          status: 'pending'
        },
        {
          certificationType: 'HIPAA',
          name: 'Physical Safeguards',
          description: 'Physical safeguards are in place',
          status: 'pending'
        },
        {
          certificationType: 'HIPAA',
          name: 'Technical Safeguards',
          description: 'Technical safeguards are in place',
          status: 'pending'
        }
      )
    } else if (type === 'PCI-DSS') {
      requirements.push(
        {
          certificationType: 'PCI-DSS',
          name: 'Build and Maintain Secure Network',
          description: 'Secure network is maintained',
          status: 'pending'
        },
        {
          certificationType: 'PCI-DSS',
          name: 'Protect Cardholder Data',
          description: 'Cardholder data is protected',
          status: 'pending'
        },
        {
          certificationType: 'PCI-DSS',
          name: 'Maintain Vulnerability Management',
          description: 'Vulnerability management is maintained',
          status: 'pending'
        }
      )
    }

    const reqs: CertificationRequirement[] = []
    for (const req of requirements) {
      const reqId = nanoid()
      const requirement: CertificationRequirement = {
        id: reqId,
        ...req
      }
      reqs.push(requirement)
    }

    this.requirements.set(certId, reqs)
  }

  // Register certification
  async registerCertification(
    type: CertificationType,
    issuer: string,
    certificateNumber: string,
    issuedAt: Date,
    expiresAt: Date,
    autoRenew: boolean = true,
    documentUrl?: string
  ): Promise<SecurityCertification> {
    try {
      const certId = nanoid()
      const now = new Date()

      const certification: SecurityCertification = {
        id: certId,
        type,
        status: 'issued',
        issuer,
        certificateNumber,
        issuedAt,
        expiresAt,
        autoRenew,
        documentUrl,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.securityCertification.create({
          data: {
            id: certId,
            type,
            status: 'issued',
            issuer,
            certificateNumber,
            issuedAt,
            expiresAt,
            autoRenew,
            documentUrl: documentUrl || null,
            notes: null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Register certification in database' })
      }

      this.certifications.set(certId, certification)

      logInfo(`✅ Registered certification ${certId}: ${type} - ${certificateNumber}`)

      return certification
    } catch (error) {
      logError(error as Error, { context: 'Register certification' })
      throw error
    }
  }

  // Renew certification
  async renewCertification(certId: string): Promise<boolean> {
    try {
      const certification = this.certifications.get(certId)
      if (!certification) return false

      // In production, renew via certification body
      const now = new Date()
      certification.issuedAt = now
      certification.expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 year
      certification.status = 'issued'
      certification.updatedAt = now

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.securityCertification.update({
          where: { id: certId },
          data: {
            status: 'issued',
            issuedAt: certification.issuedAt,
            expiresAt: certification.expiresAt,
            updatedAt: certification.updatedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Renew certification in database' })
      }

      this.certifications.set(certId, certification)

      logInfo(`✅ Renewed certification ${certId}: ${certification.type}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Renew certification' })
      return false
    }
  }

  // Check requirement
  async checkRequirement(certId: string, requirementId: string, status: 'met' | 'not_met', evidence?: string): Promise<boolean> {
    try {
      const requirements = this.requirements.get(certId) || []
      const requirement = requirements.find(r => r.id === requirementId)
      if (!requirement) return false

      requirement.status = status
      requirement.evidence = evidence
      requirement.checkedAt = new Date()

      this.requirements.set(certId, requirements)

      // Check if all requirements are met
      const allMet = requirements.every(r => r.status === 'met')
      if (allMet) {
        const certification = this.certifications.get(certId)
        if (certification) {
          certification.status = 'issued'
          this.certifications.set(certId, certification)
        }
      }

      logInfo(`✅ Checked requirement ${requirementId} for certification ${certId}: ${status}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Check requirement' })
      return false
    }
  }

  // Start certificate monitoring
  private startCertificateMonitoring(): void {
    // Check certificates daily
    setInterval(async () => {
      try {
        for (const certification of this.certifications.values()) {
          const daysUntilExpiry = Math.floor(
            (certification.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )

          // Renew if expires within 30 days
          if (daysUntilExpiry <= 30 && certification.autoRenew) {
            await this.renewCertification(certification.id)
          }

          // Alert if expires within 7 days
          if (daysUntilExpiry <= 7) {
            logError(new Error(`Certificate ${certification.id} expires in ${daysUntilExpiry} days`), {
              context: 'Certificate Monitoring'
            })
          }

          // Mark as expired
          if (daysUntilExpiry <= 0 && certification.status === 'issued') {
            certification.status = 'expired'
            certification.updatedAt = new Date()
            this.certifications.set(certification.id, certification)
          }
        }
      } catch (error) {
        logError(error as Error, { context: 'Certificate monitoring' })
      }
    }, 24 * 60 * 60 * 1000) // Daily
  }

  // Get certification
  async getCertification(certId: string): Promise<SecurityCertification | null> {
    return this.certifications.get(certId) || null
  }

  // Get requirements
  async getRequirements(certId: string): Promise<CertificationRequirement[]> {
    return this.requirements.get(certId) || []
  }

  // Get certifications by type
  async getCertificationsByType(type: CertificationType): Promise<SecurityCertification[]> {
    const certifications: SecurityCertification[] = []
    for (const cert of this.certifications.values()) {
      if (cert.type === type) {
        certifications.push(cert)
      }
    }
    return certifications
  }
}

export const securityCertificationManager = new SecurityCertificationManager()

