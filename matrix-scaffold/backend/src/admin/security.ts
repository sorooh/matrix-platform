/**
 * Advanced Security Features
 * Phase 7.3.1: Professional Enhancements
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { prisma } from '../config/database'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

export interface JWTPayload {
  userId: string
  role: string
  email: string
  iat?: number
  exp?: number
}

export interface Session {
  id: string
  userId: string
  token: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  lastActivity: Date
  expiresAt: Date
  active: boolean
}

export interface RateLimit {
  userId?: string
  role?: string
  endpoint?: string
  ipAddress?: string
  requests: number
  windowStart: Date
  windowEnd: Date
}

export interface SecurityEvent {
  id: string
  type: 'authentication' | 'authorization' | 'rate_limit' | 'threat' | 'error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  ipAddress?: string
  userAgent?: string
  action: string
  details: Record<string, unknown>
  timestamp: Date
}

export class AdvancedSecurity {
  private sessions: Map<string, Session> = new Map()
  private rateLimits: Map<string, RateLimit> = new Map()
  private securityEvents: Map<string, SecurityEvent> = new Map()
  private jwtSecret: string
  private jwtExpiry: string = '24h'
  private rateLimitWindow: number = 60000 // 1 minute
  private rateLimitMaxRequests: number = 100

  constructor() {
    // In production, load from environment variables
    this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex')
  }

  /**
   * Initialize Advanced Security
   */
  async initialize(): Promise<void> {
    try {
      // Start periodic cleanup
      this.startPeriodicCleanup()

      logger.info('Advanced Security initialized')
    } catch (error: any) {
      logger.error('Advanced Security initialization failed:', error)
      throw error
    }
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    // Clean expired sessions every 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions()
    }, 5 * 60 * 1000)

    // Clean rate limit windows every minute
    setInterval(() => {
      this.cleanupRateLimits()
    }, 60 * 1000)

    logger.debug('Periodic cleanup started')
  }

  /**
   * Generate JWT token
   */
  generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    try {
      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiry,
      })

      logger.debug('JWT token generated', {
        userId: payload.userId,
        role: payload.role,
      })

      return token
    } catch (error: any) {
      logger.error('Generate token failed:', error)
      throw error
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload

      logger.debug('JWT token verified', {
        userId: payload.userId,
        role: payload.role,
      })

      return payload
    } catch (error: any) {
      logger.error('Verify token failed:', error)
      return null
    }
  }

  /**
   * Create session
   */
  async createSession(
    userId: string,
    token: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    try {
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      const session: Session = {
        id: sessionId,
        userId,
        token,
        ipAddress,
        userAgent,
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt,
        active: true,
      }

      this.sessions.set(sessionId, session)

      // Log security event
      this.logSecurityEvent({
        type: 'authentication',
        severity: 'low',
        userId,
        ipAddress,
        userAgent,
        action: 'session.created',
        details: {
          sessionId,
        },
      })

      logger.info('Session created', {
        sessionId,
        userId,
      })

      return sessionId
    } catch (error: any) {
      logger.error('Create session failed:', error)
      throw error
    }
  }

  /**
   * Get session
   */
  getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null
  }

  /**
   * Update session activity
   */
  updateSessionActivity(sessionId: string): void {
    try {
      const session = this.sessions.get(sessionId)
      if (session) {
        session.lastActivity = new Date()
        this.sessions.set(sessionId, session)
      }
    } catch (error: any) {
      logger.error('Update session activity failed:', error)
    }
  }

  /**
   * Invalidate session
   */
  invalidateSession(sessionId: string): void {
    try {
      const session = this.sessions.get(sessionId)
      if (session) {
        session.active = false
        this.sessions.set(sessionId, session)

        // Log security event
        this.logSecurityEvent({
          type: 'authentication',
          severity: 'low',
          userId: session.userId,
          ipAddress: session.ipAddress,
          action: 'session.invalidated',
          details: {
            sessionId,
          },
        })

        logger.info('Session invalidated', {
          sessionId,
        })
      }
    } catch (error: any) {
      logger.error('Invalidate session failed:', error)
    }
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    try {
      const now = new Date()
      let cleaned = 0

      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.expiresAt < now || !session.active) {
          this.sessions.delete(sessionId)
          cleaned++
        }
      }

      if (cleaned > 0) {
        logger.debug('Expired sessions cleaned', {
          cleaned,
        })
      }
    } catch (error: any) {
      logger.error('Cleanup expired sessions failed:', error)
    }
  }

  /**
   * Check rate limit
   */
  checkRateLimit(
    userId?: string,
    role?: string,
    endpoint?: string,
    ipAddress?: string
  ): { allowed: boolean; remaining: number; resetAt: Date } {
    try {
      const key = this.getRateLimitKey(userId, role, endpoint, ipAddress)
      const now = new Date()
      const windowStart = new Date(now.getTime() - this.rateLimitWindow)

      let rateLimit = this.rateLimits.get(key)

      // Create or update rate limit
      if (!rateLimit || rateLimit.windowEnd < now) {
        rateLimit = {
          userId,
          role,
          endpoint,
          ipAddress,
          requests: 0,
          windowStart: now,
          windowEnd: new Date(now.getTime() + this.rateLimitWindow),
        }
      }

      // Check if limit exceeded
      if (rateLimit.requests >= this.rateLimitMaxRequests) {
        // Log security event
        this.logSecurityEvent({
          type: 'rate_limit',
          severity: 'medium',
          userId,
          ipAddress,
          action: 'rate_limit.exceeded',
          details: {
            endpoint,
            requests: rateLimit.requests,
            limit: this.rateLimitMaxRequests,
          },
        })

        logger.warn('Rate limit exceeded', {
          key,
          requests: rateLimit.requests,
          limit: this.rateLimitMaxRequests,
        })

        return {
          allowed: false,
          remaining: 0,
          resetAt: rateLimit.windowEnd,
        }
      }

      // Increment request count
      rateLimit.requests++
      this.rateLimits.set(key, rateLimit)

      return {
        allowed: true,
        remaining: this.rateLimitMaxRequests - rateLimit.requests,
        resetAt: rateLimit.windowEnd,
      }
    } catch (error: any) {
      logger.error('Check rate limit failed:', error)
      // Allow request on error
      return {
        allowed: true,
        remaining: this.rateLimitMaxRequests,
        resetAt: new Date(Date.now() + this.rateLimitWindow),
      }
    }
  }

  /**
   * Get rate limit key
   */
  private getRateLimitKey(
    userId?: string,
    role?: string,
    endpoint?: string,
    ipAddress?: string
  ): string {
    const parts = []
    if (userId) parts.push(`user:${userId}`)
    if (role) parts.push(`role:${role}`)
    if (endpoint) parts.push(`endpoint:${endpoint}`)
    if (ipAddress) parts.push(`ip:${ipAddress}`)
    return parts.join(':') || 'global'
  }

  /**
   * Cleanup rate limits
   */
  private cleanupRateLimits(): void {
    try {
      const now = new Date()
      let cleaned = 0

      for (const [key, rateLimit] of this.rateLimits.entries()) {
        if (rateLimit.windowEnd < now) {
          this.rateLimits.delete(key)
          cleaned++
        }
      }

      if (cleaned > 0) {
        logger.debug('Rate limits cleaned', {
          cleaned,
        })
      }
    } catch (error: any) {
      logger.error('Cleanup rate limits failed:', error)
    }
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    try {
      const securityEvent: SecurityEvent = {
        id: `security-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        ...event,
      }

      this.securityEvents.set(securityEvent.id, securityEvent)

      // Keep only last 1000 events
      if (this.securityEvents.size > 1000) {
        const oldest = Array.from(this.securityEvents.keys()).sort()[0]
        this.securityEvents.delete(oldest)
      }

      // Publish event
      eventBus.publish('admin.security.event', {
        event: securityEvent,
      })

      // Log critical events
      if (securityEvent.severity === 'critical' || securityEvent.severity === 'high') {
        logger.warn('Security event', {
          type: securityEvent.type,
          severity: securityEvent.severity,
          action: securityEvent.action,
          userId: securityEvent.userId,
          ipAddress: securityEvent.ipAddress,
        })
      }

      logger.debug('Security event logged', {
        eventId: securityEvent.id,
        type: securityEvent.type,
        severity: securityEvent.severity,
      })
    } catch (error: any) {
      logger.error('Log security event failed:', error)
    }
  }

  /**
   * Get security events
   */
  getSecurityEvents(
    type?: string,
    severity?: string,
    limit = 100
  ): SecurityEvent[] {
    try {
      let events = Array.from(this.securityEvents.values())

      if (type) {
        events = events.filter((e) => e.type === type)
      }

      if (severity) {
        events = events.filter((e) => e.severity === severity)
      }

      return events
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit)
    } catch (error: any) {
      logger.error('Get security events failed:', error)
      return []
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    activeSessions: number
    rateLimitEntries: number
    securityEvents: number
    securityEventsByType: Record<string, number>
    securityEventsBySeverity: Record<string, number>
  } {
    const activeSessions = Array.from(this.sessions.values()).filter((s) => s.active).length
    const events = Array.from(this.securityEvents.values())
    const eventsByType: Record<string, number> = {}
    const eventsBySeverity: Record<string, number> = {}

    for (const event of events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1
    }

    return {
      activeSessions,
      rateLimitEntries: this.rateLimits.size,
      securityEvents: events.length,
      securityEventsByType: eventsByType,
      securityEventsBySeverity: eventsBySeverity,
    }
  }
}

// Global Advanced Security
export const advancedSecurity = new AdvancedSecurity()

