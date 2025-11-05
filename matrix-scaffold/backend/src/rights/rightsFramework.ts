/**
 * Phase 9.2 - Matrix Rights & Responsibilities Framework
 * 
 * Rights and responsibilities system
 * - Platform rights and responsibilities
 * - User rights and responsibilities
 * - Vendor rights and responsibilities
 * - Developer rights and responsibilities
 * - Partner rights and responsibilities
 * - Automatic legal document generation
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type PartyType = 'platform' | 'user' | 'vendor' | 'developer' | 'partner'
export type RightType = 'access' | 'usage' | 'data' | 'privacy' | 'security' | 'support' | 'compensation'
export type ResponsibilityType = 'payment' | 'compliance' | 'security' | 'data_protection' | 'support' | 'reporting'

export interface RightsAndResponsibilities {
  id: string
  partyType: PartyType
  rights: Right[]
  responsibilities: Responsibility[]
  effectiveDate: Date
  expiresAt?: Date
  version: string
  createdAt: Date
  updatedAt: Date
}

export interface Right {
  id: string
  type: RightType
  title: string
  description: string
  scope: string
  limitations?: string[]
}

export interface Responsibility {
  id: string
  type: ResponsibilityType
  title: string
  description: string
  scope: string
  consequences?: string[]
}

export interface LegalDocument {
  id: string
  type: 'terms' | 'conditions' | 'responsibilities'
  partyType: PartyType
  language: string
  content: string
  version: string
  effectiveDate: Date
  createdAt: Date
}

class MatrixRightsAndResponsibilities {
  private frameworks: Map<string, RightsAndResponsibilities> = new Map()
  private documents: Map<string, LegalDocument> = new Map()

  async initialize() {
    logInfo('Initializing Matrix Rights & Responsibilities Framework...')

    // Initialize default frameworks
    await this.initializeDefaultFrameworks()

    logInfo('✅ Matrix Rights & Responsibilities Framework initialized')
  }

  // Initialize default frameworks
  private async initializeDefaultFrameworks(): Promise<void> {
    const partyTypes: PartyType[] = ['platform', 'user', 'vendor', 'developer', 'partner']

    for (const partyType of partyTypes) {
      await this.createFramework(partyType, this.getDefaultRights(partyType), this.getDefaultResponsibilities(partyType))
    }
  }

  // Get default rights
  private getDefaultRights(partyType: PartyType): Right[] {
    const rights: Record<PartyType, Right[]> = {
      platform: [
        {
          id: nanoid(),
          type: 'access',
          title: 'Access to User Data',
          description: 'Platform has the right to access user data for service provision',
          scope: 'Service provision and support',
          limitations: ['Only for service provision', 'With user consent', 'GDPR compliant']
        },
        {
          id: nanoid(),
          type: 'usage',
          title: 'Usage Analytics',
          description: 'Platform has the right to collect usage analytics',
          scope: 'Platform improvement',
          limitations: ['Anonymized data only', 'GDPR compliant']
        }
      ],
      user: [
        {
          id: nanoid(),
          type: 'access',
          title: 'Access to Services',
          description: 'User has the right to access services according to subscription',
          scope: 'Subscription terms',
          limitations: ['Within subscription limits']
        },
        {
          id: nanoid(),
          type: 'data',
          title: 'Data Access',
          description: 'User has the right to access their data',
          scope: 'All user data',
          limitations: ['GDPR compliant']
        },
        {
          id: nanoid(),
          type: 'privacy',
          title: 'Privacy Rights',
          description: 'User has the right to privacy',
          scope: 'All personal data',
          limitations: ['GDPR compliant']
        }
      ],
      vendor: [
        {
          id: nanoid(),
          type: 'access',
          title: 'Access to Marketplace',
          description: 'Vendor has the right to access marketplace',
          scope: 'Marketplace access',
          limitations: ['Within vendor agreement']
        },
        {
          id: nanoid(),
          type: 'compensation',
          title: 'Compensation',
          description: 'Vendor has the right to receive compensation for sales',
          scope: 'Revenue sharing',
          limitations: ['According to agreement']
        }
      ],
      developer: [
        {
          id: nanoid(),
          type: 'access',
          title: 'Access to Developer Tools',
          description: 'Developer has the right to access developer tools',
          scope: 'Developer tools and SDKs',
          limitations: ['Within developer agreement']
        },
        {
          id: nanoid(),
          type: 'compensation',
          title: 'Revenue Sharing',
          description: 'Developer has the right to receive revenue share',
          scope: 'App revenue',
          limitations: ['According to agreement']
        }
      ],
      partner: [
        {
          id: nanoid(),
          type: 'access',
          title: 'Access to Partner Portal',
          description: 'Partner has the right to access partner portal',
          scope: 'Partner portal',
          limitations: ['Within partner agreement']
        },
        {
          id: nanoid(),
          type: 'compensation',
          title: 'Commission',
          description: 'Partner has the right to receive commission',
          scope: 'Partner sales',
          limitations: ['According to agreement']
        }
      ]
    }

    return rights[partyType] || []
  }

  // Get default responsibilities
  private getDefaultResponsibilities(partyType: PartyType): Responsibility[] {
    const responsibilities: Record<PartyType, Responsibility[]> = {
      platform: [
        {
          id: nanoid(),
          type: 'security',
          title: 'Platform Security',
          description: 'Platform is responsible for maintaining security',
          scope: 'All platform services',
          consequences: ['Service suspension', 'Legal action']
        },
        {
          id: nanoid(),
          type: 'data_protection',
          title: 'Data Protection',
          description: 'Platform is responsible for protecting user data',
          scope: 'All user data',
          consequences: ['GDPR violations', 'Legal action']
        },
        {
          id: nanoid(),
          type: 'support',
          title: 'Customer Support',
          description: 'Platform is responsible for providing customer support',
          scope: 'All users',
          consequences: ['Service degradation', 'User complaints']
        }
      ],
      user: [
        {
          id: nanoid(),
          type: 'payment',
          title: 'Payment Responsibility',
          description: 'User is responsible for paying subscription fees',
          scope: 'Subscription fees',
          consequences: ['Service suspension', 'Account closure']
        },
        {
          id: nanoid(),
          type: 'compliance',
          title: 'Compliance',
          description: 'User is responsible for complying with terms of service',
          scope: 'Terms of service',
          consequences: ['Account suspension', 'Legal action']
        }
      ],
      vendor: [
        {
          id: nanoid(),
          type: 'compliance',
          title: 'Compliance',
          description: 'Vendor is responsible for complying with vendor agreement',
          scope: 'Vendor agreement',
          consequences: ['Marketplace suspension', 'Agreement termination']
        },
        {
          id: nanoid(),
          type: 'reporting',
          title: 'Sales Reporting',
          description: 'Vendor is responsible for accurate sales reporting',
          scope: 'All sales',
          consequences: ['Commission disputes', 'Agreement termination']
        }
      ],
      developer: [
        {
          id: nanoid(),
          type: 'security',
          title: 'Code Security',
          description: 'Developer is responsible for secure code',
          scope: 'All published apps',
          consequences: ['App suspension', 'Developer account suspension']
        },
        {
          id: nanoid(),
          type: 'compliance',
          title: 'Compliance',
          description: 'Developer is responsible for complying with developer agreement',
          scope: 'Developer agreement',
          consequences: ['App removal', 'Developer account suspension']
        }
      ],
      partner: [
        {
          id: nanoid(),
          type: 'compliance',
          title: 'Compliance',
          description: 'Partner is responsible for complying with partner agreement',
          scope: 'Partner agreement',
          consequences: ['Partner account suspension', 'Agreement termination']
        },
        {
          id: nanoid(),
          type: 'reporting',
          title: 'Sales Reporting',
          description: 'Partner is responsible for accurate sales reporting',
          scope: 'All partner sales',
          consequences: ['Commission disputes', 'Agreement termination']
        }
      ]
    }

    return responsibilities[partyType] || []
  }

  // Create framework
  async createFramework(
    partyType: PartyType,
    rights: Right[],
    responsibilities: Responsibility[],
    version: string = '1.0.0'
  ): Promise<RightsAndResponsibilities> {
    try {
      const frameworkId = nanoid()
      const now = new Date()

      const framework: RightsAndResponsibilities = {
        id: frameworkId,
        partyType,
        rights,
        responsibilities,
        effectiveDate: now,
        version,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.rightsAndResponsibilities.create({
          data: {
            id: frameworkId,
            partyType,
            rights: rights,
            responsibilities: responsibilities,
            effectiveDate: now,
            expiresAt: null,
            version
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create framework in database' })
      }

      this.frameworks.set(frameworkId, framework)

      // Generate legal documents
      await this.generateLegalDocuments(framework)

      logInfo(`✅ Created rights and responsibilities framework ${frameworkId} for ${partyType}`)

      return framework
    } catch (error) {
      logError(error as Error, { context: 'Create framework' })
      throw error
    }
  }

  // Generate legal documents
  private async generateLegalDocuments(framework: RightsAndResponsibilities): Promise<void> {
    try {
      const languages = ['en', 'ar', 'nl', 'zh']

      for (const language of languages) {
        // Generate Terms document
        const termsDoc = await this.generateDocument(
          'terms',
          framework.partyType,
          language,
          framework
        )
        this.documents.set(`${framework.partyType}_terms_${language}`, termsDoc)

        // Generate Conditions document
        const conditionsDoc = await this.generateDocument(
          'conditions',
          framework.partyType,
          language,
          framework
        )
        this.documents.set(`${framework.partyType}_conditions_${language}`, conditionsDoc)

        // Generate Responsibilities document
        const responsibilitiesDoc = await this.generateDocument(
          'responsibilities',
          framework.partyType,
          language,
          framework
        )
        this.documents.set(`${framework.partyType}_responsibilities_${language}`, responsibilitiesDoc)
      }
    } catch (error) {
      logError(error as Error, { context: 'Generate legal documents' })
    }
  }

  // Generate document
  private async generateDocument(
    type: 'terms' | 'conditions' | 'responsibilities',
    partyType: PartyType,
    language: string,
    framework: RightsAndResponsibilities
  ): Promise<LegalDocument> {
    try {
      const docId = nanoid()
      const now = new Date()

      let content = ''
      if (type === 'terms') {
        content = this.generateTermsContent(framework, language)
      } else if (type === 'conditions') {
        content = this.generateConditionsContent(framework, language)
      } else {
        content = this.generateResponsibilitiesContent(framework, language)
      }

      const document: LegalDocument = {
        id: docId,
        type,
        partyType,
        language,
        content,
        version: framework.version,
        effectiveDate: framework.effectiveDate,
        createdAt: now
      }

      return document
    } catch (error) {
      logError(error as Error, { context: 'Generate document' })
      throw error
    }
  }

  // Generate terms content
  private generateTermsContent(framework: RightsAndResponsibilities, language: string): string {
    // In production, use template engine with translations
    return `# Terms of Service - ${framework.partyType}\n\nLanguage: ${language}\n\nRights:\n${framework.rights.map(r => `- ${r.title}: ${r.description}`).join('\n')}`
  }

  // Generate conditions content
  private generateConditionsContent(framework: RightsAndResponsibilities, language: string): string {
    // In production, use template engine with translations
    return `# Conditions - ${framework.partyType}\n\nLanguage: ${language}\n\nConditions apply to all ${framework.partyType} interactions.`
  }

  // Generate responsibilities content
  private generateResponsibilitiesContent(framework: RightsAndResponsibilities, language: string): string {
    // In production, use template engine with translations
    return `# Responsibilities - ${framework.partyType}\n\nLanguage: ${language}\n\nResponsibilities:\n${framework.responsibilities.map(r => `- ${r.title}: ${r.description}`).join('\n')}`
  }

  // Get framework
  async getFramework(partyType: PartyType): Promise<RightsAndResponsibilities | null> {
    for (const framework of this.frameworks.values()) {
      if (framework.partyType === partyType) {
        return framework
      }
    }
    return null
  }

  // Get document
  async getDocument(
    partyType: PartyType,
    type: 'terms' | 'conditions' | 'responsibilities',
    language: string
  ): Promise<LegalDocument | null> {
    return this.documents.get(`${partyType}_${type}_${language}`) || null
  }
}

export const matrixRightsAndResponsibilities = new MatrixRightsAndResponsibilities()

