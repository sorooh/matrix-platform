/**
 * Phase 8.6 - Routes
 * 
 * All API routes for Phase 8.6 features
 */

import { FastifyInstance } from 'fastify'
import { logger, logError } from '../../config/logger'
import { advancedBilling } from '../billing/advancedBilling'
import { webSocketManager } from '../realtime/websocketManager'
import { advancedSearch } from '../search/advancedSearch'
import { cicdManager } from '../cicd/cicdManager'
import { complianceManager } from '../compliance/complianceManager'
import { performanceOptimizer } from '../performance/performanceOptimizer'
import { advancedMonitoring } from '../monitoring/advancedMonitoring'
import { mlAnalytics } from '../analytics/mlAnalytics'

export async function registerPhase8_6Routes(server: FastifyInstance) {
  // Advanced Billing
  server.post('/api/billing/invoice-templates', async (request, reply) => {
    try {
      const { name, type, template, logo, colors, footer } = request.body as any
      const invoiceTemplate = await advancedBilling.createInvoiceTemplate(name, type, template, logo, colors, footer)
      return reply.send({ success: true, template: invoiceTemplate })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/billing/invoice-templates' })
      return reply.status(500).send({ error: 'Failed to create invoice template' })
    }
  })

  server.post('/api/billing/payment-retry', async (request, reply) => {
    try {
      const { invoiceId, attempt, scheduledAt } = request.body as any
      const retry = await advancedBilling.schedulePaymentRetry(invoiceId, attempt, new Date(scheduledAt))
      return reply.send({ success: true, retry })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/billing/payment-retry' })
      return reply.status(500).send({ error: 'Failed to schedule payment retry' })
    }
  })

  server.post('/api/billing/proration', async (request, reply) => {
    try {
      const { subscriptionId, newTier, newStartDate } = request.body as any
      const proration = await advancedBilling.calculateProration(subscriptionId, newTier, new Date(newStartDate))
      if (!proration) return reply.status(404).send({ error: 'Subscription not found' })
      return reply.send({ success: true, proration })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/billing/proration' })
      return reply.status(500).send({ error: 'Failed to calculate proration' })
    }
  })

  // Advanced Search
  server.post('/api/search/:index', async (request, reply) => {
    try {
      const { index } = request.params as any
      const query = request.body as any
      const results = await advancedSearch.search(index, query)
      return reply.send({ success: true, results })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/search/:index' })
      return reply.status(500).send({ error: 'Failed to search' })
    }
  })

  server.post('/api/search/:index/bulk', async (request, reply) => {
    try {
      const { index } = request.params as any
      const { type, items, updates } = request.body as any
      const operation = await advancedSearch.bulkOperation(type, items, index, updates)
      return reply.send({ success: true, operation })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/search/:index/bulk' })
      return reply.status(500).send({ error: 'Failed to perform bulk operation' })
    }
  })

  server.get('/api/search/:index/export', async (request, reply) => {
    try {
      const { index } = request.params as any
      const { format, ...query } = request.query as any
      const data = await advancedSearch.exportData(index, query, format)
      reply.type('text/plain')
      return reply.send(data)
    } catch (error) {
      logError(error as Error, { context: 'GET /api/search/:index/export' })
      return reply.status(500).send({ error: 'Failed to export data' })
    }
  })

  // CI/CD
  server.post('/api/cicd/repositories', async (request, reply) => {
    try {
      const { appId, provider, repositoryUrl, branch, accessToken, webhookSecret } = request.body as any
      const repository = await cicdManager.connectRepository(appId, provider, repositoryUrl, branch, accessToken, webhookSecret)
      return reply.send({ success: true, repository })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/cicd/repositories' })
      return reply.status(500).send({ error: 'Failed to connect repository' })
    }
  })

  server.post('/api/cicd/pipelines', async (request, reply) => {
    try {
      const { appId, repositoryId } = request.body as any
      const pipeline = await cicdManager.createPipeline(appId, repositoryId)
      return reply.send({ success: true, pipeline })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/cicd/pipelines' })
      return reply.status(500).send({ error: 'Failed to create pipeline' })
    }
  })

  server.post('/api/cicd/deploy', async (request, reply) => {
    try {
      const { appId, version, environment } = request.body as any
      const deployment = await cicdManager.deploy(appId, version, environment)
      return reply.send({ success: true, deployment })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/cicd/deploy' })
      return reply.status(500).send({ error: 'Failed to deploy' })
    }
  })

  // Compliance
  server.post('/api/compliance/check', async (request, reply) => {
    try {
      const { standard } = request.body as any
      const check = await complianceManager.runComplianceCheck(standard)
      return reply.send({ success: true, check })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/compliance/check' })
      return reply.status(500).send({ error: 'Failed to run compliance check' })
    }
  })

  server.post('/api/compliance/report', async (request, reply) => {
    try {
      const { standard } = request.body as any
      const report = await complianceManager.generateComplianceReport(standard)
      return reply.send({ success: true, report })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/compliance/report' })
      return reply.status(500).send({ error: 'Failed to generate compliance report' })
    }
  })

  // Monitoring
  server.post('/api/monitoring/metrics', async (request, reply) => {
    try {
      const { name, type, value, labels } = request.body as any
      await advancedMonitoring.recordMetric(name, type, value, labels)
      return reply.send({ success: true })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/monitoring/metrics' })
      return reply.status(500).send({ error: 'Failed to record metric' })
    }
  })

  server.get('/api/monitoring/alerts', async (request, reply) => {
    try {
      const { status } = request.query as any
      const alerts = await advancedMonitoring.getAlerts(status)
      return reply.send({ success: true, alerts })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/monitoring/alerts' })
      return reply.status(500).send({ error: 'Failed to get alerts' })
    }
  })

  // ML Analytics
  server.post('/api/analytics/ml/insight', async (request, reply) => {
    try {
      const { type, metric, historicalData } = request.body as any
      const insight = await mlAnalytics.generateInsight(type, metric, historicalData)
      return reply.send({ success: true, insight })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/analytics/ml/insight' })
      return reply.status(500).send({ error: 'Failed to generate insight' })
    }
  })

  server.post('/api/analytics/ml/anomaly', async (request, reply) => {
    try {
      const { metric, currentValue, historicalData } = request.body as any
      const anomaly = await mlAnalytics.detectAnomaly(metric, currentValue, historicalData)
      return reply.send({ success: true, anomaly })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/analytics/ml/anomaly' })
      return reply.status(500).send({ error: 'Failed to detect anomaly' })
    }
  })

  server.post('/api/analytics/ml/forecast', async (request, reply) => {
    try {
      const { metric, historicalData, periods } = request.body as any
      const forecast = await mlAnalytics.generateForecast(metric, historicalData, periods)
      return reply.send({ success: true, forecast })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/analytics/ml/forecast' })
      return reply.status(500).send({ error: 'Failed to generate forecast' })
    }
  })
}

