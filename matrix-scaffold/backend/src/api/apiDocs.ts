/**
 * Phase 8.3 - API Documentation & Developer Tools
 * 
 * Professional API documentation and developer tools
 * - Swagger/OpenAPI documentation
 * - Interactive API playground
 * - SDK generation
 * - API versioning
 */

import { FastifyInstance } from 'fastify'
import { logger, logError, logInfo } from '../config/logger'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

export async function initializeAPIDocumentation(server: FastifyInstance) {
  try {
    logInfo('Initializing API Documentation...')

    // Register Swagger
    await server.register(swagger, {
      openapi: {
        info: {
          title: 'Matrix Platform API',
          description: 'Complete AI-as-a-Service Platform API',
          version: '1.0.0'
        },
        servers: [
          {
            url: process.env.API_URL || 'http://localhost:3000',
            description: 'Production server'
          },
          {
            url: 'http://localhost:3000',
            description: 'Development server'
          }
        ],
        tags: [
          { name: 'billing', description: 'Billing and subscription endpoints' },
          { name: 'gateway', description: 'API Gateway endpoints' },
          { name: 'marketplace', description: 'AI Marketplace endpoints' },
          { name: 'instances', description: 'Private instance management' },
          { name: 'licensing', description: 'License and governance' },
          { name: 'client', description: 'Client portal endpoints' },
          { name: 'partner', description: 'Partner and reseller endpoints' },
          { name: 'webhooks', description: 'Webhook management' },
          { name: 'analytics', description: 'Analytics and reporting' },
          { name: 'security', description: 'Security features' }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            },
            apiKeyAuth: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key'
            }
          }
        }
      }
    })

    // Register Swagger UI
    await server.register(swaggerUi, {
      routePrefix: '/api-docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
        displayRequestDuration: true
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
      transformSpecification: (swaggerObject, request, reply) => {
        return swaggerObject
      }
    })

    logInfo('✅ API Documentation initialized at /api-docs')
  } catch (error) {
    logError(error as Error, { context: 'Initialize API documentation' })
  }
}

// Generate SDK code
export function generateSDK(language: 'typescript' | 'python' | 'javascript' | 'curl'): string {
  const baseUrl = process.env.API_URL || 'http://localhost:3000'

  if (language === 'typescript') {
    return `// Matrix Platform TypeScript SDK
import axios from 'axios';

export class MatrixPlatform {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL: string = '${baseUrl}') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  private async request(method: string, endpoint: string, data?: any) {
    const response = await axios({
      method,
      url: \`\${this.baseURL}\${endpoint}\`,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      data
    });
    return response.data;
  }

  async getSubscription(subscriptionId: string) {
    return this.request('GET', \`/api/billing/subscriptions/\${subscriptionId}\`);
  }

  async createAPIKey(name: string) {
    return this.request('POST', '/api/gateway/keys', { name });
  }

  async callAI(aiId: string, prompt: string) {
    return this.request('POST', \`/api/gateway/ai/\${aiId}\`, { prompt });
  }
}

export default MatrixPlatform;
`
  } else if (language === 'python') {
    return `# Matrix Platform Python SDK
import requests

class MatrixPlatform:
    def __init__(self, api_key: str, base_url: str = '${baseUrl}'):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }

    def _request(self, method: str, endpoint: str, data=None):
        url = f'{self.base_url}{endpoint}'
        response = requests.request(method, url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()

    def get_subscription(self, subscription_id: str):
        return self._request('GET', f'/api/billing/subscriptions/{subscription_id}')

    def create_api_key(self, name: str):
        return self._request('POST', '/api/gateway/keys', {'name': name})

    def call_ai(self, ai_id: str, prompt: str):
        return self._request('POST', f'/api/gateway/ai/{ai_id}', {'prompt': prompt})
`
  } else if (language === 'javascript') {
    return `// Matrix Platform JavaScript SDK
class MatrixPlatform {
  constructor(apiKey, baseURL = '${baseUrl}') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async request(method, endpoint, data) {
    const response = await fetch(\`\${this.baseURL}\${endpoint}\`, {
      method,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    });
    return response.json();
  }

  async getSubscription(subscriptionId) {
    return this.request('GET', \`/api/billing/subscriptions/\${subscriptionId}\`);
  }

  async createAPIKey(name) {
    return this.request('POST', '/api/gateway/keys', { name });
  }

  async callAI(aiId, prompt) {
    return this.request('POST', \`/api/gateway/ai/\${aiId}\`, { prompt });
  }
}

module.exports = MatrixPlatform;
`
  } else {
    return `# Matrix Platform cURL Examples

# Get Subscription
curl -X GET "${baseUrl}/api/billing/subscriptions/{subscriptionId}" \\
  -H "X-API-Key: YOUR_API_KEY"

# Create API Key
curl -X POST "${baseUrl}/api/gateway/keys" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My API Key"}'

# Call AI
curl -X POST "${baseUrl}/api/gateway/ai/{aiId}" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Hello, AI!"}'
`
  }
}

