/**
 * Session Manager
 * Phase 6: AI Crawler & Simulation Environment
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { nanoid } from 'nanoid'

export interface CrawlSession {
  id: string
  startUrl: string
  startedAt: Date
  endedAt?: Date
  status: 'active' | 'completed' | 'failed' | 'cancelled'
  totalUrls: number
  crawledUrls: number
  failedUrls: number
  metadata?: Record<string, unknown>
}

export class SessionManager {
  private sessions: Map<string, CrawlSession> = new Map()

  /**
   * Create new crawl session
   */
  createSession(startUrl: string, metadata?: Record<string, unknown>): string {
    const sessionId = nanoid()
    const session: CrawlSession = {
      id: sessionId,
      startUrl,
      startedAt: new Date(),
      status: 'active',
      totalUrls: 0,
      crawledUrls: 0,
      failedUrls: 0,
      metadata,
    }

    this.sessions.set(sessionId, session)

    logger.info('Crawl session created', {
      sessionId,
      startUrl,
    })

    eventBus.publish('crawler.session.created', {
      sessionId,
      session,
    })

    return sessionId
  }

  /**
   * Get session
   */
  getSession(sessionId: string): CrawlSession | null {
    return this.sessions.get(sessionId) || null
  }

  /**
   * Update session
   */
  updateSession(sessionId: string, updates: Partial<CrawlSession>): void {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    Object.assign(session, updates)

    logger.debug('Crawl session updated', {
      sessionId,
      updates,
    })

    eventBus.publish('crawler.session.updated', {
      sessionId,
      session,
    })
  }

  /**
   * Increment crawled URLs
   */
  incrementCrawled(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.crawledUrls++
      session.totalUrls++
    }
  }

  /**
   * Increment failed URLs
   */
  incrementFailed(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.failedUrls++
      session.totalUrls++
    }
  }

  /**
   * Complete session
   */
  completeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.status = 'completed'
      session.endedAt = new Date()

      logger.info('Crawl session completed', {
        sessionId,
        totalUrls: session.totalUrls,
        crawledUrls: session.crawledUrls,
        failedUrls: session.failedUrls,
      })

      eventBus.publish('crawler.session.completed', {
        sessionId,
        session,
      })
    }
  }

  /**
   * Fail session
   */
  failSession(sessionId: string, error?: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.status = 'failed'
      session.endedAt = new Date()
      if (error) {
        session.metadata = { ...session.metadata, error }
      }

      logger.error('Crawl session failed', {
        sessionId,
        error,
      })

      eventBus.publish('crawler.session.failed', {
        sessionId,
        session,
        error,
      })
    }
  }

  /**
   * Cancel session
   */
  cancelSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.status = 'cancelled'
      session.endedAt = new Date()

      logger.info('Crawl session cancelled', {
        sessionId,
      })

      eventBus.publish('crawler.session.cancelled', {
        sessionId,
        session,
      })
    }
  }

  /**
   * Get all sessions
   */
  getAllSessions(): CrawlSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): CrawlSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.status === 'active')
  }

  /**
   * Clear old sessions (older than 24 hours)
   */
  clearOldSessions(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [id, session] of this.sessions.entries()) {
      if (session.endedAt && now - session.endedAt.getTime() > maxAge) {
        toDelete.push(id)
      }
    }

    for (const id of toDelete) {
      this.sessions.delete(id)
    }

    if (toDelete.length > 0) {
      logger.info('Old sessions cleared', {
        count: toDelete.length,
      })
    }
  }
}

// Global Session Manager
export const sessionManager = new SessionManager()

