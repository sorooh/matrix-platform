/**
 * Crawler Engine
 * Phase 6: AI Crawler & Simulation Environment
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { prisma } from '../config/database'
import puppeteer, { Browser, Page, BrowserLaunchOptions } from 'puppeteer'
import { URL } from 'url'
import { sessionManager } from './sessionManager'
import { parser } from './parser'
import { storageAdapter } from './storageAdapter'
import { resourceMonitor } from './resourceMonitor'
import { cache } from './cache'
import { legalComplianceFilter } from './legalCompliance'

export interface CrawlerConfig {
  userAgent: string
  viewport: {
    width: number
    height: number
  }
  timeout: number // milliseconds
  maxConcurrent: number
  respectRobotsTxt: boolean
  followLinks: boolean
  maxDepth: number
  maxPages: number
  delay: number // milliseconds between requests
  proxy?: string
  vpn?: string
}

export interface CrawlResult {
  url: string
  title?: string
  content?: string
  html?: string
  statusCode: number
  headers?: Record<string, string>
  links?: string[]
  images?: string[]
  metadata?: Record<string, unknown>
  crawledAt: Date
  duration: number
}

export interface CrawlJob {
  id: string
  url: string
  depth: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt?: Date
  completedAt?: Date
  result?: CrawlResult
  error?: string
}

export class CrawlerEngine {
  private config: CrawlerConfig
  private browser: Browser | null = null
  private activeJobs: Map<string, CrawlJob> = new Map()
  private robotsCache: Map<string, { allowed: boolean; disallowed: string[] }> = new Map()
  private visitedUrls: Set<string> = new Set()

  constructor(config?: Partial<CrawlerConfig>) {
    this.config = {
      userAgent:
        config?.userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: config?.viewport || { width: 1920, height: 1080 },
      timeout: config?.timeout || 30000,
      maxConcurrent: config?.maxConcurrent || 5,
      respectRobotsTxt: config?.respectRobotsTxt !== false,
      followLinks: config?.followLinks !== false,
      maxDepth: config?.maxDepth || 3,
      maxPages: config?.maxPages || 100,
      delay: config?.delay || 1000,
      proxy: config?.proxy,
      vpn: config?.vpn,
    }
  }

  /**
   * Initialize crawler engine
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing crawler engine...')

      const launchOptions: BrowserLaunchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      }

      if (this.config.proxy) {
        launchOptions.args?.push(`--proxy-server=${this.config.proxy}`)
      }

      this.browser = await puppeteer.launch(launchOptions)

      // Start resource monitoring
      resourceMonitor.startMonitoring()

      logger.info('✅ Crawler engine initialized', {
        userAgent: this.config.userAgent,
        proxy: this.config.proxy || 'none',
      })

      eventBus.publish('crawler.initialized', {
        config: this.config,
      })
    } catch (error: any) {
      logger.error('Crawler engine initialization failed:', error)
      throw error
    }
  }

  /**
   * Shutdown crawler engine
   */
  async shutdown(): Promise<void> {
    try {
      // Stop resource monitoring
      resourceMonitor.stopMonitoring()

      if (this.browser) {
        await this.browser.close()
        this.browser = null
      }

      logger.info('Crawler engine shut down')
    } catch (error: any) {
      logger.error('Crawler engine shutdown failed:', error)
    }
  }

  /**
   * Check robots.txt compliance
   */
  async checkRobotsTxt(url: string): Promise<boolean> {
    try {
      if (!this.config.respectRobotsTxt) {
        return true
      }

      const urlObj = new URL(url)
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`
      const robotsUrl = `${baseUrl}/robots.txt`

      // Check cache
      if (this.robotsCache.has(baseUrl)) {
        const robots = this.robotsCache.get(baseUrl)!
        return robots.allowed
      }

      // Fetch robots.txt
      try {
        const response = await fetch(robotsUrl)
        if (response.ok) {
          const robotsTxt = await response.text()
          const disallowed: string[] = []
          const lines = robotsTxt.split('\n')
          let currentUserAgent: string | null = null

          for (const line of lines) {
            const trimmed = line.trim().toLowerCase()
            if (trimmed.startsWith('user-agent:')) {
              currentUserAgent = trimmed.substring(11).trim()
            } else if (trimmed.startsWith('disallow:') && currentUserAgent) {
              if (currentUserAgent === '*' || currentUserAgent === this.config.userAgent.toLowerCase()) {
                const path = line.substring(9).trim()
                disallowed.push(path)
              }
            }
          }

          const isAllowed = !disallowed.some((path) => url.includes(path))
          this.robotsCache.set(baseUrl, { allowed: isAllowed, disallowed })
          return isAllowed
        }
      } catch (error) {
        // robots.txt not found or inaccessible - allow by default
        logger.warn('robots.txt not accessible', { url: robotsUrl })
        return true
      }

      return true
    } catch (error: any) {
      logger.error('Robots.txt check failed:', error)
      return true // Allow by default on error
    }
  }

  /**
   * Crawl single URL
   */
  async crawlUrl(url: string, options?: { depth?: number; maxDepth?: number; sessionId?: string }): Promise<CrawlResult> {
    const startTime = Date.now()
    const normalizedUrl = parser.normalizeUrl(url)

    try {
      // Check cache first
      const cachedResult = cache.get(normalizedUrl)
      if (cachedResult) {
        logger.info('Cache hit for URL', { url: normalizedUrl })
        return cachedResult
      }

      // Check if already visited
      if (this.visitedUrls.has(normalizedUrl)) {
        throw new Error('URL already visited')
      }

      // Check robots.txt
      const isAllowed = await this.checkRobotsTxt(normalizedUrl)
      if (!isAllowed) {
        throw new Error('URL disallowed by robots.txt')
      }

      if (!this.browser) {
        await this.initialize()
      }

      const page = await this.browser!.newPage()

      try {
        // Set viewport
        await page.setViewport(this.config.viewport)

        // Set user agent
        await page.setUserAgent(this.config.userAgent)

        // Navigate to URL
        const response = await page.goto(normalizedUrl, {
          waitUntil: 'networkidle2',
          timeout: this.config.timeout,
        })

        if (!response) {
          throw new Error('No response from page')
        }

        const statusCode = response.status()

        // Get HTML content
        const html = await page.content().catch(() => undefined)

        // Parse HTML using parser
        const parsed = html ? parser.parseHTML(html, normalizedUrl) : null

        const duration = Date.now() - startTime

        const result: CrawlResult = {
          url: normalizedUrl,
          title: parsed?.title,
          content: parsed?.content,
          html,
          statusCode,
          headers: response.headers(),
          links: parsed?.links || [],
          images: parsed?.images || [],
          metadata: parsed?.metadata || {},
          crawledAt: new Date(),
          duration,
        }

        // Check legal compliance
        const compliance = legalComplianceFilter.checkCompliance(result)
        if (compliance.blocked) {
          throw new Error(`Content blocked by compliance: ${compliance.reason}`)
        }

        // Cache result
        cache.set(normalizedUrl, result)

        // Save to storage
        await storageAdapter.saveCrawlResult(result, options?.sessionId)

        // Update session if provided
        if (options?.sessionId) {
          sessionManager.incrementCrawled(options.sessionId)
        }

        // Mark as visited
        this.visitedUrls.add(normalizedUrl)

        await page.close()

        logger.info('URL crawled successfully', {
          url,
          statusCode,
          duration,
          linksCount: links.length,
          imagesCount: images.length,
        })

        eventBus.publish('crawler.url.crawled', {
          url,
          result,
        })

        return result
      } catch (error: any) {
        await page.close()
        throw error
      }
    } catch (error: any) {
      logger.error('URL crawl failed:', error)
      throw error
    }
  }

  /**
   * Crawl multiple URLs (with depth)
   */
  async crawlUrls(
    startUrl: string,
    options?: {
      maxDepth?: number
      maxPages?: number
      onProgress?: (progress: { current: number; total: number; url: string }) => void
    }
  ): Promise<CrawlResult[]> {
    try {
      const maxDepth = options?.maxDepth || this.config.maxDepth
      const maxPages = options?.maxPages || this.config.maxPages
      const results: CrawlResult[] = []
      const queue: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }]
      const visited = new Set<string>()

      logger.info('Starting multi-URL crawl', {
        startUrl,
        maxDepth,
        maxPages,
      })

      while (queue.length > 0 && results.length < maxPages) {
        const { url, depth } = queue.shift()!

        if (visited.has(url) || depth > maxDepth) {
          continue
        }

        visited.add(url)

        try {
          const result = await this.crawlUrl(url, { depth, maxDepth })
          results.push(result)

          // Report progress
          if (options?.onProgress) {
            options.onProgress({
              current: results.length,
              total: maxPages,
              url,
            })
          }

          // Add links to queue if following links
          if (this.config.followLinks && depth < maxDepth && result.links) {
            for (const link of result.links) {
              try {
                const linkUrl = new URL(link, url).href
                if (!visited.has(linkUrl)) {
                  queue.push({ url: linkUrl, depth: depth + 1 })
                }
              } catch {
                // Invalid URL, skip
              }
            }
          }

          // Delay between requests
          if (this.config.delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, this.config.delay))
          }
        } catch (error: any) {
          logger.warn('URL crawl failed, skipping', { url, error: error.message })
        }
      }

      logger.info('Multi-URL crawl completed', {
        totalCrawled: results.length,
        totalPages: maxPages,
      })

      eventBus.publish('crawler.urls.crawled', {
        startUrl,
        results,
      })

      return results
    } catch (error: any) {
      logger.error('Multi-URL crawl failed:', error)
      throw error
    }
  }

  /**
   * Get crawler statistics
   */
  getStats(): {
    activeJobs: number
    visitedUrls: number
    robotsCache: number
    config: CrawlerConfig
  } {
    return {
      activeJobs: this.activeJobs.size,
      visitedUrls: this.visitedUrls.size,
      robotsCache: this.robotsCache.size,
      config: this.config,
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CrawlerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    }

    logger.info('Crawler config updated', { config: this.config })
  }

  /**
   * Clear visited URLs cache
   */
  clearCache(): void {
    this.visitedUrls.clear()
    this.robotsCache.clear()
    logger.info('Crawler cache cleared')
  }
}

// Global Crawler Engine
export const crawlerEngine = new CrawlerEngine({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  viewport: { width: 1920, height: 1080 },
  timeout: 30000,
  maxConcurrent: 5,
  respectRobotsTxt: true,
  followLinks: true,
  maxDepth: 3,
  maxPages: 100,
  delay: 1000,
})

