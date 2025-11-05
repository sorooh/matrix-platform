/**
 * Phase 8.3 - Routes
 * 
 * All API routes for Phase 8.3 features
 */

import { FastifyInstance } from 'fastify'
import { logger, logError } from '../../config/logger'
import { advancedWebhookSystem } from '../webhooks/webhookSystem'
import { taxManager } from '../tax/taxManager'
import { refundManager } from '../refunds/refundManager'
import { slaManager } from '../sla/slaManager'
import { currencyManager } from '../currency/currencyManager'
import { advancedSecurityManager } from '../security/advancedSecurity'
import { advancedAnalyticsManager } from '../analytics/advancedAnalytics'
import { costOptimizer } from '../optimization/costOptimizer'
import { generateSDK } from '../api/apiDocs'

export async function registerPhase8_3Routes(server: FastifyInstance) {
  // Webhooks
  server.post('/api/webhooks/register', async (request, reply) => {
    try {
      const { url, events, userId, partnerId, secret, retries, timeout, headers } = request.body as any
      const webhook = await advancedWebhookSystem.registerWebhook(
        url,
        events,
        userId,
        partnerId,
        secret,
        retries,
        timeout,
        headers
      )
      return reply.send({ success: true, webhook })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/webhooks/register' })
      return reply.status(500).send({ error: 'Failed to register webhook' })
    }
  })

  server.get('/api/webhooks', async (request, reply) => {
    try {
      const { userId, partnerId } = request.query as any
      let webhooks = []
      if (userId) {
        webhooks = await advancedWebhookSystem.getWebhooksByUserId(userId)
      } else if (partnerId) {
        webhooks = await advancedWebhookSystem.getWebhooksByPartnerId(partnerId)
      }
      return reply.send({ success: true, webhooks })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/webhooks' })
      return reply.status(500).send({ error: 'Failed to get webhooks' })
    }
  })

  server.get('/api/webhooks/:webhookId/deliveries', async (request, reply) => {
    try {
      const { webhookId } = request.params as any
      const deliveries = await advancedWebhookSystem.getDeliveries(webhookId)
      return reply.send({ success: true, deliveries })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/webhooks/:webhookId/deliveries' })
      return reply.status(500).send({ error: 'Failed to get deliveries' })
    }
  })

  // Tax
  server.post('/api/tax/calculate', async (request, reply) => {
    try {
      const { amount, currency, country, state, userId } = request.body as any
      const calculation = await taxManager.calculateTax(amount, currency, country, state, userId)
      return reply.send({ success: true, calculation })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/tax/calculate' })
      return reply.status(500).send({ error: 'Failed to calculate tax' })
    }
  })

  server.post('/api/tax/exemptions', async (request, reply) => {
    try {
      const { userId, country, reason, taxNumber, validTo } = request.body as any
      const exemption = await taxManager.createExemption(userId, country, reason, taxNumber, validTo)
      return reply.send({ success: true, exemption })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/tax/exemptions' })
      return reply.status(500).send({ error: 'Failed to create exemption' })
    }
  })

  // Refunds
  server.post('/api/refunds', async (request, reply) => {
    try {
      const { invoiceId, userId, type, reason, amount, description } = request.body as any
      const refund = await refundManager.createRefund(invoiceId, userId, type, reason, amount, description)
      return reply.send({ success: true, refund })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/refunds' })
      return reply.status(500).send({ error: 'Failed to create refund' })
    }
  })

  server.get('/api/refunds', async (request, reply) => {
    try {
      const { userId } = request.query as any
      const refunds = await refundManager.getRefundsByUserId(userId)
      return reply.send({ success: true, refunds })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/refunds' })
      return reply.status(500).send({ error: 'Failed to get refunds' })
    }
  })

  server.post('/api/refunds/:refundId/disputes', async (request, reply) => {
    try {
      const { refundId } = request.params as any
      const { userId, reason, evidence } = request.body as any
      const dispute = await refundManager.createDispute(refundId, userId, reason, evidence)
      return reply.send({ success: true, dispute })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/refunds/:refundId/disputes' })
      return reply.status(500).send({ error: 'Failed to create dispute' })
    }
  })

  // SLA
  server.get('/api/sla/metrics/:subscriptionId', async (request, reply) => {
    try {
      const { subscriptionId } = request.params as any
      const metrics = await slaManager.getMetrics(subscriptionId)
      return reply.send({ success: true, metrics })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/sla/metrics/:subscriptionId' })
      return reply.status(500).send({ error: 'Failed to get SLA metrics' })
    }
  })

  server.get('/api/sla/alerts', async (request, reply) => {
    try {
      const { subscriptionId, status } = request.query as any
      const alerts = await slaManager.getAlerts(subscriptionId, status)
      return reply.send({ success: true, alerts })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/sla/alerts' })
      return reply.status(500).send({ error: 'Failed to get SLA alerts' })
    }
  })

  // Currency
  server.get('/api/currency/convert', async (request, reply) => {
    try {
      const { amount, from, to } = request.query as any
      const converted = await currencyManager.convertCurrency(parseFloat(amount), from, to)
      return reply.send({ success: true, amount: converted, currency: to })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/currency/convert' })
      return reply.status(500).send({ error: 'Failed to convert currency' })
    }
  })

  server.post('/api/currency/config', async (request, reply) => {
    try {
      const { userId, defaultCurrency, supportedCurrencies, autoConvert } = request.body as any
      const config = await currencyManager.setCurrencyConfig(userId, defaultCurrency, supportedCurrencies, autoConvert)
      return reply.send({ success: true, config })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/currency/config' })
      return reply.status(500).send({ error: 'Failed to set currency config' })
    }
  })

  // Security
  server.post('/api/security/ip-whitelist', async (request, reply) => {
    try {
      const { userId, ip, description } = request.body as any
      const whitelist = await advancedSecurityManager.addIPWhitelist(userId, ip, description)
      return reply.send({ success: true, whitelist })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/security/ip-whitelist' })
      return reply.status(500).send({ error: 'Failed to add IP whitelist' })
    }
  })

  server.post('/api/security/geo-block', async (request, reply) => {
    try {
      const { country, action, userId, partnerId } = request.body as any
      const rule = await advancedSecurityManager.addGeoBlockRule(country, action, userId, partnerId)
      return reply.send({ success: true, rule })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/security/geo-block' })
      return reply.status(500).send({ error: 'Failed to add geo block rule' })
    }
  })

  server.post('/api/security/2fa/totp/generate', async (request, reply) => {
    try {
      const { userId, label } = request.body as any
      const { secret, qrCode } = await advancedSecurityManager.generateTOTPSecret(userId, label)
      return reply.send({ success: true, secret, qrCode })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/security/2fa/totp/generate' })
      return reply.status(500).send({ error: 'Failed to generate TOTP secret' })
    }
  })

  server.post('/api/security/2fa/totp/verify', async (request, reply) => {
    try {
      const { userId, token } = request.body as any
      const verified = await advancedSecurityManager.verifyTOTP(userId, token)
      return reply.send({ success: true, verified })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/security/2fa/totp/verify' })
      return reply.status(500).send({ error: 'Failed to verify TOTP' })
    }
  })

  // Analytics
  server.post('/api/analytics/reports/revenue', async (request, reply) => {
    try {
      const { startDate, endDate, timeRange } = request.body as any
      const report = await advancedAnalyticsManager.generateRevenueReport(
        new Date(startDate),
        new Date(endDate),
        timeRange
      )
      return reply.send({ success: true, report })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/analytics/reports/revenue' })
      return reply.status(500).send({ error: 'Failed to generate revenue report' })
    }
  })

  server.post('/api/analytics/forecasts', async (request, reply) => {
    try {
      const { type, period } = request.body as any
      const forecast = await advancedAnalyticsManager.generateForecast(type, period)
      return reply.send({ success: true, forecast })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/analytics/forecasts' })
      return reply.status(500).send({ error: 'Failed to generate forecast' })
    }
  })

  // Cost Optimization
  server.post('/api/optimization/analyze', async (request, reply) => {
    try {
      const { userId } = request.body as any
      const report = await costOptimizer.analyzeCostOptimization(userId)
      return reply.send({ success: true, report })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/optimization/analyze' })
      return reply.status(500).send({ error: 'Failed to analyze cost optimization' })
    }
  })

  // SDK Generation
  server.get('/api/sdk/:language', async (request, reply) => {
    try {
      const { language } = request.params as any
      const sdk = generateSDK(language)
      reply.type('text/plain')
      return reply.send(sdk)
    } catch (error) {
      logError(error as Error, { context: 'GET /api/sdk/:language' })
      return reply.status(500).send({ error: 'Failed to generate SDK' })
    }
  })
}

