/**
 * Phase 8.3 - Advanced Webhooks & Event System
 * 
 * Professional webhook system for Phase 8 events
 * - Real-time webhooks for all events (subscription, billing, usage, etc.)
 * - Webhook signature verification
 * - Retry mechanism with exponential backoff
 * - Webhook delivery tracking
 * - Event filtering and routing
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'
import * as crypto from 'crypto'

export type WebhookEventType = 
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'invoice.created'
  | 'invoice.paid'
  | 'invoice.failed'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'usage.threshold_reached'
  | 'instance.created'
  | 'instance.suspended'
  | 'api_key.created'
  | 'api_key.revoked'
  | 'partner.commission_calculated'
  | 'payout.processed'

export interface Webhook {
  id: string
  userId?: string
  partnerId?: string
  url: string
  events: WebhookEventType[]
  secret?: string
  active: boolean
  retries: number
  timeout: number
  headers?: Record<string, string>
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface WebhookEvent {
  id: string
  type: WebhookEventType
  data: Record<string, any>
  timestamp: Date
  source: string
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  event: WebhookEvent
  status: 'pending' | 'delivered' | 'failed'
  attempts: number
  responseCode?: number
  responseBody?: string
  deliveredAt?: Date
  failedAt?: Date
  error?: string
  createdAt: Date
}

class AdvancedWebhookSystem {
  private webhooks: Map<string, Webhook> = new Map()
  private deliveries: Map<string, WebhookDelivery> = new Map()
  private eventQueue: WebhookEvent[] = []

  async initialize() {
    logInfo('Initializing Advanced Webhooks & Event System...')

    // Load webhooks from database
    try {
      const { prisma } = await import('../config/database')
      const webhooks = await prisma.webhook.findMany()
      for (const webhook of webhooks) {
        this.webhooks.set(webhook.id, {
          id: webhook.id,
          userId: webhook.userId || undefined,
          partnerId: webhook.partnerId || undefined,
          url: webhook.url,
          events: webhook.events as WebhookEventType[],
          secret: webhook.secret || undefined,
          active: webhook.active,
          retries: webhook.retries,
          timeout: webhook.timeout,
          headers: webhook.headers as Record<string, string> || undefined,
          metadata: webhook.metadata as Record<string, any>,
          createdAt: webhook.createdAt,
          updatedAt: webhook.updatedAt
        })
      }
      logInfo(`✅ Loaded ${webhooks.length} webhooks from database`)
    } catch (error) {
      logError(error as Error, { context: 'Webhook initialization' })
    }

    // Start event processor
    this.startEventProcessor()

    logInfo('✅ Advanced Webhooks & Event System initialized')
  }

  // Register webhook
  async registerWebhook(
    url: string,
    events: WebhookEventType[],
    userId?: string,
    partnerId?: string,
    secret?: string,
    retries: number = 3,
    timeout: number = 30000,
    headers?: Record<string, string>
  ): Promise<Webhook> {
    try {
      const webhookId = nanoid()
      const now = new Date()

      // Generate secret if not provided
      const webhookSecret = secret || `whsec_${nanoid(32)}`

      const webhook: Webhook = {
        id: webhookId,
        userId,
        partnerId,
        url,
        events,
        secret: webhookSecret,
        active: true,
        retries,
        timeout,
        headers,
        metadata: {},
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.webhook.create({
          data: {
            id: webhookId,
            userId: userId || null,
            partnerId: partnerId || null,
            url,
            events,
            secret: webhookSecret,
            active: true,
            retries,
            timeout,
            headers: headers || {},
            metadata: {}
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Register webhook in database' })
      }

      this.webhooks.set(webhookId, webhook)
      logInfo(`✅ Registered webhook ${webhookId} for ${events.length} events`)

      return webhook
    } catch (error) {
      logError(error as Error, { context: 'Register webhook' })
      throw error
    }
  }

  // Emit event
  async emitEvent(
    type: WebhookEventType,
    data: Record<string, any>,
    source: string = 'system'
  ): Promise<void> {
    try {
      const event: WebhookEvent = {
        id: nanoid(),
        type,
        data,
        timestamp: new Date(),
        source
      }

      // Add to queue
      this.eventQueue.push(event)

      // Process immediately
      await this.processEvent(event)

      logInfo(`✅ Emitted webhook event ${type}`)
    } catch (error) {
      logError(error as Error, { context: 'Emit webhook event' })
    }
  }

  // Process event
  private async processEvent(event: WebhookEvent): Promise<void> {
    // Find matching webhooks
    const matchingWebhooks = Array.from(this.webhooks.values()).filter(
      w => w.active && w.events.includes(event.type)
    )

    if (matchingWebhooks.length === 0) {
      return
    }

    // Deliver to all matching webhooks
    for (const webhook of matchingWebhooks) {
      await this.deliverWebhook(webhook, event)
    }
  }

  // Deliver webhook
  private async deliverWebhook(webhook: Webhook, event: WebhookEvent): Promise<void> {
    try {
      const deliveryId = nanoid()
      const delivery: WebhookDelivery = {
        id: deliveryId,
        webhookId: webhook.id,
        event,
        status: 'pending',
        attempts: 0,
        createdAt: new Date()
      }

      this.deliveries.set(deliveryId, delivery)

      // Attempt delivery
      let success = false
      let lastError: Error | null = null

      for (let attempt = 1; attempt <= webhook.retries + 1; attempt++) {
        try {
          delivery.attempts = attempt

          // Create payload
          const payload = JSON.stringify({
            id: event.id,
            type: event.type,
            data: event.data,
            timestamp: event.timestamp.toISOString(),
            source: event.source
          })

          // Create signature
          const signature = this.createSignature(webhook.secret || '', payload)
          const timestamp = Math.floor(Date.now() / 1000)

          // Prepare headers
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': timestamp.toString(),
            'User-Agent': 'Matrix-Platform-Webhook/1.0',
            ...webhook.headers
          }

          // Make request
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), webhook.timeout)

          const response = await fetch(webhook.url, {
            method: 'POST',
            headers,
            body: payload,
            signal: controller.signal
          })

          clearTimeout(timeoutId)

          delivery.responseCode = response.status
          delivery.responseBody = await response.text().catch(() => '')

          if (response.ok) {
            delivery.status = 'delivered'
            delivery.deliveredAt = new Date()
            success = true
            break
          } else {
            throw new Error(`HTTP ${response.status}: ${delivery.responseBody}`)
          }
        } catch (error) {
          lastError = error as Error
          delivery.error = lastError.message

          // Exponential backoff
          if (attempt < webhook.retries + 1) {
            const delay = Math.pow(2, attempt) * 1000
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }

      if (!success) {
        delivery.status = 'failed'
        delivery.failedAt = new Date()
        logError(lastError || new Error('Webhook delivery failed'), {
          context: `Webhook ${webhook.id}`,
          event: event.type
        })
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.webhookDelivery.create({
          data: {
            id: deliveryId,
            webhookId: webhook.id,
            event: event,
            status: delivery.status,
            attempts: delivery.attempts,
            responseCode: delivery.responseCode || null,
            responseBody: delivery.responseBody || null,
            deliveredAt: delivery.deliveredAt || null,
            failedAt: delivery.failedAt || null,
            error: delivery.error || null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Save webhook delivery in database' })
      }

      this.deliveries.set(deliveryId, delivery)
    } catch (error) {
      logError(error as Error, { context: 'Deliver webhook' })
    }
  }

  // Create signature
  private createSignature(secret: string, payload: string): string {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload)
    return hmac.digest('hex')
  }

  // Verify signature
  verifySignature(secret: string, payload: string, signature: string): boolean {
    const expectedSignature = this.createSignature(secret, payload)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }

  // Get webhook
  async getWebhook(webhookId: string): Promise<Webhook | null> {
    return this.webhooks.get(webhookId) || null
  }

  // Get webhooks by user
  async getWebhooksByUserId(userId: string): Promise<Webhook[]> {
    const userWebhooks: Webhook[] = []
    for (const webhook of this.webhooks.values()) {
      if (webhook.userId === userId) {
        userWebhooks.push(webhook)
      }
    }
    return userWebhooks
  }

  // Get webhooks by partner
  async getWebhooksByPartnerId(partnerId: string): Promise<Webhook[]> {
    const partnerWebhooks: Webhook[] = []
    for (const webhook of this.webhooks.values()) {
      if (webhook.partnerId === partnerId) {
        partnerWebhooks.push(webhook)
      }
    }
    return partnerWebhooks
  }

  // Update webhook
  async updateWebhook(
    webhookId: string,
    updates: Partial<Webhook>
  ): Promise<Webhook | null> {
    const webhook = this.webhooks.get(webhookId)
    if (!webhook) return null

    const updated = {
      ...webhook,
      ...updates,
      updatedAt: new Date()
    }

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.webhook.update({
        where: { id: webhookId },
        data: {
          url: updated.url,
          events: updated.events,
          secret: updated.secret || null,
          active: updated.active,
          retries: updated.retries,
          timeout: updated.timeout,
          headers: updated.headers || {},
          metadata: updated.metadata
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Update webhook in database' })
    }

    this.webhooks.set(webhookId, updated)
    return updated
  }

  // Delete webhook
  async deleteWebhook(webhookId: string): Promise<boolean> {
    const webhook = this.webhooks.get(webhookId)
    if (!webhook) return false

    this.webhooks.delete(webhookId)

    // Delete from database
    try {
      const { prisma } = await import('../config/database')
      await prisma.webhook.delete({
        where: { id: webhookId }
      })
    } catch (error) {
      logError(error as Error, { context: 'Delete webhook from database' })
    }

    return true
  }

  // Get deliveries
  async getDeliveries(
    webhookId?: string,
    limit: number = 100
  ): Promise<WebhookDelivery[]> {
    const deliveries: WebhookDelivery[] = []
    for (const delivery of this.deliveries.values()) {
      if (webhookId && delivery.webhookId !== webhookId) continue
      deliveries.push(delivery)
    }
    return deliveries
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  // Start event processor
  private startEventProcessor(): void {
    setInterval(async () => {
      if (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()
        if (event) {
          await this.processEvent(event)
        }
      }
    }, 1000) // Process every second
  }
}

export const advancedWebhookSystem = new AdvancedWebhookSystem()

