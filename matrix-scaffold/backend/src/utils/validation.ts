/**
 * Validation Utilities
 * Global-Ready Architecture with input validation
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { logger } from '../config/logger'

export interface ValidationError {
  field: string
  message: string
}

export function validateRequired(
  body: any,
  fields: string[]
): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []

  for (const field of fields) {
    if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
      errors.push({
        field,
        message: `${field} is required`
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePagination(
  limit?: number,
  offset?: number
): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []

  if (limit !== undefined && (limit < 1 || limit > 1000)) {
    errors.push({
      field: 'limit',
      message: 'limit must be between 1 and 1000'
    })
  }

  if (offset !== undefined && offset < 0) {
    errors.push({
      field: 'offset',
      message: 'offset must be >= 0'
    })
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function handleValidationErrors(
  errors: ValidationError[],
  reply: FastifyReply
): boolean {
  if (errors.length > 0) {
    logger.warn('Validation errors', { errors })
    reply.status(400).send({
      error: 'Validation Error',
      message: 'Invalid input',
      errors
    })
    return false
  }
  return true
}

