/**
 * Authentication Middleware
 * Phase 2: Enterprise Features - Authentication middleware
 * Global-Ready Architecture
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken, extractTokenFromHeader, AuthToken } from '../enterprise/auth'
import { hasPermission, Permission } from '../enterprise/rbac'
import { logger } from '../config/logger'
import { sendError } from '../utils/response'

export interface AuthenticatedRequest extends FastifyRequest {
  user?: AuthToken
}

export function requireAuth(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  try {
    const authHeader = request.headers.authorization
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      sendError(reply, 'Unauthorized', 'Authentication required', 401)
      return
    }

    const user = verifyToken(token)
    if (!user) {
      sendError(reply, 'Unauthorized', 'Invalid or expired token', 401)
      return
    }

    ;(request as AuthenticatedRequest).user = user
    done()
  } catch (error: any) {
    logger.error('Auth middleware error:', error)
    sendError(reply, 'Unauthorized', 'Authentication failed', 401)
  }
}

export function requirePermission(permission: Permission) {
  return (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
    try {
      const authRequest = request as AuthenticatedRequest
      const user = authRequest.user

      if (!user) {
        sendError(reply, 'Unauthorized', 'Authentication required', 401)
        return
      }

      const userPermissions = user.permissions || []
      if (!userPermissions.includes(permission) && !userPermissions.includes('admin')) {
        sendError(reply, 'Forbidden', `Permission '${permission}' required`, 403)
        return
      }

      done()
    } catch (error: any) {
      logger.error('Permission middleware error:', error)
      sendError(reply, 'Forbidden', 'Permission check failed', 403)
    }
  }
}
