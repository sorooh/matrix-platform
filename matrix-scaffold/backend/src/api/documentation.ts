import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { FastifyInstance } from 'fastify'

// OpenAPI specification
const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Matrix Platform API',
      version: '2.0.0',
      description: `
        **Enterprise-grade development platform API**
        
        Matrix Platform provides comprehensive APIs for:
        - User management and authentication
        - Project creation and deployment
        - Team collaboration and permissions
        - Real-time notifications and analytics
        
        ## Authentication
        Most endpoints require authentication via JWT token in the Authorization header:
        \`Authorization: Bearer <your_jwt_token>\`
        
        ## Rate Limiting
        API requests are rate limited per user:
        - Free tier: 100 requests/hour
        - Pro tier: 1000 requests/hour  
        - Enterprise: 10000 requests/hour
        
        ## Error Handling
        The API uses conventional HTTP response codes:
        - **200-299**: Success
        - **400**: Bad Request - Invalid parameters
        - **401**: Unauthorized - Authentication required
        - **403**: Forbidden - Insufficient permissions
        - **404**: Not Found - Resource doesn't exist
        - **429**: Too Many Requests - Rate limit exceeded
        - **500**: Internal Server Error
        
        ## Pagination
        List endpoints support pagination with query parameters:
        - \`page\`: Page number (default: 1)
        - \`limit\`: Items per page (default: 20, max: 100)
        - \`sort\`: Sort field (default: createdAt)
        - \`order\`: Sort direction (asc/desc, default: desc)
      `,
      termsOfService: 'https://matrix-platform.com/terms',
      contact: {
        name: 'Matrix Platform Support',
        url: 'https://matrix-platform.com/support',
        email: 'support@matrix-platform.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.matrix-platform.com',
        description: 'Production server'
      },
      {
        url: 'https://staging-api.matrix-platform.com',
        description: 'Staging server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for server-to-server authentication'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'email', 'username', 'role'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique user identifier',
              example: '64a1b2c3d4e5f6789abcdef0'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com'
            },
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 30,
              description: 'Unique username',
              example: 'johndoe'
            },
            role: {
              type: 'string',
              enum: ['super_admin', 'admin', 'developer', 'viewer'],
              description: 'User role',
              example: 'developer'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the user account is active',
              example: true
            },
            profile: {
              $ref: '#/components/schemas/UserProfile'
            },
            subscription: {
              $ref: '#/components/schemas/Subscription'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
              example: '2024-01-15T10:30:00Z'
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp',
              example: '2024-01-15T10:30:00Z'
            }
          }
        },
        UserProfile: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              example: 'John'
            },
            lastName: {
              type: 'string',
              example: 'Doe'
            },
            avatar: {
              type: 'string',
              format: 'uri',
              example: 'https://avatar.example.com/user.jpg'
            },
            bio: {
              type: 'string',
              maxLength: 500,
              example: 'Full-stack developer passionate about modern web technologies'
            },
            location: {
              type: 'string',
              example: 'San Francisco, CA'
            },
            website: {
              type: 'string',
              format: 'uri',
              example: 'https://johndoe.dev'
            },
            socialLinks: {
              type: 'object',
              properties: {
                github: {
                  type: 'string',
                  example: 'https://github.com/johndoe'
                },
                linkedin: {
                  type: 'string',
                  example: 'https://linkedin.com/in/johndoe'
                },
                twitter: {
                  type: 'string',
                  example: 'https://twitter.com/johndoe'
                }
              }
            }
          }
        },
        Subscription: {
          type: 'object',
          properties: {
            plan: {
              type: 'string',
              enum: ['free', 'pro', 'enterprise'],
              example: 'pro'
            },
            status: {
              type: 'string',
              enum: ['active', 'cancelled', 'expired'],
              example: 'active'
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00Z'
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              example: '2024-12-31T23:59:59Z'
            }
          }
        },
        Project: {
          type: 'object',
          required: ['id', 'name', 'slug', 'owner', 'status'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique project identifier',
              example: '64a1b2c3d4e5f6789abcdef1'
            },
            name: {
              type: 'string',
              maxLength: 100,
              description: 'Project name',
              example: 'My Awesome App'
            },
            slug: {
              type: 'string',
              description: 'URL-friendly project identifier',
              example: 'my-awesome-app'
            },
            description: {
              type: 'string',
              maxLength: 500,
              description: 'Project description',
              example: 'A modern web application built with React and Node.js'
            },
            owner: {
              type: 'string',
              description: 'Project owner user ID',
              example: '64a1b2c3d4e5f6789abcdef0'
            },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'paused', 'completed', 'archived', 'deleted'],
              description: 'Project status',
              example: 'active'
            },
            isPublic: {
              type: 'boolean',
              description: 'Whether the project is publicly visible',
              example: false
            },
            framework: {
              $ref: '#/components/schemas/ProjectFramework'
            },
            repository: {
              $ref: '#/components/schemas/Repository'
            },
            deployments: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Deployment'
              }
            },
            analytics: {
              $ref: '#/components/schemas/ProjectAnalytics'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            }
          }
        },
        ProjectFramework: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['react', 'vue', 'angular', 'nextjs', 'nuxtjs', 'static', 'custom'],
              example: 'react'
            },
            version: {
              type: 'string',
              example: '18.0.0'
            },
            buildCommand: {
              type: 'string',
              example: 'npm run build'
            },
            outputDirectory: {
              type: 'string',
              example: 'dist'
            }
          }
        },
        Repository: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              enum: ['github', 'gitlab', 'bitbucket', 'manual'],
              example: 'github'
            },
            url: {
              type: 'string',
              format: 'uri',
              example: 'https://github.com/user/repo'
            },
            branch: {
              type: 'string',
              example: 'main'
            },
            lastCommit: {
              type: 'object',
              properties: {
                sha: {
                  type: 'string',
                  example: 'a1b2c3d4e5f6789'
                },
                message: {
                  type: 'string',
                  example: 'feat: add new feature'
                },
                author: {
                  type: 'string',
                  example: 'John Doe'
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  example: '2024-01-15T10:30:00Z'
                }
              }
            }
          }
        },
        Deployment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'deploy_123abc'
            },
            status: {
              type: 'string',
              enum: ['pending', 'building', 'deploying', 'success', 'failed', 'cancelled'],
              example: 'success'
            },
            environment: {
              type: 'string',
              enum: ['development', 'staging', 'production', 'preview'],
              example: 'production'
            },
            url: {
              type: 'string',
              format: 'uri',
              example: 'https://my-app.matrix-platform.app'
            },
            buildTime: {
              type: 'number',
              description: 'Build time in seconds',
              example: 45
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            }
          }
        },
        ProjectAnalytics: {
          type: 'object',
          properties: {
            totalViews: {
              type: 'number',
              example: 1250
            },
            totalDeployments: {
              type: 'number',
              example: 23
            },
            averageBuildTime: {
              type: 'number',
              description: 'Average build time in seconds',
              example: 42.5
            },
            successRate: {
              type: 'number',
              description: 'Deployment success rate as percentage',
              example: 95.7
            }
          }
        },
        Error: {
          type: 'object',
          required: ['error', 'message'],
          properties: {
            error: {
              type: 'string',
              description: 'Error type',
              example: 'ValidationError'
            },
            message: {
              type: 'string',
              description: 'Human-readable error message',
              example: 'The provided email address is invalid'
            },
            code: {
              type: 'string',
              description: 'Machine-readable error code',
              example: 'INVALID_EMAIL'
            },
            details: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Additional error details',
              example: ['Email must be a valid email address']
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {}
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'number',
                  example: 1
                },
                limit: {
                  type: 'number',
                  example: 20
                },
                total: {
                  type: 'number',
                  example: 150
                },
                pages: {
                  type: 'number',
                  example: 8
                },
                hasNext: {
                  type: 'boolean',
                  example: true
                },
                hasPrev: {
                  type: 'boolean',
                  example: false
                }
              }
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication information is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Unauthorized',
                message: 'Authentication token is required',
                code: 'NO_TOKEN',
                timestamp: '2024-01-15T10:30:00Z'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions to access the resource',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Forbidden',
                message: 'Insufficient permissions',
                code: 'INSUFFICIENT_ROLE',
                timestamp: '2024-01-15T10:30:00Z'
              }
            }
          }
        },
        NotFoundError: {
          description: 'The requested resource was not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Not Found',
                message: 'Resource not found',
                code: 'NOT_FOUND',
                timestamp: '2024-01-15T10:30:00Z'
              }
            }
          }
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Validation Error',
                message: 'Request validation failed',
                code: 'VALIDATION_ERROR',
                details: [
                  'Email is required',
                  'Password must be at least 8 characters'
                ],
                timestamp: '2024-01-15T10:30:00Z'
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Rate Limit Exceeded',
                message: 'Too many requests. Try again in 60 seconds.',
                code: 'RATE_LIMIT',
                timestamp: '2024-01-15T10:30:00Z'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management'
      },
      {
        name: 'Users',
        description: 'User profile and account management'
      },
      {
        name: 'Projects',
        description: 'Project creation, management, and deployment'
      },
      {
        name: 'Deployments',
        description: 'Build and deployment operations'
      },
      {
        name: 'Teams',
        description: 'Team collaboration and permissions'
      },
      {
        name: 'Analytics',
        description: 'Usage analytics and metrics'
      },
      {
        name: 'Admin',
        description: 'Administrative operations (admin only)'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/api/v1/**/*.ts',
    './src/api/v2/**/*.ts'
  ]
}

// Generate OpenAPI spec
const specs = swaggerJsdoc(swaggerOptions)

// Swagger UI configuration
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
    syntaxHighlight: {
      activated: true,
      theme: 'agate'
    },
    tryItOutEnabled: true,
    requestSnippetsEnabled: true,
    requestSnippets: {
      generators: {
        curl_bash: {
          title: 'cURL (bash)',
          syntax: 'bash'
        },
        curl_powershell: {
          title: 'cURL (PowerShell)',
          syntax: 'powershell'
        },
        curl_cmd: {
          title: 'cURL (CMD)',
          syntax: 'bash'
        }
      },
      defaultExpanded: false,
      languages: null
    }
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .scheme-container { background: #f7f7f7; padding: 15px; border-radius: 4px; }
  `,
  customSiteTitle: 'Matrix Platform API Documentation',
  customfavIcon: '/favicon.ico'
}

// Register Swagger documentation
export async function registerSwagger(fastify: FastifyInstance) {
  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: swaggerUiOptions,
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject) => {
      return swaggerObject
    },
    transformSpecificationClone: true
  })

  // Serve raw OpenAPI spec
  fastify.get('/docs/openapi.json', async () => {
    return specs
  })

  // Serve OpenAPI spec in YAML format
  fastify.get('/docs/openapi.yaml', async (request, reply) => {
    const yaml = require('js-yaml')
    reply.header('Content-Type', 'text/yaml')
    return yaml.dump(specs)
  })

  console.log('📚 API Documentation available at /docs')
}

export { specs as openApiSpec }