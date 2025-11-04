/**
 * Browser Simulation
 * Phase 6: AI Crawler & Simulation Environment
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import puppeteer, { Browser, Page, BrowserLaunchOptions } from 'puppeteer'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export interface BrowserSession {
  id: string
  startedAt: Date
  endedAt?: Date
  url: string
  screenshots: string[]
  videos: string[]
  domSnapshots: string[]
  cookies: Array<{
    name: string
    value: string
    domain: string
    path: string
    expires?: number
  }>
  headers: Record<string, string>
  userAgent: string
}

export interface ScreenshotOptions {
  fullPage?: boolean
  quality?: number
  type?: 'png' | 'jpeg'
}

export interface VideoOptions {
  width?: number
  height?: number
  fps?: number
  quality?: number
}

export interface DOMSnapshot {
  timestamp: Date
  html: string
  url: string
  metadata?: Record<string, unknown>
}

export class BrowserSimulation {
  private browser: Browser | null = null
  private sessions: Map<string, BrowserSession> = new Map()
  private outputDir: string

  constructor(outputDir?: string) {
    this.outputDir = outputDir || join(process.cwd(), 'data', 'crawler', 'simulations')
  }

  /**
   * Initialize browser simulation
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing browser simulation...')

      const launchOptions: BrowserLaunchOptions = {
        headless: false, // Visible browser for simulation
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      }

      this.browser = await puppeteer.launch(launchOptions)

      // Ensure output directory exists
      await mkdir(this.outputDir, { recursive: true })

      logger.info('✅ Browser simulation initialized', {
        outputDir: this.outputDir,
      })

      eventBus.publish('crawler.browser.initialized', {
        outputDir: this.outputDir,
      })
    } catch (error: any) {
      logger.error('Browser simulation initialization failed:', error)
      throw error
    }
  }

  /**
   * Shutdown browser simulation
   */
  async shutdown(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close()
        this.browser = null
      }

      logger.info('Browser simulation shut down')
    } catch (error: any) {
      logger.error('Browser simulation shutdown failed:', error)
    }
  }

  /**
   * Create new browser session
   */
  async createSession(url: string, options?: {
    userAgent?: string
    viewport?: { width: number; height: number }
    cookies?: Array<{ name: string; value: string; domain: string }>
    headers?: Record<string, string>
  }): Promise<string> {
    try {
      if (!this.browser) {
        await this.initialize()
      }

      const page = await this.browser!.newPage()

      // Set viewport
      if (options?.viewport) {
        await page.setViewport(options.viewport)
      } else {
        await page.setViewport({ width: 1920, height: 1080 })
      }

      // Set user agent
      if (options?.userAgent) {
        await page.setUserAgent(options.userAgent)
      }

      // Set cookies
      if (options?.cookies) {
        for (const cookie of options.cookies) {
          await page.setCookie({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
          })
        }
      }

      // Set extra headers
      if (options?.headers) {
        await page.setExtraHTTPHeaders(options.headers)
      }

      // Navigate to URL
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      })

      // Create session
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const session: BrowserSession = {
        id: sessionId,
        startedAt: new Date(),
        url,
        screenshots: [],
        videos: [],
        domSnapshots: [],
        cookies: [],
        headers: options?.headers || {},
        userAgent: options?.userAgent || 'default',
      }

      // Get cookies
      const cookies = await page.cookies()
      session.cookies = cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
      }))

      this.sessions.set(sessionId, session)

      // Store page reference
      ;(page as any).__sessionId = sessionId

      logger.info('Browser session created', {
        sessionId,
        url,
      })

      eventBus.publish('crawler.browser.session.created', {
        sessionId,
        session,
      })

      return sessionId
    } catch (error: any) {
      logger.error('Create browser session failed:', error)
      throw error
    }
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(
    sessionId: string,
    options?: ScreenshotOptions
  ): Promise<string> {
    try {
      const session = this.sessions.get(sessionId)
      if (!session) {
        throw new Error(`Session ${sessionId} not found`)
      }

      const page = await this.getPageForSession(sessionId)
      if (!page) {
        throw new Error(`Page not found for session ${sessionId}`)
      }

      const screenshotPath = join(
        this.outputDir,
        sessionId,
        `screenshot-${Date.now()}.${options?.type || 'png'}`
      )

      await mkdir(join(this.outputDir, sessionId), { recursive: true })

      await page.screenshot({
        path: screenshotPath,
        fullPage: options?.fullPage || false,
        type: options?.type || 'png',
        quality: options?.quality || 90,
      })

      session.screenshots.push(screenshotPath)

      logger.info('Screenshot taken', {
        sessionId,
        path: screenshotPath,
      })

      eventBus.publish('crawler.browser.screenshot.taken', {
        sessionId,
        path: screenshotPath,
      })

      return screenshotPath
    } catch (error: any) {
      logger.error('Take screenshot failed:', error)
      throw error
    }
  }

  /**
   * Start video recording
   */
  async startVideoRecording(
    sessionId: string,
    options?: VideoOptions
  ): Promise<string> {
    try {
      const session = this.sessions.get(sessionId)
      if (!session) {
        throw new Error(`Session ${sessionId} not found`)
      }

      const videoPath = join(
        this.outputDir,
        sessionId,
        `video-${Date.now()}.mp4`
      )

      await mkdir(join(this.outputDir, sessionId), { recursive: true })

      // Note: Puppeteer doesn't have built-in video recording
      // In production, use puppeteer-screen-recorder or similar library
      // For now, we'll simulate video recording
      logger.info('Video recording started', {
        sessionId,
        path: videoPath,
      })

      session.videos.push(videoPath)

      eventBus.publish('crawler.browser.video.started', {
        sessionId,
        path: videoPath,
      })

      return videoPath
    } catch (error: any) {
      logger.error('Start video recording failed:', error)
      throw error
    }
  }

  /**
   * Stop video recording
   */
  async stopVideoRecording(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId)
      if (!session) {
        throw new Error(`Session ${sessionId} not found`)
      }

      logger.info('Video recording stopped', {
        sessionId,
      })

      eventBus.publish('crawler.browser.video.stopped', {
        sessionId,
      })
    } catch (error: any) {
      logger.error('Stop video recording failed:', error)
      throw error
    }
  }

  /**
   * Capture DOM snapshot
   */
  async captureDOMSnapshot(
    sessionId: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    try {
      const session = this.sessions.get(sessionId)
      if (!session) {
        throw new Error(`Session ${sessionId} not found`)
      }

      const page = await this.getPageForSession(sessionId)
      if (!page) {
        throw new Error(`Page not found for session ${sessionId}`)
      }

      const html = await page.content()
      const url = page.url()

      const snapshot: DOMSnapshot = {
        timestamp: new Date(),
        html,
        url,
        metadata,
      }

      const snapshotPath = join(
        this.outputDir,
        sessionId,
        `dom-snapshot-${Date.now()}.json`
      )

      await mkdir(join(this.outputDir, sessionId), { recursive: true })
      await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8')

      session.domSnapshots.push(snapshotPath)

      logger.info('DOM snapshot captured', {
        sessionId,
        path: snapshotPath,
      })

      eventBus.publish('crawler.browser.dom.snapshot', {
        sessionId,
        path: snapshotPath,
        snapshot,
      })

      return snapshotPath
    } catch (error: any) {
      logger.error('Capture DOM snapshot failed:', error)
      throw error
    }
  }

  /**
   * Simulate user interaction
   */
  async simulateInteraction(
    sessionId: string,
    action: 'click' | 'type' | 'scroll' | 'hover',
    selector: string,
    options?: {
      text?: string
      delay?: number
      waitForSelector?: string
    }
  ): Promise<void> {
    try {
      const page = await this.getPageForSession(sessionId)
      if (!page) {
        throw new Error(`Page not found for session ${sessionId}`)
      }

      switch (action) {
        case 'click':
          await page.click(selector, { delay: options?.delay || 100 })
          break
        case 'type':
          if (!options?.text) {
            throw new Error('Text required for type action')
          }
          await page.type(selector, options.text, { delay: options?.delay || 100 })
          break
        case 'scroll':
          await page.evaluate((selector) => {
            const element = document.querySelector(selector)
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }, selector)
          break
        case 'hover':
          await page.hover(selector)
          break
      }

      if (options?.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 5000 })
      }

      logger.info('User interaction simulated', {
        sessionId,
        action,
        selector,
      })

      eventBus.publish('crawler.browser.interaction', {
        sessionId,
        action,
        selector,
      })
    } catch (error: any) {
      logger.error('Simulate interaction failed:', error)
      throw error
    }
  }

  /**
   * Get page for session
   */
  private async getPageForSession(sessionId: string): Promise<Page | null> {
    if (!this.browser) {
      return null
    }

    const pages = await this.browser.pages()
    for (const page of pages) {
      if ((page as any).__sessionId === sessionId) {
        return page
      }
    }

    return null
  }

  /**
   * Get session
   */
  getSession(sessionId: string): BrowserSession | null {
    return this.sessions.get(sessionId) || null
  }

  /**
   * End session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId)
      if (!session) {
        throw new Error(`Session ${sessionId} not found`)
      }

      const page = await this.getPageForSession(sessionId)
      if (page) {
        await page.close()
      }

      session.endedAt = new Date()

      logger.info('Browser session ended', {
        sessionId,
        duration: session.endedAt.getTime() - session.startedAt.getTime(),
      })

      eventBus.publish('crawler.browser.session.ended', {
        sessionId,
        session,
      })
    } catch (error: any) {
      logger.error('End session failed:', error)
      throw error
    }
  }

  /**
   * Get all sessions
   */
  getAllSessions(): BrowserSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): BrowserSession[] {
    return Array.from(this.sessions.values()).filter((s) => !s.endedAt)
  }
}

// Global Browser Simulation
export const browserSimulation = new BrowserSimulation()

