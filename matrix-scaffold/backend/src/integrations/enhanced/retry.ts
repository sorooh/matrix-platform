/**
 * Retry Mechanism for Integrations
 * Phase 2: Integration Hub - Error recovery and retry logic
 * Global-Ready Architecture
 */

import { logger } from '../../config/logger'
import { delay } from '../../utils/timeout'

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableErrors?: string[]
}

export class RetryManager {
  private defaultOptions: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: [
      'timeout',
      'network',
      'connection',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'rate limit',
      '429',
      '503',
      '502',
      '500'
    ]
  }

  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options }
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error: any) {
        lastError = error

        // Check if error is retryable
        if (!this.isRetryableError(error, opts.retryableErrors)) {
          throw error
        }

        // Check if we've exhausted retries
        if (attempt >= opts.maxRetries) {
          logger.error(`Max retries (${opts.maxRetries}) exceeded`, {
            error: error.message,
            attempts: attempt + 1
          })
          throw error
        }

        // Calculate delay with exponential backoff
        const delayMs = Math.min(
          opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
          opts.maxDelay
        )

        logger.warn(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delayMs}ms`, {
          error: error.message
        })

        await delay(delayMs)
      }
    }

    throw lastError || new Error('Retry failed')
  }

  private isRetryableError(error: any, retryableErrors: string[]): boolean {
    const errorMessage = (error.message || '').toLowerCase()
    const errorCode = error.code || ''
    const statusCode = error.statusCode || error.status || ''

    return retryableErrors.some((pattern) => {
      const patternLower = pattern.toLowerCase()
      return (
        errorMessage.includes(patternLower) ||
        errorCode.toLowerCase().includes(patternLower) ||
        String(statusCode).includes(pattern)
      )
    })
  }
}

// Global Retry Manager
export const retryManager = new RetryManager()

