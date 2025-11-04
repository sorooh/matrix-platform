/**
 * Storage Adapter
 * Phase 6: AI Crawler & Simulation Environment
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { prisma } from '../config/database'
import { CrawlResult } from './engine'

export interface StorageOptions {
  persistToDatabase: boolean
  persistToFile?: boolean
  filePath?: string
}

export class StorageAdapter {
  private options: StorageOptions

  constructor(options?: Partial<StorageOptions>) {
    this.options = {
      persistToDatabase: options?.persistToDatabase !== false,
      persistToFile: options?.persistToFile || false,
      filePath: options?.filePath,
    }
  }

  /**
   * Save crawl result
   */
  async saveCrawlResult(result: CrawlResult, sessionId?: string): Promise<void> {
    try {
      if (this.options.persistToDatabase) {
        await this.saveToDatabase(result, sessionId)
      }

      if (this.options.persistToFile) {
        await this.saveToFile(result, sessionId)
      }

      logger.debug('Crawl result saved', {
        url: result.url,
        sessionId,
      })
    } catch (error: any) {
      logger.error('Save crawl result failed:', error)
      throw error
    }
  }

  /**
   * Save to database
   */
  private async saveToDatabase(result: CrawlResult, sessionId?: string): Promise<void> {
    try {
      // In production, create a CrawlResult model in Prisma
      // For now, log the operation
      logger.info('Crawl result saved to database', {
        url: result.url,
        sessionId,
        statusCode: result.statusCode,
      })

      // TODO: Implement actual database storage when Prisma model is created
      // await prisma.crawlResult.create({
      //   data: {
      //     url: result.url,
      //     title: result.title,
      //     content: result.content,
      //     html: result.html,
      //     statusCode: result.statusCode,
      //     metadata: result.metadata,
      //     sessionId,
      //     crawledAt: result.crawledAt,
      //   },
      // })
    } catch (error: any) {
      logger.error('Save to database failed:', error)
      throw error
    }
  }

  /**
   * Save to file
   */
  private async saveToFile(result: CrawlResult, sessionId?: string): Promise<void> {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')

      const filePath =
        this.options.filePath ||
        path.join(process.cwd(), 'data', 'crawler', sessionId || 'default', `${Date.now()}.json`)

      // Ensure directory exists
      const dir = path.dirname(filePath)
      await fs.mkdir(dir, { recursive: true })

      // Save result
      await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8')

      logger.info('Crawl result saved to file', {
        url: result.url,
        filePath,
      })
    } catch (error: any) {
      logger.error('Save to file failed:', error)
      throw error
    }
  }

  /**
   * Get crawl result by URL
   */
  async getCrawlResult(url: string): Promise<CrawlResult | null> {
    try {
      // TODO: Implement actual database retrieval
      logger.debug('Get crawl result', { url })
      return null
    } catch (error: any) {
      logger.error('Get crawl result failed:', error)
      return null
    }
  }

  /**
   * Check if URL has been crawled
   */
  async hasBeenCrawled(url: string): Promise<boolean> {
    try {
      // TODO: Implement actual database check
      const result = await this.getCrawlResult(url)
      return result !== null
    } catch (error: any) {
      logger.error('Check crawled failed:', error)
      return false
    }
  }

  /**
   * Update storage options
   */
  updateOptions(options: Partial<StorageOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    }

    logger.info('Storage options updated', { options: this.options })
  }
}

// Global Storage Adapter
export const storageAdapter = new StorageAdapter({
  persistToDatabase: true,
  persistToFile: false,
})

