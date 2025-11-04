/**
 * Fastify Type Extensions
 * Global-Ready Architecture type definitions
 */

import { FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    requestId?: string
    startTime?: number
  }

  interface FastifyReply {
    requestId?: string
  }
}

