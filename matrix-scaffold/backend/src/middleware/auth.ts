/**
 * Authentication Middleware
 * Global-Ready Architecture with JWT authentication
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken } from '../enterprise/auth'
import { logger } from '../config/logger'

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Skip authentication for public endpoints
  const publicPaths = ['/health', '/metrics', '/api/agents/chat']
  if (publicPaths.some((path) => request.url.startsWith(path))) {
    return
  }

  // Get token from header
  const authHeader = request.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required'
    })
    return
  }

  const token = authHeader.substring(7)
  const decoded = verifyToken(token)

  if (!decoded) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    })
    return
  }

  // Attach user info to request
  ;(request as any).user = decoded
  logger.debug('User authenticated', { userId: decoded.userId, email: decoded.email })
}

