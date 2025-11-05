/**
 * Phase 10.5 - Advanced Performance Monitoring (APM)
 * 
 * Advanced performance monitoring
 * - Application Performance Monitoring
 * - Transaction tracing
 * - Error tracking
 * - Performance profiling
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export interface APMTransaction {
  id: string
  name: string
  type: 'http' | 'database' | 'cache' | 'external' | 'custom'
  duration: number // milliseconds
  status: 'success' | 'error' | 'timeout'
  metadata: Record<string, any>
  timestamp: Date
}

export interface APMError {
  id: string
  transactionId: string
  error: {
    name: string
    message: string
    stack?: string
  }
  context: Record<string, any>
  timestamp: Date
}

class AdvancedPerformanceMonitoring {
  private transactions: Map<string, APMTransaction> = new Map()
  private errors: Map<string, APMError> = new Map()

  async initialize() {
    logInfo('Initializing Advanced Performance Monitoring (APM)...')
    logInfo('✅ Advanced Performance Monitoring (APM) initialized')
  }

  async recordTransaction(
    name: string,
    type: APMTransaction['type'],
    duration: number,
    status: APMTransaction['status'],
    metadata: Record<string, any> = {}
  ): Promise<APMTransaction> {
    const id = nanoid()
    const transaction: APMTransaction = {
      id,
      name,
      type,
      duration,
      status,
      metadata,
      timestamp: new Date()
    }
    this.transactions.set(id, transaction)
    return transaction
  }

  async recordError(
    transactionId: string,
    error: Error,
    context: Record<string, any> = {}
  ): Promise<APMError> {
    const id = nanoid()
    const apmError: APMError = {
      id,
      transactionId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: new Date()
    }
    this.errors.set(id, apmError)
    return apmError
  }
}

export const advancedPerformanceMonitoring = new AdvancedPerformanceMonitoring()

