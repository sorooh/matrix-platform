/**
 * Phase 8 - Licensing API Routes
 * 
 * API endpoints for License & Governance Layer
 */

import { FastifyInstance } from 'fastify'
import { governanceManager } from './governance'
import { logError, logInfo } from '../config/logger'

export async function registerLicensingRoutes(server: FastifyInstance) {
  logInfo('Registering Licensing API routes...')

  // License endpoints
  server.post('/api/licensing/licenses', async (request, reply) => {
    try {
      const { userId, aiId, type, subscriptionId, expiresInDays } = request.body as any
      const license = await governanceManager.createLicense(
        userId,
        aiId,
        type,
        subscriptionId,
        expiresInDays
      )
      return { success: true, license }
    } catch (error) {
      logError(error as Error, { context: 'Create license' })
      return reply.status(500).send({ error: 'Failed to create license' })
    }
  })

  server.get('/api/licensing/licenses/:licenseId', async (request, reply) => {
    try {
      const { licenseId } = request.params as any
      const license = await governanceManager.getLicense(licenseId)
      if (!license) {
        return reply.status(404).send({ error: 'License not found' })
      }
      return { success: true, license }
    } catch (error) {
      logError(error as Error, { context: 'Get license' })
      return reply.status(500).send({ error: 'Failed to get license' })
    }
  })

  server.get('/api/licensing/licenses/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any
      const licenses = await governanceManager.getLicensesByUserId(userId)
      return { success: true, licenses }
    } catch (error) {
      logError(error as Error, { context: 'Get licenses by user' })
      return reply.status(500).send({ error: 'Failed to get licenses' })
    }
  })

  server.get('/api/licensing/licenses/ai/:aiId/user/:userId', async (request, reply) => {
    try {
      const { aiId, userId } = request.params as any
      const license = await governanceManager.getLicenseByAIAndUser(aiId, userId)
      if (!license) {
        return reply.status(404).send({ error: 'License not found' })
      }
      return { success: true, license }
    } catch (error) {
      logError(error as Error, { context: 'Get license by AI and user' })
      return reply.status(500).send({ error: 'Failed to get license' })
    }
  })

  server.post('/api/licensing/licenses/:licenseId/revoke', async (request, reply) => {
    try {
      const { licenseId } = request.params as any
      const { reason } = request.body as any
      const success = await governanceManager.revokeLicense(licenseId, reason)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Revoke license' })
      return reply.status(500).send({ error: 'Failed to revoke license' })
    }
  })

  // Compliance endpoints
  server.post('/api/licensing/compliance/check', async (request, reply) => {
    try {
      const { userId, subscriptionId, aiId } = request.body as any
      const check = await governanceManager.checkCompliance(userId, subscriptionId, aiId)
      return { success: true, check }
    } catch (error) {
      logError(error as Error, { context: 'Check compliance' })
      return reply.status(500).send({ error: 'Failed to check compliance' })
    }
  })

  server.get('/api/licensing/compliance/:checkId', async (request, reply) => {
    try {
      const { checkId } = request.params as any
      const check = await governanceManager.getComplianceCheck(checkId)
      if (!check) {
        return reply.status(404).send({ error: 'Compliance check not found' })
      }
      return { success: true, check }
    } catch (error) {
      logError(error as Error, { context: 'Get compliance check' })
      return reply.status(500).send({ error: 'Failed to get compliance check' })
    }
  })

  server.post('/api/licensing/compliance/validate', async (request, reply) => {
    try {
      const { userId, aiId, usageType } = request.body as any
      const validation = await governanceManager.validateLicenseUsage(userId, aiId, usageType)
      return { success: true, validation }
    } catch (error) {
      logError(error as Error, { context: 'Validate license usage' })
      return reply.status(500).send({ error: 'Failed to validate license usage' })
    }
  })

  logInfo('✅ Licensing API routes registered')
}

