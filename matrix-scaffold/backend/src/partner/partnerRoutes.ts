/**
 * Phase 8.2 - Partner Portal API Routes
 * 
 * API endpoints for Partner Portal
 */

import { FastifyInstance } from 'fastify'
import { partnerPortalManager } from './partnerPortal'
import { resellerManager } from './reseller'
import { commissionManager } from './commission'
import { partnerAPIGatewayManager } from './apiGateway'
import { multiBrandManager } from './multiBrand'
import { partnerAnalyticsManager } from './analytics'
import { partnerGovernanceManager } from './governance'
import { logError, logInfo } from '../config/logger'

export async function registerPartnerRoutes(server: FastifyInstance) {
  logInfo('Registering Partner Portal API routes...')

  // Partner endpoints
  server.post('/api/partner/partners', async (request, reply) => {
    try {
      const { name, email, subdomain, tier, commissionRate } = request.body as any
      const partner = await partnerPortalManager.createPartner(
        name,
        email,
        subdomain,
        tier,
        commissionRate
      )
      return { success: true, partner }
    } catch (error) {
      logError(error as Error, { context: 'Create partner' })
      return reply.status(500).send({ error: 'Failed to create partner' })
    }
  })

  server.get('/api/partner/partners/:partnerId', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const partner = await partnerPortalManager.getPartner(partnerId)
      if (!partner) {
        return reply.status(404).send({ error: 'Partner not found' })
      }
      return { success: true, partner }
    } catch (error) {
      logError(error as Error, { context: 'Get partner' })
      return reply.status(500).send({ error: 'Failed to get partner' })
    }
  })

  server.get('/api/partner/partners/subdomain/:subdomain', async (request, reply) => {
    try {
      const { subdomain } = request.params as any
      const partner = await partnerPortalManager.getPartnerBySubdomain(subdomain)
      if (!partner) {
        return reply.status(404).send({ error: 'Partner not found' })
      }
      return { success: true, partner }
    } catch (error) {
      logError(error as Error, { context: 'Get partner by subdomain' })
      return reply.status(500).send({ error: 'Failed to get partner' })
    }
  })

  server.patch('/api/partner/partners/:partnerId', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const updates = request.body as any
      const partner = await partnerPortalManager.updatePartner(partnerId, updates)
      if (!partner) {
        return reply.status(404).send({ error: 'Partner not found' })
      }
      return { success: true, partner }
    } catch (error) {
      logError(error as Error, { context: 'Update partner' })
      return reply.status(500).send({ error: 'Failed to update partner' })
    }
  })

  server.get('/api/partner/partners/:partnerId/dashboard', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const dashboard = await partnerPortalManager.getPartnerDashboard(partnerId)
      if (!dashboard) {
        return reply.status(404).send({ error: 'Dashboard not found' })
      }
      return { success: true, dashboard }
    } catch (error) {
      logError(error as Error, { context: 'Get partner dashboard' })
      return reply.status(500).send({ error: 'Failed to get dashboard' })
    }
  })

  // Partner members
  server.post('/api/partner/partners/:partnerId/members', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const { userId, email, name, role } = request.body as any
      const member = await partnerPortalManager.addPartnerMember(
        partnerId,
        userId,
        email,
        name,
        role
      )
      return { success: true, member }
    } catch (error) {
      logError(error as Error, { context: 'Add partner member' })
      return reply.status(500).send({ error: 'Failed to add member' })
    }
  })

  server.get('/api/partner/partners/:partnerId/members', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const members = await partnerPortalManager.getPartnerMembers(partnerId)
      return { success: true, members }
    } catch (error) {
      logError(error as Error, { context: 'Get partner members' })
      return reply.status(500).send({ error: 'Failed to get members' })
    }
  })

  // Reseller endpoints
  server.post('/api/partner/resellers', async (request, reply) => {
    try {
      const { partnerId, name, email, commissionRate } = request.body as any
      const reseller = await resellerManager.createReseller(
        partnerId,
        name,
        email,
        commissionRate
      )
      return { success: true, reseller }
    } catch (error) {
      logError(error as Error, { context: 'Create reseller' })
      return reply.status(500).send({ error: 'Failed to create reseller' })
    }
  })

  server.get('/api/partner/resellers/:resellerId', async (request, reply) => {
    try {
      const { resellerId } = request.params as any
      const reseller = await resellerManager.getReseller(resellerId)
      if (!reseller) {
        return reply.status(404).send({ error: 'Reseller not found' })
      }
      return { success: true, reseller }
    } catch (error) {
      logError(error as Error, { context: 'Get reseller' })
      return reply.status(500).send({ error: 'Failed to get reseller' })
    }
  })

  server.get('/api/partner/resellers/partner/:partnerId', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const resellers = await resellerManager.getResellersByPartner(partnerId)
      return { success: true, resellers }
    } catch (error) {
      logError(error as Error, { context: 'Get resellers by partner' })
      return reply.status(500).send({ error: 'Failed to get resellers' })
    }
  })

  server.get('/api/partner/resellers/:resellerId/report', async (request, reply) => {
    try {
      const { resellerId } = request.params as any
      const report = await resellerManager.getResellerReport(resellerId)
      if (!report) {
        return reply.status(404).send({ error: 'Report not found' })
      }
      return { success: true, report }
    } catch (error) {
      logError(error as Error, { context: 'Get reseller report' })
      return reply.status(500).send({ error: 'Failed to get report' })
    }
  })

  // Commission endpoints
  server.post('/api/partner/commissions', async (request, reply) => {
    try {
      const { partnerId, saleAmount, currency, type, resellerId, saleId, subscriptionId } = request.body as any
      const commission = await commissionManager.createCommission(
        partnerId,
        saleAmount,
        currency,
        type,
        resellerId,
        saleId,
        subscriptionId
      )
      return { success: true, commission }
    } catch (error) {
      logError(error as Error, { context: 'Create commission' })
      return reply.status(500).send({ error: 'Failed to create commission' })
    }
  })

  server.get('/api/partner/commissions/partner/:partnerId', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const { status } = request.query as any
      const commissions = await commissionManager.getCommissionsByPartner(partnerId, status)
      return { success: true, commissions }
    } catch (error) {
      logError(error as Error, { context: 'Get commissions by partner' })
      return reply.status(500).send({ error: 'Failed to get commissions' })
    }
  })

  server.get('/api/partner/commissions/partner/:partnerId/summary', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const summary = await commissionManager.getCommissionSummary(partnerId)
      return { success: true, summary }
    } catch (error) {
      logError(error as Error, { context: 'Get commission summary' })
      return reply.status(500).send({ error: 'Failed to get summary' })
    }
  })

  // Payout endpoints
  server.post('/api/partner/payouts', async (request, reply) => {
    try {
      const { partnerId, paymentProvider, paymentMethodId, scheduledAt } = request.body as any
      const payout = await commissionManager.createPayout(
        partnerId,
        paymentProvider,
        paymentMethodId,
        scheduledAt ? new Date(scheduledAt) : undefined
      )
      return { success: true, payout }
    } catch (error) {
      logError(error as Error, { context: 'Create payout' })
      return reply.status(500).send({ error: 'Failed to create payout' })
    }
  })

  server.post('/api/partner/payouts/:payoutId/process', async (request, reply) => {
    try {
      const { payoutId } = request.params as any
      const success = await commissionManager.processPayout(payoutId)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Process payout' })
      return reply.status(500).send({ error: 'Failed to process payout' })
    }
  })

  server.post('/api/partner/payouts/:payoutId/complete', async (request, reply) => {
    try {
      const { payoutId } = request.params as any
      const success = await commissionManager.completePayout(payoutId)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Complete payout' })
      return reply.status(500).send({ error: 'Failed to complete payout' })
    }
  })

  server.get('/api/partner/payouts/partner/:partnerId', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const payouts = await commissionManager.getPayoutsByPartner(partnerId)
      return { success: true, payouts }
    } catch (error) {
      logError(error as Error, { context: 'Get payouts by partner' })
      return reply.status(500).send({ error: 'Failed to get payouts' })
    }
  })

  // OAuth endpoints
  server.post('/api/partner/oauth/clients', async (request, reply) => {
    try {
      const { partnerId, redirectUris, scopes } = request.body as any
      const client = await partnerAPIGatewayManager.createOAuthClient(
        partnerId,
        redirectUris,
        scopes
      )
      return { success: true, client }
    } catch (error) {
      logError(error as Error, { context: 'Create OAuth client' })
      return reply.status(500).send({ error: 'Failed to create OAuth client' })
    }
  })

  server.post('/api/partner/oauth/token', async (request, reply) => {
    try {
      const { client_id, client_secret, grant_type, code } = request.body as any
      const token = await partnerAPIGatewayManager.generateToken(
        client_id,
        client_secret,
        grant_type,
        code
      )
      if (!token) {
        return reply.status(401).send({ error: 'Invalid credentials' })
      }
      return { success: true, ...token }
    } catch (error) {
      logError(error as Error, { context: 'Generate OAuth token' })
      return reply.status(500).send({ error: 'Failed to generate token' })
    }
  })

  // Partner API endpoints (require OAuth token)
  server.post('/api/partner/customers/register', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const token = authHeader.substring(7)
      const validation = await partnerAPIGatewayManager.validateToken(token)
      if (!validation.valid || !validation.partnerId) {
        return reply.status(401).send({ error: 'Invalid token' })
      }

      // Check rate limit
      const rateLimitOk = await partnerAPIGatewayManager.checkRateLimit(validation.partnerId, 'minute')
      if (!rateLimitOk) {
        return reply.status(429).send({ error: 'Rate limit exceeded' })
      }

      const { email, name, tier } = request.body as any
      const result = await partnerAPIGatewayManager.registerCustomer(
        validation.partnerId,
        email,
        name,
        tier
      )
      return { success: true, ...result }
    } catch (error) {
      logError(error as Error, { context: 'Register customer via API' })
      return reply.status(500).send({ error: 'Failed to register customer' })
    }
  })

  server.post('/api/partner/subscriptions/create', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const token = authHeader.substring(7)
      const validation = await partnerAPIGatewayManager.validateToken(token)
      if (!validation.valid || !validation.partnerId) {
        return reply.status(401).send({ error: 'Invalid token' })
      }

      const { userId, tier, paymentProvider, paymentMethodId } = request.body as any
      const subscriptionId = await partnerAPIGatewayManager.createSubscriptionViaAPI(
        validation.partnerId,
        userId,
        tier,
        paymentProvider,
        paymentMethodId
      )
      return { success: true, subscriptionId }
    } catch (error) {
      logError(error as Error, { context: 'Create subscription via API' })
      return reply.status(500).send({ error: 'Failed to create subscription' })
    }
  })

  server.get('/api/partner/usage', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const token = authHeader.substring(7)
      const validation = await partnerAPIGatewayManager.validateToken(token)
      if (!validation.valid || !validation.partnerId) {
        return reply.status(401).send({ error: 'Invalid token' })
      }

      const { userId } = request.query as any
      const usage = await partnerAPIGatewayManager.getUsageViaAPI(validation.partnerId, userId)
      return { success: true, usage }
    } catch (error) {
      logError(error as Error, { context: 'Get usage via API' })
      return reply.status(500).send({ error: 'Failed to get usage' })
    }
  })

  // Multi-brand endpoints
  server.get('/api/partner/brand/:partnerId', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const config = await multiBrandManager.getBrandConfig(partnerId)
      if (!config) {
        return reply.status(404).send({ error: 'Brand config not found' })
      }
      return { success: true, config }
    } catch (error) {
      logError(error as Error, { context: 'Get brand config' })
      return reply.status(500).send({ error: 'Failed to get brand config' })
    }
  })

  server.patch('/api/partner/brand/:partnerId', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const updates = request.body as any
      const config = await multiBrandManager.updateBrandConfig(partnerId, updates)
      if (!config) {
        return reply.status(404).send({ error: 'Brand config not found' })
      }
      return { success: true, config }
    } catch (error) {
      logError(error as Error, { context: 'Update brand config' })
      return reply.status(500).send({ error: 'Failed to update brand config' })
    }
  })

  // Analytics endpoints
  server.get('/api/partner/analytics/:partnerId', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const { startDate, endDate } = request.query as any
      const analytics = await partnerAnalyticsManager.getPartnerAnalytics(
        partnerId,
        new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date(endDate || Date.now())
      )
      if (!analytics) {
        return reply.status(404).send({ error: 'Analytics not found' })
      }
      return { success: true, analytics }
    } catch (error) {
      logError(error as Error, { context: 'Get partner analytics' })
      return reply.status(500).send({ error: 'Failed to get analytics' })
    }
  })

  server.get('/api/partner/analytics/top-partners', async (request, reply) => {
    try {
      const { limit } = request.query as any
      const topPartners = await partnerAnalyticsManager.getTopPartners(limit ? parseInt(limit) : 10)
      return { success: true, topPartners }
    } catch (error) {
      logError(error as Error, { context: 'Get top partners' })
      return reply.status(500).send({ error: 'Failed to get top partners' })
    }
  })

  server.get('/api/partner/analytics/:partnerId/export/:format', async (request, reply) => {
    try {
      const { partnerId, format } = request.params as any
      const { startDate, endDate } = request.query as any
      const exported = await partnerAnalyticsManager.exportAnalytics(
        partnerId,
        format,
        new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date(endDate || Date.now())
      )
      reply.header('Content-Type', 'application/octet-stream')
      reply.header('Content-Disposition', `attachment; filename="analytics_${partnerId}.${format}"`)
      return exported
    } catch (error) {
      logError(error as Error, { context: 'Export analytics' })
      return reply.status(500).send({ error: 'Failed to export analytics' })
    }
  })

  // Governance endpoints
  server.get('/api/partner/governance/audit-logs/:partnerId', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const { limit, action } = request.query as any
      const logs = await partnerGovernanceManager.getAuditLogs(
        partnerId,
        limit ? parseInt(limit) : 100,
        action
      )
      return { success: true, logs }
    } catch (error) {
      logError(error as Error, { context: 'Get audit logs' })
      return reply.status(500).send({ error: 'Failed to get audit logs' })
    }
  })

  server.post('/api/partner/governance/partners/:partnerId/freeze', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const { reason } = request.body as any
      const success = await partnerGovernanceManager.freezePartner(partnerId, reason)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Freeze partner' })
      return reply.status(500).send({ error: 'Failed to freeze partner' })
    }
  })

  server.post('/api/partner/governance/partners/:partnerId/activate', async (request, reply) => {
    try {
      const { partnerId } = request.params as any
      const success = await partnerGovernanceManager.activatePartner(partnerId)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Activate partner' })
      return reply.status(500).send({ error: 'Failed to activate partner' })
    }
  })

  logInfo('✅ Partner Portal API routes registered')
}

