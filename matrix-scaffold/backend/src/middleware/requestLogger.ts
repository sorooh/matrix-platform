/**
 * Request Logger Middleware
 * Global-Ready Architecture with request logging
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { logger } from '../config/logger'

export function requestLogger(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const start = Date.now()

  reply.addHook('onSend', (request, reply, payload, done) => {
    const duration = Date.now() - start
    const statusCode = reply.statusCode

    logger.info('Request completed', {
      method: request.method,
      url: request.url,
      statusCode,
      duration,
      requestId: request.id,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    })

    done()
  })

  done()
}

