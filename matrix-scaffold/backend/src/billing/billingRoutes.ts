/**
 * Phase 8 - Billing API Routes
 * 
 * API endpoints for Subscription & Billing System
 */

import { FastifyInstance } from 'fastify'
import { subscriptionManager } from './subscription'
import { paymentProviderManager } from './paymentProviders'
import { usageTracker } from './usageTracker'
import { logError, logInfo } from '../config/logger'

export async function registerBillingRoutes(server: FastifyInstance) {
  logInfo('Registering Billing API routes...')

  // Subscription endpoints
  server.post('/api/billing/subscriptions', async (request, reply) => {
    try {
      const { userId, tier, paymentProvider, paymentMethodId, trialDays } = request.body as any
      const subscription = await subscriptionManager.createSubscription(
        userId,
        tier,
        paymentProvider,
        paymentMethodId,
        trialDays
      )
      return { success: true, subscription }
    } catch (error) {
      logError(error as Error, { context: 'Create subscription' })
      return reply.status(500).send({ error: 'Failed to create subscription' })
    }
  })

  server.get('/api/billing/subscriptions/:subscriptionId', async (request, reply) => {
    try {
      const { subscriptionId } = request.params as any
      const subscription = await subscriptionManager.getSubscription(subscriptionId)
      if (!subscription) {
        return reply.status(404).send({ error: 'Subscription not found' })
      }
      return { success: true, subscription }
    } catch (error) {
      logError(error as Error, { context: 'Get subscription' })
      return reply.status(500).send({ error: 'Failed to get subscription' })
    }
  })

  server.get('/api/billing/subscriptions/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any
      const subscription = await subscriptionManager.getSubscriptionByUserId(userId)
      if (!subscription) {
        return reply.status(404).send({ error: 'Subscription not found' })
      }
      return { success: true, subscription }
    } catch (error) {
      logError(error as Error, { context: 'Get subscription by user' })
      return reply.status(500).send({ error: 'Failed to get subscription' })
    }
  })

  server.patch('/api/billing/subscriptions/:subscriptionId', async (request, reply) => {
    try {
      const { subscriptionId } = request.params as any
      const updates = request.body as any
      const subscription = await subscriptionManager.updateSubscription(subscriptionId, updates)
      if (!subscription) {
        return reply.status(404).send({ error: 'Subscription not found' })
      }
      return { success: true, subscription }
    } catch (error) {
      logError(error as Error, { context: 'Update subscription' })
      return reply.status(500).send({ error: 'Failed to update subscription' })
    }
  })

  server.post('/api/billing/subscriptions/:subscriptionId/cancel', async (request, reply) => {
    try {
      const { subscriptionId } = request.params as any
      const { cancelAtPeriodEnd } = request.body as any
      const success = await subscriptionManager.cancelSubscription(
        subscriptionId,
        cancelAtPeriodEnd !== false
      )
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Cancel subscription' })
      return reply.status(500).send({ error: 'Failed to cancel subscription' })
    }
  })

  server.get('/api/billing/subscriptions/:subscriptionId/usage', async (request, reply) => {
    try {
      const { subscriptionId } = request.params as any
      const metrics = await subscriptionManager.getUsageMetrics(subscriptionId)
      return { success: true, metrics }
    } catch (error) {
      logError(error as Error, { context: 'Get usage metrics' })
      return reply.status(500).send({ error: 'Failed to get usage metrics' })
    }
  })

  // Invoice endpoints
  server.post('/api/billing/invoices', async (request, reply) => {
    try {
      const { subscriptionId, items, dueDate } = request.body as any
      const invoice = await subscriptionManager.createInvoice(
        subscriptionId,
        items,
        dueDate ? new Date(dueDate) : undefined
      )
      return { success: true, invoice }
    } catch (error) {
      logError(error as Error, { context: 'Create invoice' })
      return reply.status(500).send({ error: 'Failed to create invoice' })
    }
  })

  server.get('/api/billing/invoices/:invoiceId', async (request, reply) => {
    try {
      const { invoiceId } = request.params as any
      const invoice = await subscriptionManager.getInvoice(invoiceId)
      if (!invoice) {
        return reply.status(404).send({ error: 'Invoice not found' })
      }
      return { success: true, invoice }
    } catch (error) {
      logError(error as Error, { context: 'Get invoice' })
      return reply.status(500).send({ error: 'Failed to get invoice' })
    }
  })

  server.get('/api/billing/invoices/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any
      const invoices = await subscriptionManager.getInvoicesByUserId(userId)
      return { success: true, invoices }
    } catch (error) {
      logError(error as Error, { context: 'Get invoices by user' })
      return reply.status(500).send({ error: 'Failed to get invoices' })
    }
  })

  server.post('/api/billing/invoices/:invoiceId/pay', async (request, reply) => {
    try {
      const { invoiceId } = request.params as any
      const { paymentIntentId } = request.body as any
      const success = await subscriptionManager.processPayment(invoiceId, paymentIntentId)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Process payment' })
      return reply.status(500).send({ error: 'Failed to process payment' })
    }
  })

  // Payment provider endpoints
  server.post('/api/billing/payments/intent', async (request, reply) => {
    try {
      const { provider, amount, currency, metadata } = request.body as any
      const intent = await paymentProviderManager.createPaymentIntent(
        provider,
        amount,
        currency,
        metadata
      )
      return { success: true, intent }
    } catch (error) {
      logError(error as Error, { context: 'Create payment intent' })
      return reply.status(500).send({ error: 'Failed to create payment intent' })
    }
  })

  server.post('/api/billing/payments/confirm', async (request, reply) => {
    try {
      const { provider, paymentIntentId, paymentMethodId } = request.body as any
      const success = await paymentProviderManager.confirmPayment(
        provider,
        paymentIntentId,
        paymentMethodId
      )
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Confirm payment' })
      return reply.status(500).send({ error: 'Failed to confirm payment' })
    }
  })

  server.get('/api/billing/payments/crypto/wallet/:currency', async (request, reply) => {
    try {
      const { currency } = request.params as any
      const address = await paymentProviderManager.getCryptoWalletAddress(currency)
      return { success: true, address }
    } catch (error) {
      logError(error as Error, { context: 'Get crypto wallet address' })
      return reply.status(500).send({ error: 'Failed to get wallet address' })
    }
  })

  // Usage report endpoints
  server.post('/api/billing/reports/usage', async (request, reply) => {
    try {
      const { userId, period, periodStart, periodEnd, subscriptionId } = request.body as any
      const report = await usageTracker.generateUsageReport(
        userId,
        period,
        new Date(periodStart),
        new Date(periodEnd),
        subscriptionId
      )
      return { success: true, report }
    } catch (error) {
      logError(error as Error, { context: 'Generate usage report' })
      return reply.status(500).send({ error: 'Failed to generate usage report' })
    }
  })

  server.get('/api/billing/reports/usage/:reportId', async (request, reply) => {
    try {
      const { reportId } = request.params as any
      const report = await usageTracker.getReport(reportId)
      if (!report) {
        return reply.status(404).send({ error: 'Report not found' })
      }
      return { success: true, report }
    } catch (error) {
      logError(error as Error, { context: 'Get usage report' })
      return reply.status(500).send({ error: 'Failed to get usage report' })
    }
  })

  server.get('/api/billing/reports/usage/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any
      const reports = await usageTracker.getReportsByUserId(userId)
      return { success: true, reports }
    } catch (error) {
      logError(error as Error, { context: 'Get usage reports by user' })
      return reply.status(500).send({ error: 'Failed to get usage reports' })
    }
  })

  server.get('/api/billing/reports/usage/:reportId/export/:format', async (request, reply) => {
    try {
      const { reportId, format } = request.params as any
      const exported = await usageTracker.exportReport(reportId, format)
      reply.header('Content-Type', 'application/octet-stream')
      reply.header('Content-Disposition', `attachment; filename="report_${reportId}.${format}"`)
      return exported
    } catch (error) {
      logError(error as Error, { context: 'Export usage report' })
      return reply.status(500).send({ error: 'Failed to export usage report' })
    }
  })

  // Invoice report endpoints
  server.post('/api/billing/reports/invoice', async (request, reply) => {
    try {
      const { userId, periodStart, periodEnd } = request.body as any
      const report = await usageTracker.generateInvoiceReport(
        userId,
        new Date(periodStart),
        new Date(periodEnd)
      )
      return { success: true, report }
    } catch (error) {
      logError(error as Error, { context: 'Generate invoice report' })
      return reply.status(500).send({ error: 'Failed to generate invoice report' })
    }
  })

  server.get('/api/billing/reports/invoice/:reportId', async (request, reply) => {
    try {
      const { reportId } = request.params as any
      const report = await usageTracker.getInvoiceReport(reportId)
      if (!report) {
        return reply.status(404).send({ error: 'Report not found' })
      }
      return { success: true, report }
    } catch (error) {
      logError(error as Error, { context: 'Get invoice report' })
      return reply.status(500).send({ error: 'Failed to get invoice report' })
    }
  })

  server.get('/api/billing/reports/invoice/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any
      const reports = await usageTracker.getInvoiceReportsByUserId(userId)
      return { success: true, reports }
    } catch (error) {
      logError(error as Error, { context: 'Get invoice reports by user' })
      return reply.status(500).send({ error: 'Failed to get invoice reports' })
    }
  })

  logInfo('✅ Billing API routes registered')
}

