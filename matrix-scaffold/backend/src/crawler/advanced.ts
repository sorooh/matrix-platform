/**
 * Advanced Crawler Features
 * Phase 6: Global Enhancement - Production-Ready Features
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import puppeteer, { Page } from 'puppeteer'
import { crawlerEngine } from './engine'

export interface AdvancedCrawlerOptions {
  waitForSPA: boolean
  executeCustomJS: string[]
  waitForSelectors: string[]
  interceptNetwork: boolean
  humanize: boolean
  fingerprintRandomization: boolean
}

export interface CrawlerMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  spaLandingPages: number
  botDetected: number
  bypassed: number
}

export class AdvancedCrawler {
  /**
   * Wait for SPA hydration
   */
  async waitForSPAHydration(page: Page, timeout: number = 10000): Promise<void> {
    try {
      // Wait for common SPA frameworks
      await Promise.race([
        page.waitForFunction(() => (window as any).React?.version, { timeout }),
        page.waitForFunction(() => (window as any).Vue?.version, { timeout }),
        page.waitForFunction(() => (window as any).ng?.version, { timeout }),
        page.waitForFunction(() => document.readyState === 'complete', { timeout }),
      ]).catch(() => {
        // Timeout is acceptable
      })

      // Wait for network idle
      await page.waitForLoadState?.('networkidle').catch(() => {
        // Fallback if not available
      })

      logger.debug('SPA hydration completed')
    } catch (error: any) {
      logger.warn('SPA hydration wait failed:', error)
    }
  }

  /**
   * Execute custom JavaScript before extraction
   */
  async executeCustomJavaScript(page: Page, scripts: string[]): Promise<void> {
    try {
      for (const script of scripts) {
        await page.evaluate(script)
      }

      logger.debug('Custom JavaScript executed', { scriptsCount: scripts.length })
    } catch (error: any) {
      logger.warn('Custom JavaScript execution failed:', error)
    }
  }

  /**
   * Humanize browser behavior
   */
  async humanizeBehavior(page: Page): Promise<void> {
    try {
      // Random mouse movements
      await page.evaluate(() => {
        const moveMouse = (x: number, y: number) => {
          const event = new MouseEvent('mousemove', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
          })
          document.dispatchEvent(event)
        }

        // Simulate random mouse movements
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            moveMouse(Math.random() * window.innerWidth, Math.random() * window.innerHeight)
          }, i * 500)
        }
      })

      // Random scroll
      await page.evaluate(() => {
        window.scrollBy(0, Math.random() * 500)
      })

      // Random delay
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 500))

      logger.debug('Browser behavior humanized')
    } catch (error: any) {
      logger.warn('Humanize behavior failed:', error)
    }
  }

  /**
   * Randomize browser fingerprint
   */
  async randomizeFingerprint(page: Page): Promise<void> {
    try {
      // Override navigator properties
      await page.evaluate(() => {
        // Randomize user agent (already done by Puppeteer)
        // Randomize screen resolution
        Object.defineProperty(window.screen, 'width', {
          get: () => [1920, 1366, 1440, 1536][Math.floor(Math.random() * 4)],
        })
        Object.defineProperty(window.screen, 'height', {
          get: () => [1080, 768, 900, 864][Math.floor(Math.random() * 4)],
        })

        // Randomize timezone
        Object.defineProperty(Intl.DateTimeFormat().resolvedOptions(), 'timeZone', {
          get: () => ['America/New_York', 'Europe/London', 'Asia/Tokyo'][Math.floor(Math.random() * 3)],
        })

        // Randomize language
        Object.defineProperty(navigator, 'languages', {
          get: () => [['en-US', 'en'], ['fr-FR', 'fr'], ['de-DE', 'de']][Math.floor(Math.random() * 3)],
        })
      })

      logger.debug('Browser fingerprint randomized')
    } catch (error: any) {
      logger.warn('Fingerprint randomization failed:', error)
    }
  }

  /**
   * Intercept and monitor network requests
   */
  async setupNetworkInterception(page: Page): Promise<{
    requests: Array<{ url: string; method: string; status: number; duration: number }>
    responses: Array<{ url: string; status: number; size: number }>
  }> {
    const requests: Array<{ url: string; method: string; status: number; duration: number }> = []
    const responses: Array<{ url: string; status: number; size: number }> = []

    try {
      await page.setRequestInterception(true)

      page.on('request', (request) => {
        const startTime = Date.now()
        const url = request.url()
        const method = request.method()

        request.continue()

        page.once('response', (response) => {
          const duration = Date.now() - startTime
          const status = response.status()

          requests.push({
            url,
            method,
            status,
            duration,
          })

          response.body().then((body) => {
            responses.push({
              url,
              status,
              size: body.length,
            })
          }).catch(() => {
            // Ignore body errors
          })
        })
      })

      logger.debug('Network interception setup completed')
    } catch (error: any) {
      logger.warn('Network interception setup failed:', error)
    }

    return { requests, responses }
  }

  /**
   * Detect bot detection mechanisms
   */
  async detectBotDetection(page: Page): Promise<{
    detected: boolean
    mechanisms: string[]
  }> {
    try {
      const mechanisms: string[] = []

      // Check for common bot detection scripts
      const botDetectionChecks = await page.evaluate(() => {
        const checks: string[] = []

        // Check for Cloudflare
        if (document.querySelector('#cf-browser-verification')) {
          checks.push('cloudflare')
        }

        // Check for reCAPTCHA
        if (document.querySelector('.g-recaptcha')) {
          checks.push('recaptcha')
        }

        // Check for hCaptcha
        if (document.querySelector('.h-captcha')) {
          checks.push('hcaptcha')
        }

        // Check for bot detection scripts
        if ((window as any).navigator?.webdriver) {
          checks.push('webdriver-detected')
        }

        // Check for headless detection
        if (!(window as any).navigator?.plugins?.length) {
          checks.push('headless-detected')
        }

        return checks
      })

      mechanisms.push(...botDetectionChecks)

      const detected = mechanisms.length > 0

      if (detected) {
        logger.warn('Bot detection mechanisms found', { mechanisms })
      }

      return {
        detected,
        mechanisms,
      }
    } catch (error: any) {
      logger.warn('Bot detection check failed:', error)
      return {
        detected: false,
        mechanisms: [],
      }
    }
  }

  /**
   * Bypass bot detection
   */
  async bypassBotDetection(page: Page): Promise<boolean> {
    try {
      // Remove webdriver flag
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        })
      })

      // Add plugins
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5], // Simulate plugins
        })
      })

      // Override permissions
      await page.evaluateOnNewDocument(() => {
        const originalQuery = (window.navigator as any).permissions.query
        ;(window.navigator as any).permissions.query = (parameters: any) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
            : originalQuery(parameters)
      })

      // Add Chrome object
      await page.evaluateOnNewDocument(() => {
        ;(window as any).chrome = {
          runtime: {},
        }
      })

      logger.info('Bot detection bypassed')
      return true
    } catch (error: any) {
      logger.error('Bot detection bypass failed:', error)
      return false
    }
  }
}

// Global Advanced Crawler
export const advancedCrawler = new AdvancedCrawler()

