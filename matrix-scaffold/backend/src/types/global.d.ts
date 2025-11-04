/**
 * Global Type Definitions
 * Global-Ready Architecture type definitions
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Server
      NODE_ENV?: 'development' | 'production' | 'test'
      PORT?: string
      HOST?: string
      REGION?: string

      // Database
      DATABASE_URL?: string
      DB_POOL_SIZE?: string
      DB_TIMEOUT?: string

      // Redis
      REDIS_URL?: string
      REDIS_MAX_RETRIES?: string

      // API
      API_URL?: string
      CORS_ORIGIN?: string
      RATE_LIMIT_MAX?: string
      RATE_LIMIT_WINDOW_MS?: string

      // AI
      OPENAI_API_KEY?: string
      OPENAI_MODEL?: string
      ANTHROPIC_API_KEY?: string
      ANTHROPIC_MODEL?: string
      VECTOR_PROVIDER?: string
      VECTOR_HTTP_URL?: string

      // AWS
      AWS_ACCESS_KEY_ID?: string
      AWS_SECRET_ACCESS_KEY?: string
      AWS_REGION?: string
      S3_BUCKET?: string
      SNAPSHOT_S3_BUCKET?: string

      // CDN
      CDN_URL?: string
      CDN_DOMAIN?: string

      // Security
      JWT_SECRET?: string
      ENCRYPTION_KEY?: string
      ENCRYPTION_IV?: string

      // Monitoring
      SENTRY_DSN?: string
      LOG_LEVEL?: string

      // Integrations
      GITHUB_TOKEN?: string
      GITHUB_OWNER?: string
      GITHUB_REPO?: string
      GITHUB_PR_NUMBER?: string
      SLACK_WEBHOOK_URL?: string

      // Feature Flags
      ENABLE_PGVECTOR?: string
      ENABLE_REDIS?: string
      ENABLE_SENTRY?: string
      ENABLE_SLACK?: string
      ENABLE_GITHUB?: string
    }
  }
}

export {}

