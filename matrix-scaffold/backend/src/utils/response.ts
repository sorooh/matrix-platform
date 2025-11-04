/**
 * Response Utilities
 * Global-Ready Architecture with standardized responses
 */

import { FastifyReply } from 'fastify'

export interface SuccessResponse<T = any> {
  success: true
  data: T
  requestId?: string
  timestamp?: string
}

export interface ErrorResponse {
  success: false
  error: string
  message?: string
  requestId?: string
  timestamp?: string
}

export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode: number = 200): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    requestId: reply.request.id,
    timestamp: new Date().toISOString()
  }
  reply.status(statusCode).send(response)
}

export function sendError(
  reply: FastifyReply,
  error: string,
  message?: string,
  statusCode: number = 500
): void {
  const response: ErrorResponse = {
    success: false,
    error,
    message,
    requestId: reply.request.id,
    timestamp: new Date().toISOString()
  }
  reply.status(statusCode).send(response)
}

export function sendPaginated<T>(
  reply: FastifyReply,
  data: T[],
  total: number,
  limit: number,
  offset: number
): void {
  sendSuccess(
    reply,
    {
      items: data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + data.length < total
      }
    },
    200
  )
}

