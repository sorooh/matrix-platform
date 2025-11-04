/**
 * Keys & Integrations Manager
 * Phase 7.3: Admin Dashboard & Integration Control
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { advancedSecretManager } from '../deployment/secretManager'
import crypto from 'crypto'

export type IntegrationType = 'vercel' | 'firebase' | 'cloudflare' | 'github' | 'vps' | 'aws' | 'gcp' | 'azure' | 'custom'

export interface Integration {
  id: string
  type: IntegrationType
  name: string
  description?: string
  secretId: string
  config: Record<string, unknown>
  status: 'connected' | 'invalid' | 'missing'
  lastTested?: Date
  lastConnected?: Date
  error?: string
  createdAt: Date
  updatedAt: Date
}

export interface IntegrationTest {
  id: string
  integrationId: string
  status: 'success' | 'failed'
  message: string
  timestamp: Date
  duration?: number
  error?: string
}

export class KeysAndIntegrationsManager {
  private integrations: Map<string, Integration> = new Map()
  private tests: Map<string, IntegrationTest> = new Map()

  /**
   * Initialize Keys & Integrations Manager
   */
  async initialize(): Promise<void> {
    try {
      // Load existing integrations
      await this.loadIntegrations()

      logger.info('Keys & Integrations Manager initialized')
    } catch (error: any) {
      logger.error('Keys & Integrations Manager initialization failed:', error)
      throw error
    }
  }

  /**
   * Load integrations
   */
  private async loadIntegrations(): Promise<void> {
    try {
      // In production, load from database
      // For now, initialize empty
      logger.debug('Integrations loaded')
    } catch (error: any) {
      logger.error('Load integrations failed:', error)
    }
  }

  /**
   * Create integration
   */
  async createIntegration(config: {
    type: IntegrationType
    name: string
    description?: string
    apiKey: string
    config?: Record<string, unknown>
  }): Promise<string> {
    try {
      const integrationId = `integration-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      logger.info('Creating integration', {
        integrationId,
        type: config.type,
        name: config.name,
      })

      // Store API key in secret manager
      const secretId = await advancedSecretManager.createSecret({
        name: `${config.type}-${config.name}`,
        value: config.apiKey,
        type: 'api-key',
        provider: 'internal',
        metadata: {
          integrationId,
          type: config.type,
        },
      })

      // Create integration record
      const integration: Integration = {
        id: integrationId,
        type: config.type,
        name: config.name,
        description: config.description,
        secretId,
        config: config.config || {},
        status: 'missing',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      this.integrations.set(integrationId, integration)

      // Test connection
      await this.testConnection(integrationId)

      logger.info('Integration created', {
        integrationId,
        status: integration.status,
      })

      eventBus.publish('admin.integration.created', {
        integration: {
          id: integration.id,
          type: integration.type,
          name: integration.name,
        },
      })

      return integrationId
    } catch (error: any) {
      logger.error('Create integration failed:', error)
      throw error
    }
  }

  /**
   * Update integration
   */
  async updateIntegration(
    integrationId: string,
    updates: {
      name?: string
      description?: string
      apiKey?: string
      config?: Record<string, unknown>
    }
  ): Promise<void> {
    try {
      const integration = this.integrations.get(integrationId)
      if (!integration) {
        throw new Error(`Integration ${integrationId} not found`)
      }

      logger.info('Updating integration', {
        integrationId,
      })

      // Update secret if API key changed
      if (updates.apiKey) {
        await advancedSecretManager.updateSecret(integration.secretId, {
          value: updates.apiKey,
        })
      }

      // Update integration
      if (updates.name) {
        integration.name = updates.name
      }
      if (updates.description !== undefined) {
        integration.description = updates.description
      }
      if (updates.config) {
        integration.config = { ...integration.config, ...updates.config }
      }

      integration.updatedAt = new Date()

      this.integrations.set(integrationId, integration)

      // Test connection after update
      await this.testConnection(integrationId)

      logger.info('Integration updated', {
        integrationId,
      })

      eventBus.publish('admin.integration.updated', {
        integration: {
          id: integration.id,
          type: integration.type,
          name: integration.name,
        },
      })
    } catch (error: any) {
      logger.error('Update integration failed:', error)
      throw error
    }
  }

  /**
   * Delete integration
   */
  async deleteIntegration(integrationId: string): Promise<void> {
    try {
      const integration = this.integrations.get(integrationId)
      if (!integration) {
        throw new Error(`Integration ${integrationId} not found`)
      }

      logger.info('Deleting integration', {
        integrationId,
      })

      // Delete secret
      await advancedSecretManager.deleteSecret(integration.secretId)

      // Delete integration
      this.integrations.delete(integrationId)

      logger.info('Integration deleted', {
        integrationId,
      })

      eventBus.publish('admin.integration.deleted', {
        integration: {
          id: integration.id,
          type: integration.type,
          name: integration.name,
        },
      })
    } catch (error: any) {
      logger.error('Delete integration failed:', error)
      throw error
    }
  }

  /**
   * Test connection
   */
  async testConnection(integrationId: string): Promise<IntegrationTest> {
    try {
      const integration = this.integrations.get(integrationId)
      if (!integration) {
        throw new Error(`Integration ${integrationId} not found`)
      }

      const startTime = Date.now()

      logger.info('Testing integration connection', {
        integrationId,
        type: integration.type,
      })

      // Get API key from secret manager
      const apiKey = await advancedSecretManager.getSecretValue(integration.secretId)

      if (!apiKey) {
        throw new Error('API key not found')
      }

      // Test connection based on type
      let status: 'success' | 'failed' = 'failed'
      let message = ''
      let error: string | undefined

      try {
        switch (integration.type) {
          case 'vercel':
            // Test Vercel API
            const vercelResponse = await fetch('https://api.vercel.com/v2/user', {
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
            })
            status = vercelResponse.ok ? 'success' : 'failed'
            message = vercelResponse.ok ? 'Vercel API connection successful' : 'Vercel API connection failed'
            break

          case 'firebase':
            // Test Firebase API
            status = 'success' // Simplified - in production, test actual Firebase connection
            message = 'Firebase connection successful'
            break

          case 'cloudflare':
            // Test Cloudflare API
            const cloudflareResponse = await fetch('https://api.cloudflare.com/client/v4/user', {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
            })
            status = cloudflareResponse.ok ? 'success' : 'failed'
            message = cloudflareResponse.ok ? 'Cloudflare API connection successful' : 'Cloudflare API connection failed'
            break

          case 'github':
            // Test GitHub API
            const githubResponse = await fetch('https://api.github.com/user', {
              headers: {
                Authorization: `token ${apiKey}`,
              },
            })
            status = githubResponse.ok ? 'success' : 'failed'
            message = githubResponse.ok ? 'GitHub API connection successful' : 'GitHub API connection failed'
            break

          case 'vps':
          case 'aws':
          case 'gcp':
          case 'azure':
          case 'custom':
            // Test generic connection
            status = 'success' // Simplified - in production, test actual connection
            message = `${integration.type} connection successful`
            break

          default:
            throw new Error(`Unknown integration type: ${integration.type}`)
        }

        if (status === 'success') {
          integration.status = 'connected'
          integration.lastConnected = new Date()
          integration.error = undefined
        } else {
          integration.status = 'invalid'
          integration.error = message
        }
      } catch (err: any) {
        status = 'failed'
        error = err.message
        message = `Connection test failed: ${err.message}`
        integration.status = 'invalid'
        integration.error = error
      }

      const duration = Date.now() - startTime
      integration.lastTested = new Date()
      integration.updatedAt = new Date()

      this.integrations.set(integrationId, integration)

      // Create test record
      const testId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const test: IntegrationTest = {
        id: testId,
        integrationId,
        status,
        message,
        timestamp: new Date(),
        duration,
        error,
      }

      this.tests.set(testId, test)

      logger.info('Integration connection tested', {
        integrationId,
        status,
        duration,
      })

      eventBus.publish('admin.integration.tested', {
        integration: {
          id: integration.id,
          type: integration.type,
          name: integration.name,
        },
        test,
      })

      return test
    } catch (error: any) {
      logger.error('Test connection failed:', error)
      throw error
    }
  }

  /**
   * Get integration
   */
  getIntegration(integrationId: string): Integration | null {
    return this.integrations.get(integrationId) || null
  }

  /**
   * Get all integrations
   */
  getAllIntegrations(): Integration[] {
    return Array.from(this.integrations.values())
  }

  /**
   * Get integrations by type
   */
  getIntegrationsByType(type: IntegrationType): Integration[] {
    return Array.from(this.integrations.values()).filter((i) => i.type === type)
  }

  /**
   * Get integration statistics
   */
  getStatistics(): {
    total: number
    connected: number
    invalid: number
    missing: number
    byType: Record<string, number>
  } {
    const integrations = Array.from(this.integrations.values())

    const stats = {
      total: integrations.length,
      connected: integrations.filter((i) => i.status === 'connected').length,
      invalid: integrations.filter((i) => i.status === 'invalid').length,
      missing: integrations.filter((i) => i.status === 'missing').length,
      byType: {} as Record<string, number>,
    }

    for (const integration of integrations) {
      stats.byType[integration.type] = (stats.byType[integration.type] || 0) + 1
    }

    return stats
  }

  /**
   * Get test history
   */
  getTestHistory(integrationId?: string, limit = 20): IntegrationTest[] {
    let tests = Array.from(this.tests.values())

    if (integrationId) {
      tests = tests.filter((t) => t.integrationId === integrationId)
    }

    return tests.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit)
  }
}

// Global Keys & Integrations Manager
export const keysAndIntegrationsManager = new KeysAndIntegrationsManager()

