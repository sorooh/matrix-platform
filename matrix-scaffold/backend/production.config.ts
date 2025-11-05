/**
 * Production Configuration - Matrix Platform v11
 * Global Professional Edition
 */

export const productionConfig = {
  version: '11.0.0',
  build: 'Matrix Global Professional Build',
  environment: 'production',
  
  // Hosting
  hosting: {
    vercel: {
      enabled: true,
      region: 'global',
      functions: {
        regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1']
      }
    },
    firebase: {
      enabled: true,
      projectId: process.env.FIREBASE_PROJECT_ID || 'matrix-platform',
      region: 'us-central1'
    },
    cloudflare: {
      enabled: true,
      zones: process.env.CLOUDFLARE_ZONES?.split(',') || [],
      workers: true
    }
  },

  // Database
  database: {
    postgresql: {
      url: process.env.DATABASE_URL || '',
      poolSize: 20,
      ssl: true,
      connectionTimeout: 10000
    },
    redis: {
      url: process.env.REDIS_URL || '',
      ttl: 3600,
      maxRetries: 3
    }
  },

  // CI/CD
  cicd: {
    provider: 'github-actions',
    workflows: {
      build: true,
      test: true,
      deploy: true,
      monitoring: true
    }
  },

  // Monitoring
  monitoring: {
    prometheus: {
      enabled: true,
      endpoint: '/metrics',
      interval: 30000
    },
    grafana: {
      enabled: true,
      dashboards: true
    },
    opentelemetry: {
      enabled: true,
      endpoint: process.env.OTEL_ENDPOINT || '',
      serviceName: 'matrix-platform'
    }
  },

  // Security
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['*'],
      credentials: true
    },
    rateLimit: {
      enabled: true,
      max: 100,
      windowMs: 60000
    },
    ssl: {
      enabled: true,
      autoRenew: true
    }
  },

  // Performance
  performance: {
    caching: {
      enabled: true,
      strategy: 'redis',
      ttl: 3600
    },
    cdn: {
      enabled: true,
      provider: 'cloudflare'
    },
    compression: {
      enabled: true,
      algorithm: 'gzip'
    }
  }
}

export default productionConfig

