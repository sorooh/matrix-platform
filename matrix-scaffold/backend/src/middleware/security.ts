/**
 * Security Middleware
 * Phase 3: Enterprise-Grade Security
 * Global-Ready Architecture
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { securitySystem } from '../enterprise/security'
import { logger } from '../config/logger'
import { sendError } from '../utils/response'

export function securityMiddleware(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  try {
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown'
    const userAgent = request.headers['user-agent'] || 'unknown'

    // Check if IP is blocked
    if (securitySystem.isIPBlocked(ip)) {
      sendError(reply, 'Forbidden', 'IP address is blocked', 403)
      return
    }

    // Check rate limit
    const allowed = securitySystem.checkRateLimit(ip, 100, 60000)
    if (!allowed) {
      sendError(reply, 'Too Many Requests', 'Rate limit exceeded', 429)
      return
    }

    // Threat detection on request body
    if (request.body) {
      const bodyString = JSON.stringify(request.body)
      const threat = securitySystem.detectThreat(bodyString, ip)

      if (threat.threat && threat.action === 'block') {
        sendError(reply, 'Forbidden', 'Threat detected', 403)
        return
      }
    }

    // Threat detection on query parameters
    if (request.query) {
      const queryString = JSON.stringify(request.query)
      const threat = securitySystem.detectThreat(queryString, ip)

      if (threat.threat && threat.action === 'block') {
        sendError(reply, 'Forbidden', 'Threat detected', 403)
        return
      }
    }

    done()
  } catch (error: any) {
    logger.error('Security middleware error:', error)
    sendError(reply, 'Internal Server Error', 'Security check failed', 500)
  }
}

