/**
 * Sentry Configuration
 * Error tracking and monitoring
 */

import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import dotenv from 'dotenv'

dotenv.config()

// Initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      nodeProfilingIntegration()
    ],
    beforeSend(event, hint) {
      // Filter sensitive data
      if (event.request) {
        if (event.request.headers) {
          delete event.request.headers['authorization']
          delete event.request.headers['cookie']
        }
        if (event.request.data) {
          // Remove sensitive fields
          if (typeof event.request.data === 'object') {
            delete (event.request.data as any).password
            delete (event.request.data as any).token
            delete (event.request.data as any).apiKey
          }
        }
      }
      return event
    }
  })

  console.log('✅ Sentry initialized')
} else {
  console.log('⚠️ Sentry DSN not configured, skipping initialization')
}

// Export Sentry
export { Sentry }

// Helper function to capture errors
export function captureException(error: Error, context?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context
    })
  }
}

// Helper function to capture messages
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, {
      level,
      extra: context
    })
  }
}

