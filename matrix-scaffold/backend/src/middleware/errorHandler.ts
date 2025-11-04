/**
 * Error Handler Middleware
 * Global-Ready Architecture with comprehensive error handling
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { logError, logger } from '../config/logger'
import { captureException } from '../config/sentry'
import { config } from '../config/app'

export interface ErrorResponse {
  error: string
  message?: string
  requestId?: string
  timestamp?: string
  statusCode?: number
}

export function errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply) {
  // Log error
  logError(error, {
    url: request.url,
    method: request.method,
    requestId: request.id,
    ip: request.ip,
    userAgent: request.headers['user-agent']
  })

  // Capture in Sentry (if enabled)
  if (config.features.enableSentry && config.monitoring.sentryDsn) {
    captureException(error, {
      url: request.url,
      method: request.method,
      requestId: request.id,
      ip: request.ip
    })
  }

  // Determine status code
  const statusCode = (error as any).statusCode || 500

  // Build error response
  const response: ErrorResponse = {
    error: error.name || 'Internal Server Error',
    message: config.environment === 'production' ? 'An error occurred' : error.message,
    requestId: request.id,
    timestamp: new Date().toISOString(),
    statusCode
  }

  // Send response
  return reply.status(statusCode).send(response)
}

