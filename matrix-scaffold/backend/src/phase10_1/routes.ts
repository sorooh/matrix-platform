/**
 * Phase 10.1 - Routes
 * 
 * All API routes for Phase 10.1 features
 */

import { FastifyInstance } from 'fastify'
import { logger, logError } from '../../config/logger'
import { integrationPartnerships } from '../integrations/integrationPartnerships'
import { globalPartnerNetwork } from '../partners/partnerNetwork'
import { publicAPIDeveloperGateway } from '../developer/apiGateway'
import { globalIntegrationsMarketplace } from '../marketplace/integrationsMarketplace'
import { globalPartnerCompliance } from '../partners/partnerCompliance'

export async function registerPhase10_1Routes(server: FastifyInstance) {
  // Integration Partnerships
  server.post('/api/integrations/connect', async (request, reply) => {
    try {
      const { provider, credentials } = request.body as any
      const integration = await integrationPartnerships.connectIntegration(provider, credentials)
      return reply.send({ success: true, integration })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/integrations/connect' })
      return reply.status(500).send({ error: 'Failed to connect integration' })
    }
  })

  server.post('/api/integrations/call', async (request, reply) => {
    try {
      const { integrationId, resourceId, resourceType, endpoint, method, headers, body } = request.body as any
      const connection = await integrationPartnerships.executeIntegrationCall(integrationId, resourceId, resourceType, endpoint, method, headers, body)
      return reply.send({ success: true, connection })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/integrations/call' })
      return reply.status(500).send({ error: 'Failed to execute integration call' })
    }
  })

  // Global Partner Network
  server.post('/api/partners/register', async (request, reply) => {
    try {
      const { type, name, organization, description, website, contactEmail, contactPhone, country, capabilities } = request.body as any
      const partner = await globalPartnerNetwork.registerPartner(type, name, organization, description, website, contactEmail, contactPhone, country, capabilities)
      return reply.send({ success: true, partner })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/partners/register' })
      return reply.status(500).send({ error: 'Failed to register partner' })
    }
  })

  server.post('/api/partners/:partnerId/activate', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const activated = await globalPartnerNetwork.activatePartner(partnerId)
      return reply.send({ success: true, activated })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/partners/:partnerId/activate' })
      return reply.status(500).send({ error: 'Failed to activate partner' })
    }
  })

  // Public API & Developer Gateway
  server.post('/api/developer/api-keys', async (request, reply) => {
    try {
      const { name, type, rateLimit, usageLimits, permissions, expiresAt } = request.body as any
      const apiKey = await publicAPIDeveloperGateway.createAPIKey(name, type, rateLimit, usageLimits, permissions, expiresAt ? new Date(expiresAt) : undefined)
      return reply.send({ success: true, apiKey })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/developer/api-keys' })
      return reply.status(500).send({ error: 'Failed to create API key' })
    }
  })

  server.get('/api/developer/openapi', async (request, reply) => {
    try {
      const spec = await publicAPIDeveloperGateway.generateOpenAPISpec()
      return reply.send({ success: true, spec })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/developer/openapi' })
      return reply.status(500).send({ error: 'Failed to generate OpenAPI spec' })
    }
  })

  server.post('/api/developer/playground', async (request, reply) => {
    try {
      const { endpoint, method, headers, body, apiKey } = request.body as any
      const request_result = await publicAPIDeveloperGateway.executePlaygroundRequest(endpoint, method, headers, body, apiKey)
      return reply.send({ success: true, request: request_result })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/developer/playground' })
      return reply.status(500).send({ error: 'Failed to execute playground request' })
    }
  })

  // Global Integrations Marketplace
  server.get('/api/marketplace/integrations', async (request, reply) => {
    try {
      const { category, status } = request.query as any
      const integrations = await globalIntegrationsMarketplace.getIntegrations(category, status)
      return reply.send({ success: true, integrations })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/marketplace/integrations' })
      return reply.status(500).send({ error: 'Failed to get integrations' })
    }
  })

  server.post('/api/marketplace/install', async (request, reply) => {
    try {
      const { integrationId, userId, config } = request.body as any
      const installation = await globalIntegrationsMarketplace.installIntegration(integrationId, userId, config)
      return reply.send({ success: true, installation })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/marketplace/install' })
      return reply.status(500).send({ error: 'Failed to install integration' })
    }
  })

  // Global Partner Compliance
  server.post('/api/partners/:partnerId/compliance', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const { standards } = request.body as any
      const compliance = await globalPartnerCompliance.assessPartnerCompliance(partnerId, standards)
      return reply.send({ success: true, compliance })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/partners/:partnerId/compliance' })
      return reply.status(500).send({ error: 'Failed to assess partner compliance' })
    }
  })

  server.post('/api/partners/:partnerId/risk-assessment', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const riskAssessment = await globalPartnerCompliance.assessPartnerRisk(partnerId)
      return reply.send({ success: true, riskAssessment })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/partners/:partnerId/risk-assessment' })
      return reply.status(500).send({ error: 'Failed to assess partner risk' })
    }
  })
}

