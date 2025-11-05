/**
 * Phase 9.3 - Routes
 * 
 * All API routes for Phase 9.3 features
 */

import { FastifyInstance } from 'fastify'
import { logger, logError } from '../../config/logger'
import { advancedAutoScaling } from '../scaling/autoScaling'
import { disasterRecoveryManager } from '../disaster/disasterRecovery'
import { advancedComplianceAutomation } from '../compliance/advancedCompliance'
import { mlPredictionsEngine } from '../ml/predictions'
import { costOptimizationManager } from '../cost/costOptimization'
import { performanceBenchmarking } from '../benchmarking/performanceBenchmarking'
import { competitiveIntelligence } from '../intelligence/competitiveIntelligence'

export async function registerPhase9_3Routes(server: FastifyInstance) {
  // Auto-Scaling
  server.post('/api/scaling/check', async (request, reply) => {
    try {
      const { resourceId, resourceType, metrics } = request.body as any
      const event = await advancedAutoScaling.checkScalingConditions(resourceId, resourceType, metrics)
      return reply.send({ success: true, event })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/scaling/check' })
      return reply.status(500).send({ error: 'Failed to check scaling conditions' })
    }
  })

  server.post('/api/scaling/optimize', async (request, reply) => {
    try {
      const { resourceId, resourceType, currentUsage } = request.body as any
      const optimization = await advancedAutoScaling.generateOptimization(resourceId, resourceType, currentUsage)
      return reply.send({ success: true, optimization })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/scaling/optimize' })
      return reply.status(500).send({ error: 'Failed to generate optimization' })
    }
  })

  // Disaster Recovery
  server.post('/api/disaster/backup', async (request, reply) => {
    try {
      const { resourceId, resourceType, type, location } = request.body as any
      const backup = await disasterRecoveryManager.createBackup(resourceId, resourceType, type, location)
      return reply.send({ success: true, backup })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/disaster/backup' })
      return reply.status(500).send({ error: 'Failed to create backup' })
    }
  })

  server.post('/api/disaster/restore', async (request, reply) => {
    try {
      const { backupId, targetRegion, pointInTime } = request.body as any
      const recovery = await disasterRecoveryManager.restoreFromBackup(backupId, targetRegion, pointInTime ? new Date(pointInTime) : undefined)
      return reply.send({ success: true, recovery })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/disaster/restore' })
      return reply.status(500).send({ error: 'Failed to restore from backup' })
    }
  })

  // Advanced Compliance
  server.post('/api/compliance/report', async (request, reply) => {
    try {
      const { type, standard, region, periodStart, periodEnd } = request.body as any
      const report = await advancedComplianceAutomation.generateReport(type, standard, region, new Date(periodStart), new Date(periodEnd))
      return reply.send({ success: true, report })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/compliance/report' })
      return reply.status(500).send({ error: 'Failed to generate compliance report' })
    }
  })

  server.post('/api/compliance/pia', async (request, reply) => {
    try {
      const { projectId, projectName, dataTypes } = request.body as any
      const pia = await advancedComplianceAutomation.createPIA(projectId, projectName, dataTypes)
      return reply.send({ success: true, pia })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/compliance/pia' })
      return reply.status(500).send({ error: 'Failed to create PIA' })
    }
  })

  server.post('/api/compliance/data-subject-request', async (request, reply) => {
    try {
      const { userId, right } = request.body as any
      const request_result = await advancedComplianceAutomation.processDataSubjectRequest(userId, right)
      return reply.send({ success: true, request: request_result })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/compliance/data-subject-request' })
      return reply.status(500).send({ error: 'Failed to process data subject request' })
    }
  })

  // ML Predictions
  server.post('/api/ml/predict', async (request, reply) => {
    try {
      const { type, target, timeframe } = request.body as any
      let prediction
      if (type === 'user_behavior') {
        prediction = await mlPredictionsEngine.predictUserBehavior(target, timeframe)
      } else if (type === 'cost') {
        prediction = await mlPredictionsEngine.predictCost(target, 'resource', timeframe)
      }
      return reply.send({ success: true, prediction })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/ml/predict' })
      return reply.status(500).send({ error: 'Failed to generate prediction' })
    }
  })

  server.post('/api/ml/forecast', async (request, reply) => {
    try {
      const { resourceId, resourceType, metric, days } = request.body as any
      const forecast = await mlPredictionsEngine.forecastResourceDemand(resourceId, resourceType, metric, days)
      return reply.send({ success: true, forecast })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/ml/forecast' })
      return reply.status(500).send({ error: 'Failed to generate forecast' })
    }
  })

  // Cost Optimization
  server.post('/api/cost/analyze', async (request, reply) => {
    try {
      const { resourceId, resourceType, periodStart, periodEnd } = request.body as any
      const analysis = await costOptimizationManager.analyzeCost(resourceId, resourceType, new Date(periodStart), new Date(periodEnd))
      return reply.send({ success: true, analysis })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/cost/analyze' })
      return reply.status(500).send({ error: 'Failed to analyze cost' })
    }
  })

  server.post('/api/cost/budget', async (request, reply) => {
    try {
      const { name, amount, period, alertThreshold } = request.body as any
      const budget = await costOptimizationManager.createBudget(name, amount, period, alertThreshold)
      return reply.send({ success: true, budget })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/cost/budget' })
      return reply.status(500).send({ error: 'Failed to create budget' })
    }
  })

  // Performance Benchmarking
  server.post('/api/benchmark', async (request, reply) => {
    try {
      const { name, metric, ourValue, competitorValue, competitorName } = request.body as any
      const benchmark = await performanceBenchmarking.createBenchmark(name, metric, ourValue, competitorValue, competitorName)
      return reply.send({ success: true, benchmark })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/benchmark' })
      return reply.status(500).send({ error: 'Failed to create benchmark' })
    }
  })

  server.post('/api/ab-test', async (request, reply) => {
    try {
      const { name, description, variants, trafficSplit } = request.body as any
      const test = await performanceBenchmarking.createABTest(name, description, variants, trafficSplit)
      return reply.send({ success: true, test })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/ab-test' })
      return reply.status(500).send({ error: 'Failed to create A/B test' })
    }
  })

  // Competitive Intelligence
  server.get('/api/intelligence/competitors', async (request, reply) => {
    try {
      const { type } = request.query as any
      const competitors = await competitiveIntelligence.getCompetitors(type)
      return reply.send({ success: true, competitors })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/intelligence/competitors' })
      return reply.status(500).send({ error: 'Failed to get competitors' })
    }
  })

  server.post('/api/intelligence/trends', async (request, reply) => {
    try {
      const { market } = request.body as any
      const analysis = await competitiveIntelligence.analyzeMarketTrends(market)
      return reply.send({ success: true, analysis })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/intelligence/trends' })
      return reply.status(500).send({ error: 'Failed to analyze market trends' })
    }
  })
}

