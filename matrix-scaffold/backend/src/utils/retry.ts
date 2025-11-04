/**
 * Retry Utilities
 * Global-Ready Architecture with retry logic
 */

import { logger } from '../config/logger'

export interface RetryOptions {
  maxAttempts?: number
  delayMs?: number
  backoff?: 'linear' | 'exponential'
  onRetry?: (attempt: number, error: Error) => void
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoff = 'exponential',
    onRetry
  } = options

  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt < maxAttempts) {
        const delay = backoff === 'exponential' ? delayMs * Math.pow(2, attempt - 1) : delayMs * attempt

        logger.warn('Retry attempt', {
          attempt,
          maxAttempts,
          delay,
          error: lastError.message
        })

        if (onRetry) {
          onRetry(attempt, lastError)
        }

        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

