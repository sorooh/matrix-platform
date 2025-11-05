/**
 * Phase 10.3 - Comprehensive Documentation Center
 * 
 * User guides, API documentation, tutorials, examples
 * - User guides
 * - API documentation with examples
 * - Video tutorials
 * - Interactive examples
 * - Best practices
 * - FAQ system
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type DocumentationType = 'user_guide' | 'api_doc' | 'tutorial' | 'example' | 'best_practice' | 'faq'
export type DocumentationLanguage = 'ar' | 'en' | 'nl' | 'cn'
export type DocumentationStatus = 'draft' | 'published' | 'archived'

export interface Documentation {
  id: string
  type: DocumentationType
  title: string
  content: string // Markdown or HTML
  language: DocumentationLanguage
  category: string
  tags: string[]
  status: DocumentationStatus
  author: string
  version: string
  views: number
  helpful: number
  notHelpful: number
  relatedDocs: string[] // Documentation IDs
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

export interface Tutorial {
  id: string
  title: string
  description: string
  language: DocumentationLanguage
  videoUrl?: string
  steps: {
    title: string
    content: string
    order: number
  }[]
  duration: number // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  views: number
  completed: number
  createdAt: Date
  updatedAt: Date
}

export interface Example {
  id: string
  title: string
  description: string
  category: string
  code: {
    language: string
    code: string
  }[]
  interactive: boolean
  runnable: boolean
  output?: string
  views: number
  likes: number
  createdAt: Date
  updatedAt: Date
}

export interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  language: DocumentationLanguage
  helpful: number
  notHelpful: number
  views: number
  createdAt: Date
  updatedAt: Date
}

class DocumentationCenter {
  private docs: Map<string, Documentation> = new Map()
  private tutorials: Map<string, Tutorial> = new Map()
  private examples: Map<string, Example> = new Map()
  private faqs: Map<string, FAQ> = new Map()

  async initialize() {
    logInfo('Initializing Documentation Center...')

    // Initialize default documentation
    await this.initializeDefaultDocs()

    logInfo('✅ Documentation Center initialized')
  }

  // Initialize default documentation
  private async initializeDefaultDocs(): Promise<void> {
    // Create welcome guide
    const welcomeDoc: Omit<Documentation, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'user_guide',
      title: 'Welcome to Matrix Platform',
      content: '# Welcome to Matrix Platform\n\nMatrix is a comprehensive AI platform...',
      language: 'en',
      category: 'getting-started',
      tags: ['welcome', 'introduction', 'getting-started'],
      status: 'published',
      author: 'matrix-team',
      version: '1.0.0',
      views: 0,
      helpful: 0,
      notHelpful: 0,
      relatedDocs: [],
      publishedAt: new Date()
    }

    const docId = nanoid()
    const now = new Date()

    const doc: Documentation = {
      id: docId,
      ...welcomeDoc,
      createdAt: now,
      updatedAt: now
    }

    this.docs.set(docId, doc)

    logInfo('✅ Default documentation initialized')
  }

  // Create documentation
  async createDocumentation(
    type: DocumentationType,
    title: string,
    content: string,
    language: DocumentationLanguage,
    category: string,
    tags: string[] = [],
    author: string = 'matrix-team',
    version: string = '1.0.0'
  ): Promise<Documentation> {
    try {
      const docId = nanoid()
      const now = new Date()

      const doc: Documentation = {
        id: docId,
        type,
        title,
        content,
        language,
        category,
        tags,
        status: 'draft',
        author,
        version,
        views: 0,
        helpful: 0,
        notHelpful: 0,
        relatedDocs: [],
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.documentation.create({
          data: {
            id: docId,
            type,
            title,
            content,
            language,
            category,
            tags,
            status: 'draft',
            author,
            version,
            views: 0,
            helpful: 0,
            notHelpful: 0,
            relatedDocs: [],
            createdAt: now,
            updatedAt: now,
            publishedAt: null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create documentation in database' })
      }

      this.docs.set(docId, doc)

      logInfo(`✅ Created documentation ${docId}: ${title}`)

      return doc
    } catch (error) {
      logError(error as Error, { context: 'Create documentation' })
      throw error
    }
  }

  // Publish documentation
  async publishDocumentation(docId: string): Promise<boolean> {
    try {
      const doc = this.docs.get(docId)
      if (!doc) return false

      doc.status = 'published'
      doc.publishedAt = new Date()
      doc.updatedAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.documentation.update({
          where: { id: docId },
          data: {
            status: 'published',
            publishedAt: doc.publishedAt,
            updatedAt: doc.updatedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Publish documentation in database' })
      }

      this.docs.set(docId, doc)

      logInfo(`✅ Published documentation ${docId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Publish documentation' })
      return false
    }
  }

  // Create tutorial
  async createTutorial(
    title: string,
    description: string,
    language: DocumentationLanguage,
    steps: { title: string; content: string; order: number }[],
    duration: number,
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    videoUrl?: string
  ): Promise<Tutorial> {
    try {
      const tutorialId = nanoid()
      const now = new Date()

      const tutorial: Tutorial = {
        id: tutorialId,
        title,
        description,
        language,
        steps,
        duration,
        difficulty,
        videoUrl,
        views: 0,
        completed: 0,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.tutorial.create({
          data: {
            id: tutorialId,
            title,
            description,
            language,
            steps,
            duration,
            difficulty,
            videoUrl: videoUrl || null,
            views: 0,
            completed: 0,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create tutorial in database' })
      }

      this.tutorials.set(tutorialId, tutorial)

      logInfo(`✅ Created tutorial ${tutorialId}: ${title}`)

      return tutorial
    } catch (error) {
      logError(error as Error, { context: 'Create tutorial' })
      throw error
    }
  }

  // Create example
  async createExample(
    title: string,
    description: string,
    category: string,
    code: { language: string; code: string }[],
    interactive: boolean = false,
    runnable: boolean = false
  ): Promise<Example> {
    try {
      const exampleId = nanoid()
      const now = new Date()

      const example: Example = {
        id: exampleId,
        title,
        description,
        category,
        code,
        interactive,
        runnable,
        views: 0,
        likes: 0,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.example.create({
          data: {
            id: exampleId,
            title,
            description,
            category,
            code,
            interactive,
            runnable,
            views: 0,
            likes: 0,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create example in database' })
      }

      this.examples.set(exampleId, example)

      logInfo(`✅ Created example ${exampleId}: ${title}`)

      return example
    } catch (error) {
      logError(error as Error, { context: 'Create example' })
      throw error
    }
  }

  // Create FAQ
  async createFAQ(
    question: string,
    answer: string,
    category: string,
    language: DocumentationLanguage
  ): Promise<FAQ> {
    try {
      const faqId = nanoid()
      const now = new Date()

      const faq: FAQ = {
        id: faqId,
        question,
        answer,
        category,
        language,
        helpful: 0,
        notHelpful: 0,
        views: 0,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.fAQ.create({
          data: {
            id: faqId,
            question,
            answer,
            category,
            language,
            helpful: 0,
            notHelpful: 0,
            views: 0,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create FAQ in database' })
      }

      this.faqs.set(faqId, faq)

      logInfo(`✅ Created FAQ ${faqId}: ${question}`)

      return faq
    } catch (error) {
      logError(error as Error, { context: 'Create FAQ' })
      throw error
    }
  }

  // Search documentation
  async searchDocumentation(
    query: string,
    type?: DocumentationType,
    language?: DocumentationLanguage,
    category?: string
  ): Promise<Documentation[]> {
    const results: Documentation[] = []

    for (const doc of this.docs.values()) {
      if (doc.status !== 'published') continue
      if (type && doc.type !== type) continue
      if (language && doc.language !== language) continue
      if (category && doc.category !== category) continue

      // Simple search
      if (doc.title.toLowerCase().includes(query.toLowerCase()) ||
          doc.content.toLowerCase().includes(query.toLowerCase()) ||
          doc.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))) {
        results.push(doc)
      }
    }

    return results.sort((a, b) => b.views - a.views)
  }

  // Get documentation
  async getDocumentation(
    type?: DocumentationType,
    language?: DocumentationLanguage,
    category?: string,
    status?: DocumentationStatus
  ): Promise<Documentation[]> {
    const docs: Documentation[] = []
    for (const doc of this.docs.values()) {
      if (type && doc.type !== type) continue
      if (language && doc.language !== language) continue
      if (category && doc.category !== category) continue
      if (status && doc.status !== status) continue
      docs.push(doc)
    }
    return docs.sort((a, b) => b.views - a.views)
  }
}

export const documentationCenter = new DocumentationCenter()

