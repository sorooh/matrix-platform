/**
 * Application Configuration
 * Global-Ready Architecture - Centralized configuration
 */

import dotenv from 'dotenv'

dotenv.config()

export const config = {
  // Server Configuration
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  region: process.env.REGION || 'us-east-1',
  environment: process.env.NODE_ENV || 'development',

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || '',
    poolSize: Number(process.env.DB_POOL_SIZE || 20),
    timeout: Number(process.env.DB_TIMEOUT || 30000)
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    maxRetries: Number(process.env.REDIS_MAX_RETRIES || 3)
  },

  // API Configuration
  api: {
    url: process.env.API_URL || 'http://localhost:3000',
    corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['*'],
    rateLimit: {
      max: Number(process.env.RATE_LIMIT_MAX || 100),
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000)
    }
  },

  // AI Configuration
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o'
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229'
    },
    vectorProvider: process.env.VECTOR_PROVIDER || 'openai',
    vectorHttpUrl: process.env.VECTOR_HTTP_URL || ''
  },

  // AWS Configuration
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.S3_BUCKET || '',
    snapshotS3Bucket: process.env.SNAPSHOT_S3_BUCKET || ''
  },

  // CDN Configuration
  cdn: {
    url: process.env.CDN_URL || '',
    domain: process.env.CDN_DOMAIN || ''
  },

  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || '',
    encryptionKey: process.env.ENCRYPTION_KEY || '',
    encryptionIV: process.env.ENCRYPTION_IV || ''
  },

  // Monitoring Configuration
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN || '',
    logLevel: process.env.LOG_LEVEL || 'info',
    version: process.env.VERSION || '0.1.0'
  },

  // Integration Configuration
  integrations: {
    github: {
      token: process.env.GITHUB_TOKEN || '',
      owner: process.env.GITHUB_OWNER || '',
      repo: process.env.GITHUB_REPO || '',
      prNumber: process.env.GITHUB_PR_NUMBER || ''
    },
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL || ''
    }
  },

  // Feature Flags
  features: {
    enablePgVector: process.env.ENABLE_PGVECTOR !== 'false',
    enableRedis: process.env.ENABLE_REDIS !== 'false',
    enableSentry: process.env.ENABLE_SENTRY !== 'false',
    enableSlack: process.env.ENABLE_SLACK !== 'false',
    enableGitHub: process.env.ENABLE_GITHUB !== 'false'
  }
}

// Validate required configuration
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.database.url && config.environment === 'production') {
    errors.push('DATABASE_URL is required in production')
  }

  if (config.security.jwtSecret && config.security.jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

