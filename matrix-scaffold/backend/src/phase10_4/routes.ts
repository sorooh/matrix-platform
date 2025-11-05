/**
 * Phase 10.4 - Routes
 * 
 * All API routes for Phase 10.4 features
 */

import { FastifyInstance } from 'fastify'
import { logger, logError } from '../../config/logger'
import { advancedSecuritySuite } from '../security/advancedSecurity'
import { performanceOptimizationEngine } from '../performance/optimizationEngine'
import { observabilityStack } from '../observability/observabilityStack'
import { developerExperiencePlatform } from '../developer/developerExperience'
import { businessIntelligenceAnalytics } from '../business/businessIntelligence'

export async function registerPhase10_4Routes(server: FastifyInstance) {
  // Advanced Security Suite
  server.post('/api/security/threats/detect', async (request, reply) => {
    try {
      const { type, severity, source, target, description, metadata } = request.body as any
      const threat = await advancedSecuritySuite.detectThreat(type, severity, source, target, description, metadata)
      return reply.send({ success: true, threat })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/security/threats/detect' })
      return reply.status(500).send({ error: 'Failed to detect threat' })
    }
  })

  server.post('/api/security/vulnerabilities/scan', async (request, reply) => {
    try {
      const { target, type } = request.body as any
      const scan = await advancedSecuritySuite.runVulnerabilityScan(target, type)
      return reply.send({ success: true, scan })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/security/vulnerabilities/scan' })
      return reply.status(500).send({ error: 'Failed to run vulnerability scan' })
    }
  })

  // Performance Optimization Engine
  server.post('/api/performance/queries/optimize', async (request, reply) => {
    try {
      const { query, executionTime } = request.body as any
      const optimization = await performanceOptimizationEngine.optimizeQuery(query, executionTime)
      return reply.send({ success: true, optimization })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/performance/queries/optimize' })
      return reply.status(500).send({ error: 'Failed to optimize query' })
    }
  })

  server.post('/api/performance/metrics', async (request, reply) => {
    try {
      const { endpoint, method, responseTime, throughput, errorRate, cpuUsage, memoryUsage } = request.body as any
      const metric = await performanceOptimizationEngine.recordPerformanceMetric(endpoint, method, responseTime, throughput, errorRate, cpuUsage, memoryUsage)
      return reply.send({ success: true, metric })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/performance/metrics' })
      return reply.status(500).send({ error: 'Failed to record performance metric' })
    }
  })

  // Observability Stack
  server.post('/api/observability/traces', async (request, reply) => {
    try {
      const { service, operation, parentSpanId } = request.body as any
      const trace = await observabilityStack.createTrace(service, operation, parentSpanId)
      return reply.send({ success: true, trace })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/observability/traces' })
      return reply.status(500).send({ error: 'Failed to create trace' })
    }
  })

  server.post('/api/observability/logs', async (request, reply) => {
    try {
      const { level, service, message, fields, context, error } = request.body as any
      const log = await observabilityStack.log(level, service, message, fields, context, error)
      return reply.send({ success: true, log })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/observability/logs' })
      return reply.status(500).send({ error: 'Failed to log' })
    }
  })

  // Developer Experience Platform
  server.post('/api/developer/graphql/execute', async (request, reply) => {
    try {
      const { query, variables, operation } = request.body as any
      const result = await developerExperiencePlatform.executeGraphQLQuery(query, variables, operation)
      return reply.send({ success: true, result })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/developer/graphql/execute' })
      return reply.status(500).send({ error: 'Failed to execute GraphQL query' })
    }
  })

  server.post('/api/developer/sdks/generate', async (request, reply) => {
    try {
      const { language, version, packageName } = request.body as any
      const sdk = await developerExperiencePlatform.generateSDK(language, version, packageName)
      return reply.send({ success: true, sdk })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/developer/sdks/generate' })
      return reply.status(500).send({ error: 'Failed to generate SDK' })
    }
  })

  // Business Intelligence & Analytics
  server.post('/api/business/reports/generate', async (request, reply) => {
    try {
      const { type, title, description, format, filters, period, generatedBy } = request.body as any
      const report = await businessIntelligenceAnalytics.generateReport(type, title, description, format, filters, period, generatedBy)
      return reply.send({ success: true, report })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/business/reports/generate' })
      return reply.status(500).send({ error: 'Failed to generate report' })
    }
  })

  server.post('/api/business/churn/analyze', async (request, reply) => {
    try {
      const { period } = request.body as any
      const analysis = await businessIntelligenceAnalytics.analyzeChurn(period)
      return reply.send({ success: true, analysis })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/business/churn/analyze' })
      return reply.status(500).send({ error: 'Failed to analyze churn' })
    }
  })
}

