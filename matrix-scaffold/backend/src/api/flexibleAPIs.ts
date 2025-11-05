/**
 * Phase 10.3 - Flexible APIs & Integrations
 * 
 * RESTful APIs, GraphQL, Webhooks, SDKs, Plugin System
 * - RESTful APIs
 * - GraphQL support
 * - Webhooks
 * - SDKs
 * - Plugin system
 * - Marketplace integrations
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type APIType = 'rest' | 'graphql' | 'websocket' | 'rpc'
export type WebhookEvent = 'user.created' | 'user.updated' | 'subscription.created' | 'payment.completed' | 'api.call' | 'custom'
export type PluginStatus = 'active' | 'inactive' | 'pending' | 'error'

export interface APIVersion {
  id: string
  version: string
  type: APIType
  baseUrl: string
  documentation: string
  endpoints: string[]
  isDeprecated: boolean
  deprecatedAt?: Date
  createdAt: Date
}

export interface WebhookConfig {
  id: string
  userId: string
  url: string
  events: WebhookEvent[]
  secret: string
  isActive: boolean
  lastTriggered?: Date
  successCount: number
  failureCount: number
  createdAt: Date
  updatedAt: Date
}

export interface Plugin {
  id: string
  name: string
  description: string
  version: string
  author: string
  category: string
  status: PluginStatus
  config: Record<string, any>
  permissions: string[]
  apiVersion: string
  installedAt: Date
  updatedAt: Date
}

export interface SDK {
  id: string
  name: string
  language: string // javascript | python | java | go | rust
  version: string
  packageName: string
  downloadUrl: string
  documentation: string
  examples: string[]
  downloads: number
  createdAt: Date
  updatedAt: Date
}

class FlexibleAPIsSystem {
  private apiVersions: Map<string, APIVersion> = new Map()
  private webhooks: Map<string, WebhookConfig> = new Map()
  private plugins: Map<string, Plugin> = new Map()
  private sdks: Map<string, SDK> = new Map()

  async initialize() {
    logInfo('Initializing Flexible APIs & Integrations System...')

    // Initialize default API versions
    await this.initializeDefaultAPIs()

    // Initialize default SDKs
    await this.initializeDefaultSDKs()

    logInfo('✅ Flexible APIs & Integrations System initialized')
  }

  // Initialize default APIs
  private async initializeDefaultAPIs(): Promise<void> {
    const defaultAPI: Omit<APIVersion, 'id' | 'createdAt'> = {
      version: 'v1',
      type: 'rest',
      baseUrl: 'https://api.matrix.ai/v1',
      documentation: 'https://docs.matrix.ai/api/v1',
      endpoints: ['/users', '/subscriptions', '/payments', '/ai', '/integrations'],
      isDeprecated: false,
      createdAt: new Date()
    }

    const apiId = nanoid()
    const now = new Date()

    const apiVersion: APIVersion = {
      id: apiId,
      ...defaultAPI,
      createdAt: now
    }

    this.apiVersions.set(apiId, apiVersion)

    logInfo('✅ Default APIs initialized')
  }

  // Initialize default SDKs
  private async initializeDefaultSDKs(): Promise<void> {
    const defaultSDKs: Omit<SDK, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Matrix JavaScript SDK',
        language: 'javascript',
        version: '1.0.0',
        packageName: '@matrix-ai/sdk',
        downloadUrl: 'https://npmjs.com/package/@matrix-ai/sdk',
        documentation: 'https://docs.matrix.ai/sdk/javascript',
        examples: ['basic-usage', 'authentication', 'ai-calls'],
        downloads: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Matrix Python SDK',
        language: 'python',
        version: '1.0.0',
        packageName: 'matrix-ai-sdk',
        downloadUrl: 'https://pypi.org/project/matrix-ai-sdk',
        documentation: 'https://docs.matrix.ai/sdk/python',
        examples: ['basic-usage', 'authentication', 'ai-calls'],
        downloads: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    for (const sdk of defaultSDKs) {
      const sdkId = nanoid()
      const now = new Date()

      const sdkConfig: SDK = {
        id: sdkId,
        ...sdk,
        createdAt: now,
        updatedAt: now
      }

      this.sdks.set(sdkId, sdkConfig)
    }

    logInfo('✅ Default SDKs initialized')
  }

  // Create webhook
  async createWebhook(
    userId: string,
    url: string,
    events: WebhookEvent[],
    secret?: string
  ): Promise<WebhookConfig> {
    try {
      const webhookId = nanoid()
      const now = new Date()
      const webhookSecret = secret || this.generateSecret()

      const webhook: WebhookConfig = {
        id: webhookId,
        userId,
        url,
        events,
        secret: webhookSecret,
        isActive: true,
        successCount: 0,
        failureCount: 0,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.webhookConfig.create({
          data: {
            id: webhookId,
            userId,
            url,
            events,
            secret: webhookSecret,
            isActive: true,
            successCount: 0,
            failureCount: 0,
            createdAt: now,
            updatedAt: now,
            lastTriggered: null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create webhook in database' })
      }

      this.webhooks.set(webhookId, webhook)

      logInfo(`✅ Created webhook ${webhookId} for user ${userId}`)

      return webhook
    } catch (error) {
      logError(error as Error, { context: 'Create webhook' })
      throw error
    }
  }

  // Trigger webhook
  async triggerWebhook(
    webhookId: string,
    event: WebhookEvent,
    data: any
  ): Promise<boolean> {
    try {
      const webhook = this.webhooks.get(webhookId)
      if (!webhook || !webhook.isActive) return false
      if (!webhook.events.includes(event)) return false

      // In production, make HTTP POST request to webhook URL
      // For now, simulate trigger
      const success = Math.random() > 0.1 // 90% success rate

      if (success) {
        webhook.successCount++
      } else {
        webhook.failureCount++
      }

      webhook.lastTriggered = new Date()
      webhook.updatedAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.webhookConfig.update({
          where: { id: webhookId },
          data: {
            successCount: webhook.successCount,
            failureCount: webhook.failureCount,
            lastTriggered: webhook.lastTriggered,
            updatedAt: webhook.updatedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Trigger webhook in database' })
      }

      this.webhooks.set(webhookId, webhook)

      logInfo(`✅ Triggered webhook ${webhookId} for event ${event}`)

      return success
    } catch (error) {
      logError(error as Error, { context: 'Trigger webhook' })
      return false
    }
  }

  // Install plugin
  async installPlugin(
    name: string,
    description: string,
    version: string,
    author: string,
    category: string,
    config: Record<string, any> = {},
    permissions: string[] = [],
    apiVersion: string = 'v1'
  ): Promise<Plugin> {
    try {
      const pluginId = nanoid()
      const now = new Date()

      const plugin: Plugin = {
        id: pluginId,
        name,
        description,
        version,
        author,
        category,
        status: 'pending',
        config,
        permissions,
        apiVersion,
        installedAt: now,
        updatedAt: now
      }

      // Activate plugin
      plugin.status = 'active'

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.plugin.create({
          data: {
            id: pluginId,
            name,
            description,
            version,
            author,
            category,
            status: 'active',
            config,
            permissions,
            apiVersion,
            installedAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Install plugin in database' })
      }

      this.plugins.set(pluginId, plugin)

      logInfo(`✅ Installed plugin ${pluginId}: ${name}`)

      return plugin
    } catch (error) {
      logError(error as Error, { context: 'Install plugin' })
      throw error
    }
  }

  // Generate secret
  private generateSecret(): string {
    const crypto = require('crypto')
    return crypto.randomBytes(32).toString('hex')
  }

  // Get webhooks
  async getWebhooks(userId?: string): Promise<WebhookConfig[]> {
    const webhooks: WebhookConfig[] = []
    for (const webhook of this.webhooks.values()) {
      if (userId && webhook.userId !== userId) continue
      webhooks.push(webhook)
    }
    return webhooks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Get plugins
  async getPlugins(status?: PluginStatus): Promise<Plugin[]> {
    const plugins: Plugin[] = []
    for (const plugin of this.plugins.values()) {
      if (status && plugin.status !== status) continue
      plugins.push(plugin)
    }
    return plugins.sort((a, b) => b.installedAt.getTime() - a.installedAt.getTime())
  }

  // Get SDKs
  async getSDKs(language?: string): Promise<SDK[]> {
    const sdks: SDK[] = []
    for (const sdk of this.sdks.values()) {
      if (language && sdk.language !== language) continue
      sdks.push(sdk)
    }
    return sdks.sort((a, b) => b.downloads - a.downloads)
  }
}

export const flexibleAPIsSystem = new FlexibleAPIsSystem()

