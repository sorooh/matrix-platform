/**
 * Phase 9.1 - Legal Documentation Center
 * 
 * Unified legal documentation center
 * - Terms of Service
 * - Privacy Policy
 * - Cookie Policy
 * - Developer Agreement
 * - Data Processing Agreement (DPA)
 * - Refund & Payment Policy
 * - Multi-language support
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type DocumentType = 'terms_of_service' | 'privacy_policy' | 'cookie_policy' | 'developer_agreement' | 'dpa' | 'refund_policy'
export type DocumentLanguage = 'en' | 'ar' | 'nl' | 'zh' | 'fr' | 'de' | 'es' | 'ja'
export type DocumentStatus = 'draft' | 'published' | 'archived'

export interface LegalDocument {
  id: string
  type: DocumentType
  language: DocumentLanguage
  version: string
  status: DocumentStatus
  title: string
  content: string // HTML or Markdown
  effectiveDate: Date
  expiresAt?: Date
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface DocumentVersion {
  id: string
  documentId: string
  version: string
  content: string
  changes: string[]
  effectiveDate: Date
  createdAt: Date
}

class LegalDocumentationCenter {
  private documents: Map<string, LegalDocument> = new Map()
  private versions: Map<string, DocumentVersion[]> = new Map()

  async initialize() {
    logInfo('Initializing Legal Documentation Center...')

    // Initialize default documents
    await this.initializeDefaultDocuments()

    logInfo('✅ Legal Documentation Center initialized')
  }

  // Initialize default documents
  private async initializeDefaultDocuments(): Promise<void> {
    const documentTypes: DocumentType[] = [
      'terms_of_service',
      'privacy_policy',
      'cookie_policy',
      'developer_agreement',
      'dpa',
      'refund_policy'
    ]

    const languages: DocumentLanguage[] = ['en', 'ar', 'nl', 'zh']

    for (const type of documentTypes) {
      for (const language of languages) {
        await this.createDocument(
          type,
          language,
          this.getDefaultContent(type, language),
          this.getDefaultTitle(type, language)
        )
      }
    }
  }

  // Get default title
  private getDefaultTitle(type: DocumentType, language: DocumentLanguage): string {
    const titles: Record<DocumentType, Record<DocumentLanguage, string>> = {
      terms_of_service: {
        en: 'Terms of Service',
        ar: 'شروط الخدمة',
        nl: 'Servicevoorwaarden',
        zh: '服务条款',
        fr: 'Conditions de service',
        de: 'Nutzungsbedingungen',
        es: 'Términos de servicio',
        ja: '利用規約'
      },
      privacy_policy: {
        en: 'Privacy Policy',
        ar: 'سياسة الخصوصية',
        nl: 'Privacybeleid',
        zh: '隐私政策',
        fr: 'Politique de confidentialité',
        de: 'Datenschutzrichtlinie',
        es: 'Política de privacidad',
        ja: 'プライバシーポリシー'
      },
      cookie_policy: {
        en: 'Cookie Policy',
        ar: 'سياسة ملفات تعريف الارتباط',
        nl: 'Cookiebeleid',
        zh: 'Cookie政策',
        fr: 'Politique de cookies',
        de: 'Cookie-Richtlinie',
        es: 'Política de cookies',
        ja: 'クッキーポリシー'
      },
      developer_agreement: {
        en: 'Developer Agreement',
        ar: 'اتفاقية المطور',
        nl: 'Ontwikkelaarsovereenkomst',
        zh: '开发者协议',
        fr: 'Accord développeur',
        de: 'Entwicklervereinbarung',
        es: 'Acuerdo de desarrollador',
        ja: '開発者契約'
      },
      dpa: {
        en: 'Data Processing Agreement',
        ar: 'اتفاقية معالجة البيانات',
        nl: 'Gegevensverwerkingsovereenkomst',
        zh: '数据处理协议',
        fr: 'Accord de traitement des données',
        de: 'Datenverarbeitungsvereinbarung',
        es: 'Acuerdo de procesamiento de datos',
        ja: 'データ処理契約'
      },
      refund_policy: {
        en: 'Refund & Payment Policy',
        ar: 'سياسة الاسترداد والدفع',
        nl: 'Restitutie- en betalingsbeleid',
        zh: '退款和支付政策',
        fr: 'Politique de remboursement et de paiement',
        de: 'Rückerstattungs- und Zahlungsrichtlinie',
        es: 'Política de reembolso y pago',
        ja: '返金と支払いポリシー'
      }
    }
    return titles[type]?.[language] || type
  }

  // Get default content
  private getDefaultContent(type: DocumentType, language: DocumentLanguage): string {
    // In production, load from template files
    // For now, return placeholder
    return `# ${this.getDefaultTitle(type, language)}\n\n${type} content in ${language}`
  }

  // Create document
  async createDocument(
    type: DocumentType,
    language: DocumentLanguage,
    content: string,
    title: string,
    version: string = '1.0.0'
  ): Promise<LegalDocument> {
    try {
      const docId = nanoid()
      const now = new Date()

      const document: LegalDocument = {
        id: docId,
        type,
        language,
        version,
        status: 'draft',
        title,
        content,
        effectiveDate: now,
        metadata: {},
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.legalDocument.create({
          data: {
            id: docId,
            type,
            language,
            version,
            status: 'draft',
            title,
            content,
            effectiveDate: now,
            expiresAt: null,
            metadata: {}
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create document in database' })
      }

      this.documents.set(docId, document)

      logInfo(`✅ Created legal document ${docId}: ${type} - ${language}`)

      return document
    } catch (error) {
      logError(error as Error, { context: 'Create document' })
      throw error
    }
  }

  // Publish document
  async publishDocument(docId: string, effectiveDate?: Date): Promise<boolean> {
    try {
      const document = this.documents.get(docId)
      if (!document) return false

      // Archive previous version
      const previousVersion = await this.findPublishedVersion(document.type, document.language)
      if (previousVersion) {
        previousVersion.status = 'archived'
        this.documents.set(previousVersion.id, previousVersion)
      }

      document.status = 'published'
      document.effectiveDate = effectiveDate || new Date()
      document.updatedAt = new Date()

      // Create version
      const versionId = nanoid()
      const version: DocumentVersion = {
        id: versionId,
        documentId: docId,
        version: document.version,
        content: document.content,
        changes: ['Initial publication'],
        effectiveDate: document.effectiveDate,
        createdAt: new Date()
      }

      const versions = this.versions.get(docId) || []
      versions.push(version)
      this.versions.set(docId, versions)

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.legalDocument.update({
          where: { id: docId },
          data: {
            status: 'published',
            effectiveDate: document.effectiveDate,
            updatedAt: document.updatedAt
          }
        })

        await prisma.documentVersion.create({
          data: {
            id: versionId,
            documentId: docId,
            version: document.version,
            content: document.content,
            changes: ['Initial publication'],
            effectiveDate: document.effectiveDate
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Publish document in database' })
      }

      this.documents.set(docId, document)

      logInfo(`✅ Published legal document ${docId}: ${document.type} - ${document.language}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Publish document' })
      return false
    }
  }

  // Find published version
  private async findPublishedVersion(type: DocumentType, language: DocumentLanguage): Promise<LegalDocument | null> {
    for (const doc of this.documents.values()) {
      if (doc.type === type && doc.language === language && doc.status === 'published') {
        return doc
      }
    }
    return null
  }

  // Update document
  async updateDocument(
    docId: string,
    content: string,
    changes: string[],
    newVersion: string
  ): Promise<LegalDocument> {
    try {
      const document = this.documents.get(docId)
      if (!document) throw new Error('Document not found')

      // Create new version
      const versionId = nanoid()
      const version: DocumentVersion = {
        id: versionId,
        documentId: docId,
        version: document.version,
        content: document.content,
        changes,
        effectiveDate: document.effectiveDate,
        createdAt: new Date()
      }

      const versions = this.versions.get(docId) || []
      versions.push(version)
      this.versions.set(docId, versions)

      // Update document
      document.version = newVersion
      document.content = content
      document.status = 'draft'
      document.updatedAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.legalDocument.update({
          where: { id: docId },
          data: {
            version: newVersion,
            content,
            status: 'draft',
            updatedAt: document.updatedAt
          }
        })

        await prisma.documentVersion.create({
          data: {
            id: versionId,
            documentId: docId,
            version: document.version,
            content: version.content,
            changes,
            effectiveDate: document.effectiveDate
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Update document in database' })
      }

      this.documents.set(docId, document)

      logInfo(`✅ Updated legal document ${docId} to version ${newVersion}`)

      return document
    } catch (error) {
      logError(error as Error, { context: 'Update document' })
      throw error
    }
  }

  // Get document
  async getDocument(type: DocumentType, language: DocumentLanguage): Promise<LegalDocument | null> {
    for (const doc of this.documents.values()) {
      if (doc.type === type && doc.language === language && doc.status === 'published') {
        return doc
      }
    }
    return null
  }

  // Get document versions
  async getDocumentVersions(docId: string): Promise<DocumentVersion[]> {
    return this.versions.get(docId) || []
  }
}

export const legalDocumentationCenter = new LegalDocumentationCenter()
