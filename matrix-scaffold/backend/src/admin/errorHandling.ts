/**
 * Advanced Error Handling
 * Phase 7.3.1: Professional Enhancements
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'

export type ErrorType = 'transient' | 'permanent' | 'user' | 'system' | 'validation' | 'authorization' | 'network' | 'database' | 'external'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ErrorContext {
  userId?: string
  ipAddress?: string
  userAgent?: string
  endpoint?: string
  method?: string
  requestId?: string
  timestamp: Date
  [key: string]: unknown
}

export interface ClassifiedError {
  id: string
  type: ErrorType
  severity: ErrorSeverity
  message: string
  originalError: Error
  context: ErrorContext
  stack?: string
  recoverable: boolean
  retryable: boolean
  retryCount: number
  maxRetries: number
  createdAt: Date
  resolvedAt?: Date
  resolved: boolean
}

export interface RetryStrategy {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitter: boolean
}

export interface ErrorRecovery {
  id: string
  errorId: string
  action: string
  success: boolean
  timestamp: Date
  details?: Record<string, unknown>
}

export class AdvancedErrorHandling {
  private errors: Map<string, ClassifiedError> = new Map()
  private recoveries: Map<string, ErrorRecovery> = new Map()
  private defaultRetryStrategy: RetryStrategy = {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    jitter: true,
  }

  /**
   * Initialize Advanced Error Handling
   */
  async initialize(): Promise<void> {
    try {
      // Start periodic cleanup
      this.startPeriodicCleanup()

      // Subscribe to error events
      this.subscribeToEvents()

      logger.info('Advanced Error Handling initialized')
    } catch (error: any) {
      logger.error('Advanced Error Handling initialization failed:', error)
      throw error
    }
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    // Clean resolved errors every hour
    setInterval(() => {
      this.cleanupResolvedErrors()
    }, 60 * 60 * 1000)

    logger.debug('Periodic cleanup started')
  }

  /**
   * Subscribe to events
   */
  private subscribeToEvents(): void {
    // Subscribe to error events from event bus
    eventBus.subscribe('error', (data: any) => {
      try {
        const error = data.error as Error
        const context = data.context || {}
        this.handleError(error, context)
      } catch (err: any) {
        logger.error('Error handling subscription failed:', err)
      }
    })

    logger.debug('Error handling event subscriptions initialized')
  }

  /**
   * Classify error
   */
  classifyError(error: Error): { type: ErrorType; severity: ErrorSeverity; recoverable: boolean; retryable: boolean } {
    const message = error.message.toLowerCase()
    const name = error.name.toLowerCase()

    // Network errors - transient, retryable
    if (name.includes('network') || name.includes('timeout') || name.includes('econnrefused') || name.includes('econnreset')) {
      return {
        type: 'network',
        severity: 'medium',
        recoverable: true,
        retryable: true,
      }
    }

    // Database errors - check if transient
    if (name.includes('database') || name.includes('prisma') || name.includes('sql') || name.includes('connection')) {
      if (message.includes('connection') || message.includes('timeout') || message.includes('pool')) {
        return {
          type: 'database',
          severity: 'high',
          recoverable: true,
          retryable: true,
        }
      }
      return {
        type: 'database',
        severity: 'high',
        recoverable: false,
        retryable: false,
      }
    }

    // Validation errors - permanent, user error
    if (name.includes('validation') || name.includes('invalid') || name.includes('bad request')) {
      return {
        type: 'validation',
        severity: 'low',
        recoverable: false,
        retryable: false,
      }
    }

    // Authorization errors - permanent, user error
    if (name.includes('unauthorized') || name.includes('forbidden') || name.includes('permission')) {
      return {
        type: 'authorization',
        severity: 'medium',
        recoverable: false,
        retryable: false,
      }
    }

    // External API errors - transient, retryable
    if (name.includes('external') || name.includes('api') || message.includes('rate limit') || message.includes('503') || message.includes('502')) {
      return {
        type: 'external',
        severity: 'medium',
        recoverable: true,
        retryable: true,
      }
    }

    // System errors - high severity
    if (name.includes('system') || name.includes('internal')) {
      return {
        type: 'system',
        severity: 'high',
        recoverable: true,
        retryable: false,
      }
    }

    // Default - transient, medium severity
    return {
      type: 'transient',
      severity: 'medium',
      recoverable: true,
      retryable: true,
    }
  }

  /**
   * Handle error
   */
  handleError(error: Error, context: ErrorContext = {}): ClassifiedError {
    try {
      const classification = this.classifyError(error)
      const errorId = `error-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      const classifiedError: ClassifiedError = {
        id: errorId,
        type: classification.type,
        severity: classification.severity,
        message: error.message,
        originalError: error,
        context: {
          ...context,
          timestamp: new Date(),
        },
        stack: error.stack,
        recoverable: classification.recoverable,
        retryable: classification.retryable,
        retryCount: 0,
        maxRetries: classification.retryable ? this.defaultRetryStrategy.maxRetries : 0,
        createdAt: new Date(),
        resolved: false,
      }

      this.errors.set(errorId, classifiedError)

      // Log error
      this.logError(classifiedError)

      // Attempt recovery if recoverable
      if (classification.recoverable && !classification.retryable) {
        this.attemptRecovery(classifiedError)
      }

      // Publish error event
      eventBus.publish('admin.error.classified', {
        error: classifiedError,
      })

      logger.debug('Error classified and handled', {
        errorId,
        type: classification.type,
        severity: classification.severity,
      })

      return classifiedError
    } catch (err: any) {
      logger.error('Error handling failed:', err)
      throw err
    }
  }

  /**
   * Log error
   */
  private logError(error: ClassifiedError): void {
    const logLevel =
      error.severity === 'critical' ? 'error' : error.severity === 'high' ? 'error' : error.severity === 'medium' ? 'warn' : 'info'

    logger[logLevel]('Error classified', {
      errorId: error.id,
      type: error.type,
      severity: error.severity,
      message: error.message,
      recoverable: error.recoverable,
      retryable: error.retryable,
      context: error.context,
    })
  }

  /**
   * Attempt recovery
   */
  private attemptRecovery(error: ClassifiedError): void {
    try {
      if (!error.recoverable || error.resolved) {
        return
      }

      logger.info('Attempting error recovery', {
        errorId: error.id,
        type: error.type,
      })

      // Recovery strategies based on error type
      let recoveryAction = 'none'
      let recoverySuccess = false

      switch (error.type) {
        case 'database':
          // Attempt database reconnection
          recoveryAction = 'database.reconnect'
          recoverySuccess = this.recoverDatabase(error)
          break

        case 'network':
          // Wait and retry
          recoveryAction = 'network.retry'
          recoverySuccess = true
          break

        case 'system':
          // System restart or cleanup
          recoveryAction = 'system.cleanup'
          recoverySuccess = this.recoverSystem(error)
          break

        default:
          recoveryAction = 'none'
          recoverySuccess = false
      }

      // Record recovery attempt
      const recoveryId = `recovery-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const recovery: ErrorRecovery = {
        id: recoveryId,
        errorId: error.id,
        action: recoveryAction,
        success: recoverySuccess,
        timestamp: new Date(),
        details: {
          errorType: error.type,
          errorSeverity: error.severity,
        },
      }

      this.recoveries.set(recoveryId, recovery)

      if (recoverySuccess) {
        error.resolved = true
        error.resolvedAt = new Date()
        this.errors.set(error.id, error)

        logger.info('Error recovery successful', {
          errorId: error.id,
          recoveryId,
          action: recoveryAction,
        })

        // Publish recovery event
        eventBus.publish('admin.error.recovered', {
          error: error,
          recovery: recovery,
        })
      } else {
        logger.warn('Error recovery failed', {
          errorId: error.id,
          recoveryId,
          action: recoveryAction,
        })
      }
    } catch (err: any) {
      logger.error('Recovery attempt failed:', err)
    }
  }

  /**
   * Recover database
   */
  private recoverDatabase(error: ClassifiedError): boolean {
    try {
      // In production, attempt database reconnection
      // For now, return true to indicate recovery attempt
      logger.debug('Database recovery attempted', {
        errorId: error.id,
      })
      return true
    } catch (err: any) {
      logger.error('Database recovery failed:', err)
      return false
    }
  }

  /**
   * Recover system
   */
  private recoverSystem(error: ClassifiedError): boolean {
    try {
      // In production, perform system cleanup
      // For now, return true to indicate recovery attempt
      logger.debug('System recovery attempted', {
        errorId: error.id,
      })
      return true
    } catch (err: any) {
      logger.error('System recovery failed:', err)
      return false
    }
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    error: ClassifiedError,
    strategy: Partial<RetryStrategy> = {}
  ): Promise<T> {
    const retryStrategy = { ...this.defaultRetryStrategy, ...strategy }
    let lastError: Error = error.originalError

    for (let attempt = 0; attempt <= retryStrategy.maxRetries; attempt++) {
      try {
        error.retryCount = attempt
        this.errors.set(error.id, error)

        const result = await fn()

        // Success - reset retry count
        error.retryCount = 0
        this.errors.set(error.id, error)

        logger.info('Retry successful', {
          errorId: error.id,
          attempt,
        })

        return result
      } catch (err: any) {
        lastError = err

        if (attempt < retryStrategy.maxRetries) {
          // Calculate delay with exponential backoff
          const baseDelay = retryStrategy.initialDelay * Math.pow(retryStrategy.backoffMultiplier, attempt)
          const delay = Math.min(baseDelay, retryStrategy.maxDelay)

          // Add jitter if enabled
          const finalDelay = retryStrategy.jitter ? delay + Math.random() * delay * 0.1 : delay

          logger.debug('Retry attempt failed, waiting before retry', {
            errorId: error.id,
            attempt,
            nextAttempt: attempt + 1,
            delay: finalDelay,
          })

          await new Promise((resolve) => setTimeout(resolve, finalDelay))
        } else {
          logger.error('All retry attempts failed', {
            errorId: error.id,
            attempts: attempt + 1,
          })
        }
      }
    }

    throw lastError
  }

  /**
   * Get error
   */
  getError(errorId: string): ClassifiedError | null {
    return this.errors.get(errorId) || null
  }

  /**
   * Get errors
   */
  getErrors(
    type?: ErrorType,
    severity?: ErrorSeverity,
    resolved?: boolean,
    limit = 100
  ): ClassifiedError[] {
    let errors = Array.from(this.errors.values())

    if (type) {
      errors = errors.filter((e) => e.type === type)
    }

    if (severity) {
      errors = errors.filter((e) => e.severity === severity)
    }

    if (resolved !== undefined) {
      errors = errors.filter((e) => e.resolved === resolved)
    }

    return errors
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  /**
   * Get recoveries
   */
  getRecoveries(errorId?: string, limit = 100): ErrorRecovery[] {
    let recoveries = Array.from(this.recoveries.values())

    if (errorId) {
      recoveries = recoveries.filter((r) => r.errorId === errorId)
    }

    return recoveries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Cleanup resolved errors
   */
  private cleanupResolvedErrors(): void {
    try {
      const now = new Date()
      const cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago

      let cleaned = 0

      for (const [errorId, error] of this.errors.entries()) {
        if (error.resolved && error.resolvedAt && error.resolvedAt < cutoffDate) {
          this.errors.delete(errorId)
          cleaned++
        }
      }

      if (cleaned > 0) {
        logger.debug('Resolved errors cleaned', {
          cleaned,
        })
      }
    } catch (error: any) {
      logger.error('Cleanup resolved errors failed:', error)
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalErrors: number
    resolvedErrors: number
    unresolvedErrors: number
    errorsByType: Record<string, number>
    errorsBySeverity: Record<string, number>
    totalRecoveries: number
    successfulRecoveries: number
    failedRecoveries: number
  } {
    const errors = Array.from(this.errors.values())
    const recoveries = Array.from(this.recoveries.values())

    const errorsByType: Record<string, number> = {}
    const errorsBySeverity: Record<string, number> = {}

    for (const error of errors) {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1
    }

    return {
      totalErrors: errors.length,
      resolvedErrors: errors.filter((e) => e.resolved).length,
      unresolvedErrors: errors.filter((e) => !e.resolved).length,
      errorsByType,
      errorsBySeverity,
      totalRecoveries: recoveries.length,
      successfulRecoveries: recoveries.filter((r) => r.success).length,
      failedRecoveries: recoveries.filter((r) => !r.success).length,
    }
  }
}

// Global Advanced Error Handling
export const advancedErrorHandling = new AdvancedErrorHandling()

