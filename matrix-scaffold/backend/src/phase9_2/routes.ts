/**
 * Phase 9.2 - Routes
 * 
 * All API routes for Phase 9.2 features
 */

import { FastifyInstance } from 'fastify'
import { logger, logError } from '../../config/logger'
import { matrixEvolutionAndInnovation } from '../evolution/innovationDepartment'
import { applicationsAndPartnerEvolution } from '../evolution/partnerEvolution'
import { matrixCyberDefenseCenter } from '../cyberdefense/defenseCenter'
import { matrixRightsAndResponsibilities } from '../rights/rightsFramework'
import { matrixPublicIdentityCenter } from '../identity/publicIdentity'
import { matrixLicensingDepartment } from '../licensing/licensingDepartment'
import { smartLegalContractsEngine } from '../contracts/legalContracts'

export async function registerPhase9_2Routes(server: FastifyInstance) {
  // Evolution & Innovation
  server.post('/api/evolution/telemetry', async (request, reply) => {
    try {
      const { userId, action, data, performance } = request.body as any
      await matrixEvolutionAndInnovation.recordTelemetry(userId, action, data, performance)
      return reply.send({ success: true })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/evolution/telemetry' })
      return reply.status(500).send({ error: 'Failed to record telemetry' })
    }
  })

  server.post('/api/evolution/feedback', async (request, reply) => {
    try {
      const { userId, type, content, rating, metadata } = request.body as any
      const feedback = await matrixEvolutionAndInnovation.recordFeedback(userId, type, content, rating, metadata)
      return reply.send({ success: true, feedback })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/evolution/feedback' })
      return reply.status(500).send({ error: 'Failed to record feedback' })
    }
  })

  server.post('/api/evolution/innovation', async (request, reply) => {
    try {
      const { type, title, description, source, data, priority } = request.body as any
      const innovation = await matrixEvolutionAndInnovation.generateInnovation(type, title, description, source, data, priority)
      return reply.send({ success: true, innovation })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/evolution/innovation' })
      return reply.status(500).send({ error: 'Failed to generate innovation' })
    }
  })

  // App Evolution
  server.post('/api/evolution/apps/:appId/analyze', async (request, reply) => {
    try {
      const { appId } = request.params as any
      const evolution = await applicationsAndPartnerEvolution.analyzeApp(appId)
      return reply.send({ success: true, evolution })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/evolution/apps/:appId/analyze' })
      return reply.status(500).send({ error: 'Failed to analyze app' })
    }
  })

  // Cyber Defense
  server.post('/api/defense/detect-threat', async (request, reply) => {
    try {
      const { type, source, target, severity } = request.body as any
      const threat = await matrixCyberDefenseCenter.detectThreat(type, source, target, severity)
      return reply.send({ success: true, threat })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/defense/detect-threat' })
      return reply.status(500).send({ error: 'Failed to detect threat' })
    }
  })

  // Rights & Responsibilities
  server.get('/api/rights/:partyType', async (request, reply) => {
    try {
      const { partyType } = request.params as any
      const framework = await matrixRightsAndResponsibilities.getFramework(partyType)
      if (!framework) return reply.status(404).send({ error: 'Framework not found' })
      return reply.send({ success: true, framework })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/rights/:partyType' })
      return reply.status(500).send({ error: 'Failed to get framework' })
    }
  })

  // Public Identity
  server.get('/api/identity/:section/:language', async (request, reply) => {
    try {
      const { section, language } = request.params as any
      const identity = await matrixPublicIdentityCenter.getIdentity(section, language)
      if (!identity) return reply.status(404).send({ error: 'Identity not found' })
      return reply.send({ success: true, identity })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/identity/:section/:language' })
      return reply.status(500).send({ error: 'Failed to get identity' })
    }
  })

  // Licensing
  server.post('/api/licensing/licenses', async (request, reply) => {
    try {
      const { type, entityId, entityType, period, autoRenew, metadata } = request.body as any
      const license = await matrixLicensingDepartment.createLicense(type, entityId, entityType, period, autoRenew, metadata)
      return reply.send({ success: true, license })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/licensing/licenses' })
      return reply.status(500).send({ error: 'Failed to create license' })
    }
  })

  server.post('/api/licensing/verify', async (request, reply) => {
    try {
      const { licenseKey, ipAddress, userAgent } = request.body as any
      const verification = await matrixLicensingDepartment.verifyLicense(licenseKey, ipAddress, userAgent)
      return reply.send({ success: true, verification })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/licensing/verify' })
      return reply.status(500).send({ error: 'Failed to verify license' })
    }
  })

  // Legal Contracts
  server.post('/api/contracts/generate', async (request, reply) => {
    try {
      const { type, parties, template } = request.body as any
      const contract = await smartLegalContractsEngine.generateContract(type, parties, template)
      return reply.send({ success: true, contract })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/contracts/generate' })
      return reply.status(500).send({ error: 'Failed to generate contract' })
    }
  })

  server.post('/api/contracts/:contractId/sign', async (request, reply) => {
    try {
      const { contractId } = request.params as any
      const { partyId, signature, ipAddress, userAgent } = request.body as any
      const signed = await smartLegalContractsEngine.signContract(contractId, partyId, signature, ipAddress, userAgent)
      return reply.send({ success: true, signed })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/contracts/:contractId/sign' })
      return reply.status(500).send({ error: 'Failed to sign contract' })
    }
  })
}

