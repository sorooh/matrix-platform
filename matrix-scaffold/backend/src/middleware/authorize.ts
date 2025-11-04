/**
 * Authorization Middleware
 * Phase 2: Enterprise Features - Authorization middleware
 * Global-Ready Architecture
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { AuthenticatedRequest } from './auth'
import { hasRole, Role } from '../enterprise/rbac'
import { sendError } from '../utils/response'

export function requireRole(role: Role) {
  return (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
    try {
      const authRequest = request as AuthenticatedRequest
      const user = authRequest.user

      if (!user) {
        sendError(reply, 'Unauthorized', 'Authentication required', 401)
        return
      }

      const userRole = user.role as Role
      if (!hasRole({ role: userRole } as any, role)) {
        sendError(reply, 'Forbidden', `Role '${role}' required`, 403)
        return
      }

      done()
    } catch (error: any) {
      sendError(reply, 'Forbidden', 'Role check failed', 403)
    }
  }
}
