/**
 * Phase 9.2 - Smart Legal Contracts Engine
 * 
 * Multilingual legal automation
 * - Automatic contract generation
 * - Multi-language support
 * - Digital signatures
 * - Immutable ledger
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'
import * as crypto from 'crypto'

export type ContractType = 'sale' | 'lease' | 'license' | 'development' | 'maintenance' | 'reseller' | 'partner'
export type ContractLanguage = 'en' | 'ar' | 'nl' | 'zh' | 'fr' | 'hi' | 'de' | 'es' | 'ja'
export type ContractStatus = 'draft' | 'pending' | 'signed' | 'active' | 'expired' | 'terminated'

export interface SmartContract {
  id: string
  type: ContractType
  matrixLegalId: string // Unique Matrix Legal ID
  parties: ContractParty[]
  languages: ContractLanguage[]
  primaryLanguage: 'en' // English is always the legal reference
  content: Record<ContractLanguage, string>
  status: ContractStatus
  signedAt?: Date
  expiresAt?: Date
  hash: string // SHA-256 hash
  createdAt: Date
  updatedAt: Date
}

export interface ContractParty {
  id: string
  type: 'platform' | 'user' | 'vendor' | 'developer' | 'partner'
  name: string
  country: string
  language: ContractLanguage
  signature?: DigitalSignature
}

export interface DigitalSignature {
  partyId: string
  signature: string
  signedAt: Date
  ipAddress?: string
  userAgent?: string
}

export interface ContractAddendum {
  id: string
  contractId: string
  type: 'renewal' | 'modification' | 'termination'
  content: Record<ContractLanguage, string>
  signedAt: Date
  hash: string
}

class SmartLegalContractsEngine {
  private contracts: Map<string, SmartContract> = new Map()
  private addendums: Map<string, ContractAddendum[]> = new Map()

  async initialize() {
    logInfo('Initializing Smart Legal Contracts Engine...')
    logInfo('✅ Smart Legal Contracts Engine initialized')
  }

  // Generate contract
  async generateContract(
    type: ContractType,
    parties: Omit<ContractParty, 'id' | 'signature'>[],
    template: string
  ): Promise<SmartContract> {
    try {
      const contractId = nanoid()
      const matrixLegalId = `MX-LEGAL-${nanoid(16).toUpperCase()}`
      const now = new Date()

      // Determine required languages
      const languages = this.determineLanguages(parties)
      const primaryLanguage: 'en' = 'en'

      // Generate contract content for each language
      const content: Record<ContractLanguage, string> = {} as Record<ContractLanguage, string>
      for (const language of languages) {
        content[language] = await this.generateContractContent(type, parties, language, template)
      }

      // Calculate hash
      const contractData = JSON.stringify({ type, parties, content, createdAt: now.toISOString() })
      const hash = crypto.createHash('sha256').update(contractData).digest('hex')

      const contract: SmartContract = {
        id: contractId,
        type,
        matrixLegalId,
        parties: parties.map(p => ({ ...p, id: nanoid(), signature: undefined })),
        languages,
        primaryLanguage,
        content,
        status: 'draft',
        hash,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.smartContract.create({
          data: {
            id: contractId,
            type,
            matrixLegalId,
            parties: contract.parties,
            languages: languages,
            primaryLanguage: 'en',
            content: content,
            status: 'draft',
            hash,
            expiresAt: null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Generate contract in database' })
      }

      this.contracts.set(contractId, contract)

      logInfo(`✅ Generated contract ${contractId} (${matrixLegalId})`)

      return contract
    } catch (error) {
      logError(error as Error, { context: 'Generate contract' })
      throw error
    }
  }

  // Determine required languages
  private determineLanguages(parties: Omit<ContractParty, 'id' | 'signature'>[]): ContractLanguage[] {
    const languages: Set<ContractLanguage> = new Set(['en']) // English is always included

    for (const party of parties) {
      languages.add(party.language)
    }

    return Array.from(languages)
  }

  // Generate contract content
  private async generateContractContent(
    type: ContractType,
    parties: Omit<ContractParty, 'id' | 'signature'>[],
    language: ContractLanguage,
    template: string
  ): Promise<string> {
    // In production, use template engine with translations
    const templates: Record<ContractType, Record<ContractLanguage, string>> = {
      sale: {
        en: `# App Sale Agreement\n\nBetween ${parties.map(p => p.name).join(' and ')}\n\nThis agreement transfers ownership of the application.`,
        ar: `# اتفاقية بيع التطبيق\n\nبين ${parties.map(p => p.name).join(' و ')}\n\nتتضمن هذه الاتفاقية نقل ملكية التطبيق.`,
        nl: `# App Verkoopovereenkomst\n\nTussen ${parties.map(p => p.name).join(' en ')}\n\nDeze overeenkomst draagt het eigendom van de applicatie over.`,
        zh: `# 应用销售协议\n\n${parties.map(p => p.name).join(' 和 ')} 之间\n\n本协议转让应用程序的所有权。`,
        fr: `# Contrat de vente d'application\n\nEntre ${parties.map(p => p.name).join(' et ')}\n\nCet accord transfère la propriété de l'application.`,
        hi: `# ऐप बिक्री समझौता\n\n${parties.map(p => p.name).join(' और ')} के बीच\n\nयह समझौता एप्लिकेशन का स्वामित्व स्थानांतरित करता है।`,
        de: `# App-Verkaufsvertrag\n\nZwischen ${parties.map(p => p.name).join(' und ')}\n\nDieser Vertrag überträgt das Eigentum an der Anwendung.`,
        es: `# Acuerdo de venta de aplicación\n\nEntre ${parties.map(p => p.name).join(' y ')}\n\nEste acuerdo transfiere la propiedad de la aplicación.`,
        ja: `# アプリ販売契約\n\n${parties.map(p => p.name).join(' と ')} の間\n\nこの契約は、アプリケーションの所有権を譲渡します。`
      },
      lease: { en: '', ar: '', nl: '', zh: '', fr: '', hi: '', de: '', es: '', ja: '' },
      license: { en: '', ar: '', nl: '', zh: '', fr: '', hi: '', de: '', es: '', ja: '' },
      development: { en: '', ar: '', nl: '', zh: '', fr: '', hi: '', de: '', es: '', ja: '' },
      maintenance: { en: '', ar: '', nl: '', zh: '', fr: '', hi: '', de: '', es: '', ja: '' },
      reseller: { en: '', ar: '', nl: '', zh: '', fr: '', hi: '', de: '', es: '', ja: '' },
      partner: { en: '', ar: '', nl: '', zh: '', fr: '', hi: '', de: '', es: '', ja: '' }
    }

    return templates[type]?.[language] || template
  }

  // Sign contract
  async signContract(
    contractId: string,
    partyId: string,
    signature: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      const contract = this.contracts.get(contractId)
      if (!contract) return false

      const party = contract.parties.find(p => p.id === partyId)
      if (!party) return false

      const digitalSignature: DigitalSignature = {
        partyId,
        signature,
        signedAt: new Date(),
        ipAddress,
        userAgent
      }

      party.signature = digitalSignature

      // Check if all parties have signed
      const allSigned = contract.parties.every(p => p.signature !== undefined)
      if (allSigned) {
        contract.status = 'signed'
        contract.signedAt = new Date()
      }

      contract.updatedAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.smartContract.update({
          where: { id: contractId },
          data: {
            parties: contract.parties,
            status: contract.status,
            signedAt: contract.signedAt,
            updatedAt: contract.updatedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Sign contract in database' })
      }

      this.contracts.set(contractId, contract)

      logInfo(`✅ Signed contract ${contractId} by party ${partyId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Sign contract' })
      return false
    }
  }

  // Get contract
  async getContract(contractId: string): Promise<SmartContract | null> {
    return this.contracts.get(contractId) || null
  }

  // Get contract by Matrix Legal ID
  async getContractByMatrixLegalId(matrixLegalId: string): Promise<SmartContract | null> {
    for (const contract of this.contracts.values()) {
      if (contract.matrixLegalId === matrixLegalId) {
        return contract
      }
    }
    return null
  }
}

export const smartLegalContractsEngine = new SmartLegalContractsEngine()

