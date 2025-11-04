/**
 * Webhooks System
 * Phase 3: Advanced Integration Capabilities
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { captureException } from '../config/sentry'
import { retryManager } from './enhanced/retry'

export interface Webhook {
  id: string
  url: string
  events: string[]
  secret?: string
  active: boolean
  retries: number
  createdAt: Date
  updatedAt: Date
}

export interface WebhookEvent {
  type: string
  payload: Record<string, unknown>
  timestamp: Date
  source?: string
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  event: WebhookEvent
  status: 'pending' | 'success' | 'failed'
  attempts: number
  lastAttempt?: Date
  response?: {
    status: number
    body: string
  }
  error?: string
}

export class WebhookSystem {
  private webhooks: Map<string, Webhook> = new Map()
  private deliveries: Map<string, WebhookDelivery> = new Map()

  /**
   * Register webhook
   */
  async register(
    url: string,
    events: string[],
    options?: { secret?: string; retries?: number }
  ): Promise<{ success: boolean; webhook?: Webhook; error?: string }> {
    try {
      const webhook: Webhook = {
        id: `webhook-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        url,
        events,
        secret: options?.secret,
        active: true,
        retries: options?.retries || 3,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      this.webhooks.set(webhook.id, webhook)

      logger.info(`Webhook registered: ${webhook.id}`, {
        url,
        events: events.length
      })

      return { success: true, webhook }
    } catch (error: any) {
      logger.error('Webhook registration failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Unregister webhook
   */
  async unregister(webhookId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const webhook = this.webhooks.get(webhookId)
      if (!webhook) {
        return { success: false, error: 'Webhook not found' }
      }

      webhook.active = false
      webhook.updatedAt = new Date()
      this.webhooks.set(webhookId, webhook)

      logger.info(`Webhook unregistered: ${webhookId}`)

      return { success: true }
    } catch (error: any) {
      logger.error('Webhook unregistration failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Trigger webhook
   */
  async trigger(event: WebhookEvent): Promise<{
    success: boolean
    deliveries: number
    failed: number
  }> {
    try {
      const matchingWebhooks = Array.from(this.webhooks.values()).filter(
        (w) => w.active && w.events.includes(event.type)
      )

      if (matchingWebhooks.length === 0) {
        logger.debug(`No webhooks registered for event: ${event.type}`)
        return { success: true, deliveries: 0, failed: 0 }
      }

      let delivered = 0
      let failed = 0

      for (const webhook of matchingWebhooks) {
        try {
          const delivery = await this.deliver(webhook, event)
          if (delivery.status === 'success') {
            delivered++
          } else {
            failed++
          }
        } catch (error: any) {
          logger.error(`Webhook delivery failed: ${webhook.id}`, error)
          failed++
        }
      }

      logger.info(`Webhook triggered: ${event.type}`, {
        webhooks: matchingWebhooks.length,
        delivered,
        failed
      })

      return {
        success: true,
        deliveries: delivered,
        failed
      }
    } catch (error: any) {
      logger.error('Webhook trigger failed:', error)
      captureException(error as Error, { context: 'webhook trigger' })
      return { success: false, deliveries: 0, failed: 0 }
    }
  }

  /**
   * Deliver webhook
   */
  private async deliver(webhook: Webhook, event: WebhookEvent): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      id: `delivery-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      webhookId: webhook.id,
      event,
      status: 'pending',
      attempts: 0
    }

    try {
      const result = await retryManager.executeWithRetry(
        async () => {
          const payload = JSON.stringify(event.payload)
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'Matrix-Platform-Webhook/1.0'
          }

          // Add signature if secret is provided
          if (webhook.secret) {
            const crypto = require('crypto')
            const signature = crypto
              .createHmac('sha256', webhook.secret)
              .update(payload)
              .digest('hex')
            headers['X-Matrix-Signature'] = `sha256=${signature}`
          }

          const response = await fetch(webhook.url, {
            method: 'POST',
            headers,
            body: payload
          })

          if (!response.ok) {
            throw new Error(`Webhook delivery failed: ${response.statusText}`)
          }

          const body = await response.text()

          return {
            status: response.status,
            body: body.substring(0, 1000) // Limit body size
          }
        },
        {
          maxRetries: webhook.retries,
          retryableErrors: ['timeout', 'network', 'connection', '503', '502', '500']
        }
      )

      delivery.status = 'success'
      delivery.response = result
      delivery.attempts = 1
      delivery.lastAttempt = new Date()

      logger.info(`Webhook delivered: ${webhook.id}`, {
        event: event.type,
        status: result.status
      })
    } catch (error: any) {
      delivery.status = 'failed'
      delivery.error = error.message
      delivery.attempts = webhook.retries
      delivery.lastAttempt = new Date()

      logger.error(`Webhook delivery failed: ${webhook.id}`, error)
    }

    this.deliveries.set(delivery.id, delivery)
    return delivery
  }

  /**
   * List webhooks
   */
  listWebhooks(eventType?: string): Webhook[] {
    if (eventType) {
      return Array.from(this.webhooks.values()).filter((w) =>
        w.events.includes(eventType)
      )
    }
    return Array.from(this.webhooks.values())
  }

  /**
   * Get webhook
   */
  getWebhook(webhookId: string): Webhook | null {
    return this.webhooks.get(webhookId) || null
  }

  /**
   * Get webhook deliveries
   */
  getDeliveries(webhookId?: string, limit: number = 100): WebhookDelivery[] {
    let deliveries = Array.from(this.deliveries.values())

    if (webhookId) {
      deliveries = deliveries.filter((d) => d.webhookId === webhookId)
    }

    return deliveries.sort((a, b) => {
      const aTime = a.lastAttempt?.getTime() || 0
      const bTime = b.lastAttempt?.getTime() || 0
      return bTime - aTime
    }).slice(0, limit)
  }
}

// Global Webhook System
export const webhookSystem = new WebhookSystem()

