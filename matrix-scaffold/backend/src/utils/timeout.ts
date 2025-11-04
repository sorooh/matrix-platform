/**
 * Timeout Utilities
 * Global-Ready Architecture with timeout handling
 */

import { logger } from '../config/logger'

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        logger.warn('Operation timed out', { timeoutMs, errorMessage })
        reject(new Error(errorMessage))
      }, timeoutMs)
    })
  ])
}

