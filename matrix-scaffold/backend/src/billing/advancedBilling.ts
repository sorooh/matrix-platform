/**
 * Phase 8.6 - Advanced Billing Features
 * 
 * Professional billing enhancements
 * - Invoice template customization
 * - Payment retry logic
 * - Dunning management
 * - Payment method encryption
 * - Subscription proration
 * - Payment reconciliation
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'
import * as crypto from 'crypto'

export type InvoiceTemplate = 'default' | 'minimal' | 'detailed' | 'custom'
export type DunningAction = 'email' | 'suspend' | 'cancel' | 'retry'
export type PaymentRetryStatus = 'pending' | 'succeeded' | 'failed' | 'expired'

export interface InvoiceTemplate {
  id: string
  name: string
  type: InvoiceTemplate
  template: string // HTML template
  logo?: string
  colors?: {
    primary: string
    secondary: string
    text: string
  }
  footer?: string
  isDefault: boolean
  createdAt: Date
}

export interface PaymentRetry {
  id: string
  invoiceId: string
  attempt: number
  scheduledAt: Date
  status: PaymentRetryStatus
  error?: string
  processedAt?: Date
}

export interface DunningRule {
  id: string
  name: string
  daysAfterFailure: number
  action: DunningAction
  emailTemplate?: string
  isActive: boolean
}

export interface Proration {
  subscriptionId: string
  fromDate: Date
  toDate: Date
  amount: number
  days: number
  rate: number
}

class AdvancedBilling {
  private invoiceTemplates: Map<string, InvoiceTemplate> = new Map()
  private paymentRetries: Map<string, PaymentRetry> = new Map()
  private dunningRules: Map<string, DunningRule> = new Map()
  private encryptionKey: string

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
  }

  async initialize() {
    logInfo('Initializing Advanced Billing Features...')

    // Initialize default invoice templates
    await this.initializeDefaultTemplates()

    // Initialize default dunning rules
    await this.initializeDefaultDunningRules()

    logInfo('✅ Advanced Billing Features initialized')
  }

  // Initialize default templates
  private async initializeDefaultTemplates(): Promise<void> {
    const defaultTemplates: Omit<InvoiceTemplate, 'id' | 'createdAt'>[] = [
      {
        name: 'Default Template',
        type: 'default',
        template: this.getDefaultTemplate(),
        isDefault: true
      },
      {
        name: 'Minimal Template',
        type: 'minimal',
        template: this.getMinimalTemplate(),
        isDefault: false
      },
      {
        name: 'Detailed Template',
        type: 'detailed',
        template: this.getDetailedTemplate(),
        isDefault: false
      }
    ]

    for (const template of defaultTemplates) {
      const templateId = nanoid()
      const now = new Date()

      const invoiceTemplate: InvoiceTemplate = {
        id: templateId,
        ...template,
        createdAt: now
      }

      this.invoiceTemplates.set(templateId, invoiceTemplate)
    }
  }

  // Initialize default dunning rules
  private async initializeDefaultDunningRules(): Promise<void> {
    const defaultRules: Omit<DunningRule, 'id'>[] = [
      {
        name: 'Day 1 - Email Reminder',
        daysAfterFailure: 1,
        action: 'email',
        isActive: true
      },
      {
        name: 'Day 3 - Payment Retry',
        daysAfterFailure: 3,
        action: 'retry',
        isActive: true
      },
      {
        name: 'Day 7 - Final Warning',
        daysAfterFailure: 7,
        action: 'email',
        isActive: true
      },
      {
        name: 'Day 10 - Suspend Service',
        daysAfterFailure: 10,
        action: 'suspend',
        isActive: true
      },
      {
        name: 'Day 15 - Cancel Subscription',
        daysAfterFailure: 15,
        action: 'cancel',
        isActive: true
      }
    ]

    for (const rule of defaultRules) {
      const ruleId = nanoid()
      const dunningRule: DunningRule = {
        id: ruleId,
        ...rule
      }
      this.dunningRules.set(ruleId, dunningRule)
    }
  }

  // Create invoice template
  async createInvoiceTemplate(
    name: string,
    type: InvoiceTemplate,
    template: string,
    logo?: string,
    colors?: { primary: string; secondary: string; text: string },
    footer?: string
  ): Promise<InvoiceTemplate> {
    try {
      const templateId = nanoid()
      const now = new Date()

      const invoiceTemplate: InvoiceTemplate = {
        id: templateId,
        name,
        type,
        template,
        logo,
        colors,
        footer,
        isDefault: false,
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.invoiceTemplate.create({
          data: {
            id: templateId,
            name,
            type,
            template,
            logo: logo || null,
            colors: colors || null,
            footer: footer || null,
            isDefault: false
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create invoice template in database' })
      }

      this.invoiceTemplates.set(templateId, invoiceTemplate)
      logInfo(`✅ Created invoice template ${templateId}`)

      return invoiceTemplate
    } catch (error) {
      logError(error as Error, { context: 'Create invoice template' })
      throw error
    }
  }

  // Schedule payment retry
  async schedulePaymentRetry(
    invoiceId: string,
    attempt: number,
    scheduledAt: Date
  ): Promise<PaymentRetry> {
    try {
      const retryId = nanoid()
      const now = new Date()

      const paymentRetry: PaymentRetry = {
        id: retryId,
        invoiceId,
        attempt,
        scheduledAt,
        status: 'pending',
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.paymentRetry.create({
          data: {
            id: retryId,
            invoiceId,
            attempt,
            scheduledAt,
            status: 'pending'
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Schedule payment retry in database' })
      }

      this.paymentRetries.set(retryId, paymentRetry)
      logInfo(`✅ Scheduled payment retry ${retryId} for invoice ${invoiceId}`)

      // Process retry when scheduled
      if (scheduledAt <= now) {
        await this.processPaymentRetry(retryId)
      }

      return paymentRetry
    } catch (error) {
      logError(error as Error, { context: 'Schedule payment retry' })
      throw error
    }
  }

  // Process payment retry
  private async processPaymentRetry(retryId: string): Promise<void> {
    try {
      const retry = this.paymentRetries.get(retryId)
      if (!retry) return

      retry.status = 'pending'
      retry.processedAt = new Date()

      // Get invoice
      const { prisma } = await import('../config/database')
      const invoice = await prisma.invoice.findUnique({
        where: { id: retry.invoiceId }
      })

      if (!invoice) {
        retry.status = 'failed'
        retry.error = 'Invoice not found'
        return
      }

      // Retry payment
      const { paymentProviderManager } = await import('../billing/paymentProviders')
      try {
        const paymentIntent = await paymentProviderManager.createPaymentIntent(
          invoice.paymentProvider as any,
          invoice.amount,
          invoice.currency,
          { invoiceId: invoice.id }
        )

        if (paymentIntent.status === 'succeeded') {
          retry.status = 'succeeded'
          // Update invoice status
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'paid', paidAt: new Date() }
          })
        } else {
          retry.status = 'failed'
          retry.error = 'Payment failed'
        }
      } catch (error) {
        retry.status = 'failed'
        retry.error = (error as Error).message
      }

      // Update database
      try {
        await prisma.paymentRetry.update({
          where: { id: retryId },
          data: {
            status: retry.status,
            error: retry.error || null,
            processedAt: retry.processedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Update payment retry in database' })
      }

      this.paymentRetries.set(retryId, retry)
    } catch (error) {
      logError(error as Error, { context: 'Process payment retry' })
    }
  }

  // Process dunning
  async processDunning(invoiceId: string): Promise<void> {
    try {
      const { prisma } = await import('../config/database')
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId }
      })

      if (!invoice || invoice.status === 'paid') return

      // Calculate days since failure
      const failureDate = invoice.failedAt || invoice.createdAt
      const daysSinceFailure = Math.floor(
        (Date.now() - failureDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Find applicable dunning rule
      const applicableRule = Array.from(this.dunningRules.values())
        .filter(r => r.isActive && r.daysAfterFailure <= daysSinceFailure)
        .sort((a, b) => b.daysAfterFailure - a.daysAfterFailure)[0]

      if (!applicableRule) return

      // Execute dunning action
      switch (applicableRule.action) {
        case 'email':
          await this.sendDunningEmail(invoice, applicableRule)
          break
        case 'retry':
          await this.schedulePaymentRetry(invoiceId, 1, new Date())
          break
        case 'suspend':
          await this.suspendSubscription(invoice.subscriptionId)
          break
        case 'cancel':
          await this.cancelSubscription(invoice.subscriptionId)
          break
      }

      logInfo(`✅ Processed dunning for invoice ${invoiceId}: ${applicableRule.action}`)
    } catch (error) {
      logError(error as Error, { context: 'Process dunning' })
    }
  }

  // Encrypt payment method
  encryptPaymentMethod(paymentMethod: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv)
    let encrypted = cipher.update(paymentMethod, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  }

  // Decrypt payment method
  decryptPaymentMethod(encrypted: string): string {
    const parts = encrypted.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const encryptedText = parts[1]
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  // Calculate proration
  async calculateProration(
    subscriptionId: string,
    newTier: string,
    newStartDate: Date
  ): Promise<Proration | null> {
    try {
      const { subscriptionManager } = await import('../billing/subscription')
      const subscription = await subscriptionManager.getSubscription(subscriptionId)
      if (!subscription) return null

      const currentPeriodStart = subscription.currentPeriodStart
      const currentPeriodEnd = subscription.currentPeriodEnd
      const totalDays = Math.ceil(
        (currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
      )
      const remainingDays = Math.ceil(
        (currentPeriodEnd.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Get pricing for current and new tier
      const currentPrice = this.getTierPrice(subscription.tier)
      const newPrice = this.getTierPrice(newTier as any)

      const dailyRate = currentPrice / totalDays
      const proratedAmount = dailyRate * remainingDays
      const newAmount = newPrice * (totalDays - remainingDays) / totalDays

      return {
        subscriptionId,
        fromDate: currentPeriodStart,
        toDate: newStartDate,
        amount: proratedAmount,
        days: remainingDays,
        rate: dailyRate
      }
    } catch (error) {
      logError(error as Error, { context: 'Calculate proration' })
      return null
    }
  }

  // Get tier price
  private getTierPrice(tier: string): number {
    const prices: Record<string, number> = {
      free: 0,
      pro: 50,
      enterprise: 500,
      custom: 0
    }
    return prices[tier] || 0
  }

  // Send dunning email
  private async sendDunningEmail(invoice: any, rule: DunningRule): Promise<void> {
    // In production, send email via email service
    logInfo(`📧 Sending dunning email for invoice ${invoice.id} (${rule.name})`)
  }

  // Suspend subscription
  private async suspendSubscription(subscriptionId: string): Promise<void> {
    const { subscriptionManager } = await import('../billing/subscription')
    await subscriptionManager.updateSubscription(subscriptionId, { status: 'suspended' })
  }

  // Cancel subscription
  private async cancelSubscription(subscriptionId: string): Promise<void> {
    const { subscriptionManager } = await '../billing/subscription'
    await subscriptionManager.cancelSubscription(subscriptionId, false)
  }

  // Get default template
  private getDefaultTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Invoice</title>
</head>
<body>
  <h1>Invoice #{{invoiceNumber}}</h1>
  <p>Date: {{date}}</p>
  <p>Amount: {{amount}} {{currency}}</p>
</body>
</html>`
  }

  // Get minimal template
  private getMinimalTemplate(): string {
    return `Invoice #{{invoiceNumber}} - {{amount}} {{currency}}`
  }

  // Get detailed template
  private getDetailedTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Invoice</title>
</head>
<body>
  <h1>Invoice #{{invoiceNumber}}</h1>
  <p>Date: {{date}}</p>
  <p>Customer: {{customerName}}</p>
  <p>Subscription: {{subscriptionTier}}</p>
  <p>Amount: {{amount}} {{currency}}</p>
  <p>Tax: {{taxAmount}} {{currency}}</p>
  <p>Total: {{totalAmount}} {{currency}}</p>
</body>
</html>`
  }
}

export const advancedBilling = new AdvancedBilling()

