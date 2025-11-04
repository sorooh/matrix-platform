/**
 * Winston Logger Configuration
 * Structured logging for production-ready system
 */

import winston from 'winston'
import dotenv from 'dotenv'

dotenv.config()

const logLevel = process.env.LOG_LEVEL || 'info'
const nodeEnv = process.env.NODE_ENV || 'development'

// Log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`
    }
    return msg
  })
)

// Create logger
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: {
    service: 'matrix-platform',
    region: process.env.REGION || 'us-east-1',
    environment: nodeEnv
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: nodeEnv === 'development' ? consoleFormat : logFormat
    }),
    // Error log file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat
    }),
    // Combined log file
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat
    })
  ]
})

// Add request ID for tracing
export function createLoggerWithContext(context: Record<string, any>) {
  return logger.child(context)
}

// Log levels
export const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
}

// Helper functions
export function logError(error: Error, context?: Record<string, any>) {
  logger.error({
    message: error.message,
    stack: error.stack,
    ...context
  })
}

export function logInfo(message: string, context?: Record<string, any>) {
  logger.info({
    message,
    ...context
  })
}

export function logWarn(message: string, context?: Record<string, any>) {
  logger.warn({
    message,
    ...context
  })
}

export function logDebug(message: string, context?: Record<string, any>) {
  logger.debug({
    message,
    ...context
  })
}

