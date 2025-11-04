/**
 * Authorization Middleware
 * Global-Ready Architecture with RBAC
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { requirePermission, Role } from '../enterprise/rbac'
import { logger } from '../config/logger'

export function authorize(resource: string, action: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = (request as any).user
    if (!user) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
      return
    }

    try {
      requirePermission(user.role as Role, resource, action)
      logger.debug('Authorization granted', {
        userId: user.userId,
        role: user.role,
        resource,
        action
      })
    } catch (error: any) {
      logger.warn('Authorization denied', {
        userId: user.userId,
        role: user.role,
        resource,
        action,
        error: error.message
      })
      reply.status(403).send({
        error: 'Forbidden',
        message: error.message
      })
    }
  }
}

