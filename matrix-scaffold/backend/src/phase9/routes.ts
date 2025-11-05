/**
 * Phase 9 - Routes
 * 
 * All API routes for Phase 9 features
 */

import { FastifyInstance } from 'fastify'
import { logger, logError } from '../../config/logger'
import { globalDeploymentEngine } from '../deployment/globalDeployment'
import { domainsNetworkManager } from '../domains/domainsManager'
import { edgeDistributionLayer } from '../cdn/edgeDistribution'
import { globalMonitoringAndFailover } from '../global/monitoringAndFailover'
import { regionalPricingAndLocalization } from '../regional/pricingAndLocalization'
import { publicAccessGateway } from '../public/publicGateway'

export async function registerPhase9Routes(server: FastifyInstance) {
  // Global Deployment
  server.post('/api/deployment/global', async (request, reply) => {
    try {
      const { name, type, provider, region, config } = request.body as any
      const deployment = await globalDeploymentEngine.deployToRegion(name, type, provider, region, config)
      return reply.send({ success: true, deployment })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/deployment/global' })
      return reply.status(500).send({ error: 'Failed to deploy' })
    }
  })

  // Domains
  server.post('/api/domains', async (request, reply) => {
    try {
      const { name, provider, autoSSL } = request.body as any
      const domain = await domainsNetworkManager.registerDomain(name, provider, autoSSL)
      return reply.send({ success: true, domain })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/domains' })
      return reply.status(500).send({ error: 'Failed to register domain' })
    }
  })

  server.post('/api/domains/:domainId/ssl', async (request, reply) => {
    try {
      const { domainId } = request.params as any
      const certificate = await domainsNetworkManager.issueSSLCertificate(domainId)
      return reply.send({ success: true, certificate })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/domains/:domainId/ssl' })
      return reply.status(500).send({ error: 'Failed to issue SSL certificate' })
    }
  })

  // CDN
  server.post('/api/cdn/configure', async (request, reply) => {
    try {
      const { domainId, cacheStrategy, cacheTTL, compression, minification } = request.body as any
      const config = await edgeDistributionLayer.configureCDN(domainId, cacheStrategy, cacheTTL, compression, minification)
      return reply.send({ success: true, config })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/cdn/configure' })
      return reply.status(500).send({ error: 'Failed to configure CDN' })
    }
  })

  // Monitoring
  server.post('/api/monitoring/global', async (request, reply) => {
    try {
      const { region, deploymentId } = request.body as any
      const monitor = await globalMonitoringAndFailover.registerMonitor(region, deploymentId)
      return reply.send({ success: true, monitor })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/monitoring/global' })
      return reply.status(500).send({ error: 'Failed to register monitor' })
    }
  })

  // Regional Pricing
  server.get('/api/regional/pricing/:region', async (request, reply) => {
    try {
      const { region } = request.params as any
      const { basePrice } = request.query as any
      const pricing = await regionalPricingAndLocalization.calculatePrice(parseFloat(basePrice) || 100, region)
      return reply.send({ success: true, pricing })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/regional/pricing/:region' })
      return reply.status(500).send({ error: 'Failed to calculate price' })
    }
  })

  // Public Gateway
  server.post('/api/public/keys', async (request, reply) => {
    try {
      const { type, name, userId, partnerId, description, rateLimit, permissions } = request.body as any
      const apiKey = await publicAccessGateway.createPublicAPIKey(type, name, userId, partnerId, description, rateLimit, permissions)
      return reply.send({ success: true, apiKey })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/public/keys' })
      return reply.status(500).send({ error: 'Failed to create API key' })
    }
  })

  server.get('/api/public/keys/:keyId/stats', async (request, reply) => {
    try {
      const { keyId } = request.params as any
      const stats = await publicAccessGateway.getUsageStats(keyId)
      return reply.send({ success: true, stats })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/public/keys/:keyId/stats' })
      return reply.status(500).send({ error: 'Failed to get stats' })
    }
  })
}

