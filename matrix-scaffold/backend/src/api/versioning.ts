import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

// API Version types
export type ApiVersion = 'v1' | 'v2'

// API versioning configuration
export const API_CONFIG = {
  currentVersion: 'v2' as ApiVersion,
  supportedVersions: ['v1', 'v2'] as ApiVersion[],
  deprecatedVersions: [] as ApiVersion[],
  defaultVersion: 'v2' as ApiVersion,
  versionHeader: 'X-API-Version',
  acceptHeader: 'Accept-Version'
}

// Version compatibility matrix
export const VERSION_COMPATIBILITY = {
  v1: {
    deprecated: false,
    supportUntil: '2025-12-31',
    features: {
      authentication: true,
      projects: true,
      deployments: true,
      teams: false,
      analytics: false,
      webhooks: false
    },
    limitations: {
      maxProjectsPerUser: 10,
      maxDeploymentsPerDay: 100,
      rateLimits: {
        requests: 1000,
        window: 3600 // 1 hour
      }
    }
  },
  v2: {
    deprecated: false,
    supportUntil: null, // Current version
    features: {
      authentication: true,
      projects: true,
      deployments: true,
      teams: true,
      analytics: true,
      webhooks: true,
      graphql: true,
      realtime: true
    },
    limitations: {
      maxProjectsPerUser: 100,
      maxDeploymentsPerDay: 1000,
      rateLimits: {
        requests: 10000,
        window: 3600 // 1 hour
      }
    }
  }
}

// API versioning middleware
export async function apiVersioning(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Extract version from URL path
  const pathVersion = extractVersionFromPath(request.url)
  
  // Extract version from headers
  const headerVersion = request.headers[API_CONFIG.versionHeader.toLowerCase()] as string ||
                       request.headers[API_CONFIG.acceptHeader.toLowerCase()] as string

  // Determine API version to use
  let apiVersion: ApiVersion = API_CONFIG.defaultVersion

  if (pathVersion && API_CONFIG.supportedVersions.includes(pathVersion as ApiVersion)) {
    apiVersion = pathVersion as ApiVersion
  } else if (headerVersion && API_CONFIG.supportedVersions.includes(headerVersion as ApiVersion)) {
    apiVersion = headerVersion as ApiVersion
  }

  // Check if version is supported
  if (!API_CONFIG.supportedVersions.includes(apiVersion)) {
    return reply.status(400).send({
      error: 'Unsupported API Version',
      message: `API version '${apiVersion}' is not supported`,
      supportedVersions: API_CONFIG.supportedVersions,
      currentVersion: API_CONFIG.currentVersion
    })
  }

  // Check if version is deprecated
  if (API_CONFIG.deprecatedVersions.includes(apiVersion)) {
    const versionInfo = VERSION_COMPATIBILITY[apiVersion]
    reply.header('X-API-Deprecated', 'true')
    reply.header('X-API-Deprecation-Date', versionInfo.supportUntil || 'unknown')
    reply.header('X-API-Sunset', versionInfo.supportUntil || 'unknown')
    reply.header('Warning', `299 - "API version ${apiVersion} is deprecated. Please migrate to ${API_CONFIG.currentVersion}"`)
  }

  // Add version info to headers
  reply.header('X-API-Version', apiVersion)
  reply.header('X-API-Current-Version', API_CONFIG.currentVersion)

  // Add version context to request
  ;(request as any).apiVersion = apiVersion
  ;(request as any).versionInfo = VERSION_COMPATIBILITY[apiVersion]
}

// Extract version from URL path
function extractVersionFromPath(url: string): string | null {
  const pathMatch = url.match(/^\/api\/(v\d+)\//)
  return pathMatch ? pathMatch[1] : null
}

// Version-specific feature checks
export function hasFeature(version: ApiVersion, feature: string): boolean {
  const versionInfo = VERSION_COMPATIBILITY[version]
  return versionInfo?.features[feature as keyof typeof versionInfo.features] || false
}

// Rate limiting based on API version
export function getVersionRateLimits(version: ApiVersion) {
  const versionInfo = VERSION_COMPATIBILITY[version]
  return versionInfo?.limitations.rateLimits || {
    requests: 100,
    window: 3600
  }
}

// API version response wrapper
export function createVersionedResponse<T>(
  data: T,
  version: ApiVersion,
  meta?: Record<string, any>
) {
  const response = {
    apiVersion: version,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: VERSION_COMPATIBILITY[version],
      ...meta
    }
  }

  // Version-specific transformations
  if (version === 'v1') {
    // V1 specific transformations
    return transformV1Response(response)
  }

  return response
}

// Transform response for V1 compatibility
function transformV1Response(response: any) {
  // Remove features not available in V1
  if (response.data) {
    // Remove team-related fields
    if (Array.isArray(response.data)) {
      response.data = response.data.map(removeV2Features)
    } else {
      response.data = removeV2Features(response.data)
    }
  }

  return response
}

function removeV2Features(item: any) {
  if (!item) return item

  // Remove V2-only fields
  const { teams, analytics, webhooks, ...v1Item } = item

  return v1Item
}

// Migration helper for deprecated versions
export function generateMigrationGuide(fromVersion: ApiVersion, toVersion: ApiVersion) {
  const migrationGuides = {
    'v1-v2': {
      title: 'Migrating from API v1 to v2',
      summary: 'API v2 introduces team collaboration, advanced analytics, and webhooks',
      changes: [
        {
          type: 'added',
          description: 'Team collaboration endpoints',
          endpoints: [
            'POST /api/v2/projects/{id}/team/invite',
            'GET /api/v2/projects/{id}/team',
            'DELETE /api/v2/projects/{id}/team/{userId}'
          ]
        },
        {
          type: 'added',
          description: 'Analytics endpoints',
          endpoints: [
            'GET /api/v2/analytics/projects/{id}',
            'GET /api/v2/analytics/deployments',
            'GET /api/v2/analytics/usage'
          ]
        },
        {
          type: 'added',
          description: 'Webhook management',
          endpoints: [
            'POST /api/v2/webhooks',
            'GET /api/v2/webhooks',
            'PUT /api/v2/webhooks/{id}'
          ]
        },
        {
          type: 'enhanced',
          description: 'Project model now includes team and analytics data',
          details: 'Projects now return additional fields: team, analytics, webhooks'
        },
        {
          type: 'enhanced',
          description: 'Improved error responses with detailed error codes',
          details: 'All error responses now include machine-readable error codes'
        }
      ],
      breakingChanges: [],
      timeline: {
        announcement: '2024-01-01',
        migrationPeriod: '2024-01-01 to 2025-12-31',
        deprecationDate: '2025-06-01',
        sunsetDate: '2025-12-31'
      }
    }
  }

  const key = `${fromVersion}-${toVersion}` as keyof typeof migrationGuides
  return migrationGuides[key] || null
}

// API changelog
export const API_CHANGELOG = {
  v2: {
    '2.1.0': {
      date: '2024-11-03',
      changes: [
        'Added GraphQL endpoint for complex queries',
        'Introduced real-time subscriptions via WebSocket',
        'Enhanced project analytics with detailed metrics',
        'Added webhook retry mechanism',
        'Improved error handling with detailed error codes'
      ]
    },
    '2.0.0': {
      date: '2024-01-01',
      changes: [
        'Added team collaboration features',
        'Introduced project analytics',
        'Added webhook support',
        'Enhanced authentication with OAuth2',
        'Improved rate limiting per user tier'
      ]
    }
  },
  v1: {
    '1.2.0': {
      date: '2023-06-01',
      changes: [
        'Added deployment logs endpoint',
        'Enhanced project filtering',
        'Improved error messages'
      ]
    },
    '1.1.0': {
      date: '2023-01-01',
      changes: [
        'Added project management endpoints',
        'Introduced deployment functionality',
        'Added user profile management'
      ]
    },
    '1.0.0': {
      date: '2022-01-01',
      changes: [
        'Initial API release',
        'Basic authentication',
        'User management',
        'Project CRUD operations'
      ]
    }
  }
}

// Register API versioning routes
export async function registerVersioning(fastify: FastifyInstance) {
  // API version info endpoint
  fastify.get('/api/version', async () => {
    return {
      currentVersion: API_CONFIG.currentVersion,
      supportedVersions: API_CONFIG.supportedVersions,
      deprecatedVersions: API_CONFIG.deprecatedVersions,
      compatibility: VERSION_COMPATIBILITY,
      changelog: API_CHANGELOG
    }
  })

  // Migration guide endpoint
  fastify.get('/api/migrate/:from/:to', async (request) => {
    const { from, to } = request.params as { from: ApiVersion; to: ApiVersion }
    
    const guide = generateMigrationGuide(from, to)
    if (!guide) {
      throw new Error(`Migration guide from ${from} to ${to} not found`)
    }

    return guide
  })

  // Health check with version info
  fastify.get('/api/health', async () => {
    return {
      status: 'healthy',
      version: API_CONFIG.currentVersion,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  })

  console.log('🔄 API versioning configured')
}