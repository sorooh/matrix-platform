/**
 * Crawler Tests
 * Phase 6: AI Crawler & Simulation Environment
 * Global-Ready Architecture
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { crawlerEngine } from './engine'
import { sessionManager } from './sessionManager'
import { parser } from './parser'
import { cache } from './cache'
import { legalComplianceFilter } from './legalCompliance'

describe('Crawler Engine', () => {
  beforeEach(async () => {
    await crawlerEngine.initialize()
  })

  afterEach(async () => {
    await crawlerEngine.shutdown()
  })

  it('should initialize crawler engine', async () => {
    const stats = crawlerEngine.getStats()
    expect(stats).toBeDefined()
    expect(stats.config).toBeDefined()
  })

  it('should check robots.txt compliance', async () => {
    const isAllowed = await crawlerEngine['checkRobotsTxt']('https://example.com')
    expect(typeof isAllowed).toBe('boolean')
  })

  it('should normalize URL', () => {
    const normalized = parser.normalizeUrl('https://example.com/path/')
    expect(normalized).toBe('https://example.com/path')
  })

  it('should validate URL', () => {
    expect(parser.isValidUrl('https://example.com')).toBe(true)
    expect(parser.isValidUrl('invalid-url')).toBe(false)
  })
})

describe('Session Manager', () => {
  beforeEach(() => {
    sessionManager.clearOldSessions(0) // Clear all sessions
  })

  it('should create session', () => {
    const sessionId = sessionManager.createSession('https://example.com')
    expect(sessionId).toBeDefined()

    const session = sessionManager.getSession(sessionId)
    expect(session).toBeDefined()
    expect(session?.startUrl).toBe('https://example.com')
    expect(session?.status).toBe('active')
  })

  it('should update session', () => {
    const sessionId = sessionManager.createSession('https://example.com')
    sessionManager.updateSession(sessionId, { totalUrls: 10 })

    const session = sessionManager.getSession(sessionId)
    expect(session?.totalUrls).toBe(10)
  })

  it('should increment crawled URLs', () => {
    const sessionId = sessionManager.createSession('https://example.com')
    sessionManager.incrementCrawled(sessionId)

    const session = sessionManager.getSession(sessionId)
    expect(session?.crawledUrls).toBe(1)
    expect(session?.totalUrls).toBe(1)
  })

  it('should complete session', () => {
    const sessionId = sessionManager.createSession('https://example.com')
    sessionManager.completeSession(sessionId)

    const session = sessionManager.getSession(sessionId)
    expect(session?.status).toBe('completed')
    expect(session?.endedAt).toBeDefined()
  })
})

describe('Parser', () => {
  const sampleHTML = `
    <html>
      <head>
        <title>Test Page</title>
        <meta name="description" content="Test description">
      </head>
      <body>
        <h1>Test Content</h1>
        <a href="/page1">Link 1</a>
        <a href="/page2">Link 2</a>
        <img src="/image.jpg" alt="Test Image">
      </body>
    </html>
  `

  it('should parse HTML', () => {
    const parsed = parser.parseHTML(sampleHTML, 'https://example.com')

    expect(parsed.title).toBe('Test Page')
    expect(parsed.content).toContain('Test Content')
    expect(parsed.links.length).toBeGreaterThan(0)
    expect(parsed.images.length).toBeGreaterThan(0)
    expect(parsed.metadata.description).toBe('Test description')
  })

  it('should extract links', () => {
    const parsed = parser.parseHTML(sampleHTML, 'https://example.com')
    expect(parsed.links).toContain('https://example.com/page1')
    expect(parsed.links).toContain('https://example.com/page2')
  })

  it('should extract images', () => {
    const parsed = parser.parseHTML(sampleHTML, 'https://example.com')
    expect(parsed.images).toContain('https://example.com/image.jpg')
  })

  it('should extract metadata', () => {
    const parsed = parser.parseHTML(sampleHTML, 'https://example.com')
    expect(parsed.metadata.description).toBe('Test description')
  })
})

describe('Cache', () => {
  beforeEach(() => {
    cache.clear()
  })

  it('should cache and retrieve result', () => {
    const mockResult = {
      url: 'https://example.com',
      statusCode: 200,
      crawledAt: new Date(),
      duration: 100,
      content: 'Test content',
    }

    cache.set('https://example.com', mockResult as any)
    const retrieved = cache.get('https://example.com')

    expect(retrieved).toBeDefined()
    expect(retrieved?.url).toBe('https://example.com')
  })

  it('should return null for non-existent entry', () => {
    const retrieved = cache.get('https://nonexistent.com')
    expect(retrieved).toBeNull()
  })

  it('should check if URL is cached', () => {
    const mockResult = {
      url: 'https://example.com',
      statusCode: 200,
      crawledAt: new Date(),
      duration: 100,
    }

    cache.set('https://example.com', mockResult as any)
    expect(cache.has('https://example.com')).toBe(true)
    expect(cache.has('https://nonexistent.com')).toBe(false)
  })

  it('should get cache statistics', () => {
    const stats = cache.getStats()
    expect(stats).toBeDefined()
    expect(stats.size).toBeGreaterThanOrEqual(0)
    expect(stats.maxSize).toBeGreaterThan(0)
  })
})

describe('Legal Compliance Filter', () => {
  it('should check compliance', () => {
    const mockResult = {
      url: 'https://example.com',
      statusCode: 200,
      crawledAt: new Date(),
      duration: 100,
      content: 'Test content',
      metadata: {},
    }

    const compliance = legalComplianceFilter.checkCompliance(mockResult as any)
    expect(compliance).toBeDefined()
    expect(compliance.allowed).toBeDefined()
    expect(compliance.blocked).toBeDefined()
  })

  it('should block explicit content', () => {
    const mockResult = {
      url: 'https://example.com',
      statusCode: 200,
      crawledAt: new Date(),
      duration: 100,
      content: 'This is explicit adult content',
      metadata: {},
    }

    const compliance = legalComplianceFilter.checkCompliance(mockResult as any)
    expect(compliance.blocked).toBe(true)
    expect(compliance.allowed).toBe(false)
  })

  it('should filter sensitive content', () => {
    const mockResult = {
      url: 'https://example.com',
      statusCode: 200,
      crawledAt: new Date(),
      duration: 100,
      content: 'Credit card: 1234-5678-9012-3456',
      metadata: {},
    }

    const compliance = legalComplianceFilter.checkCompliance(mockResult as any)
    expect(compliance.filtered).toBe(true)
  })

  it('should add and remove rules', () => {
    const rule = {
      id: 'test-rule',
      name: 'Test Rule',
      type: 'content' as const,
      pattern: /test/i,
      action: 'warn' as const,
    }

    legalComplianceFilter.addRule(rule)
    const retrieved = legalComplianceFilter.getRule('test-rule')
    expect(retrieved).toBeDefined()
    expect(retrieved?.id).toBe('test-rule')

    legalComplianceFilter.removeRule('test-rule')
    const removed = legalComplianceFilter.getRule('test-rule')
    expect(removed).toBeNull()
  })
})

