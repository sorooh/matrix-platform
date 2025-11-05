/**
 * Phase 8 - API Gateway Routes
 * 
 * API endpoints for AI Public Gateway
 */

import { FastifyInstance } from 'fastify'
import { apiGatewayManager } from './apiGateway'
import { logError, logInfo } from '../config/logger'

export async function registerGatewayRoutes(server: FastifyInstance) {
  logInfo('Registering API Gateway routes...')

  // API Key endpoints
  server.post('/api/gateway/keys', async (request, reply) => {
    try {
      const { userId, name, subscriptionId, allowedAIs, rateLimit, expiresInDays } = request.body as any
      const apiKey = await apiGatewayManager.createAPIKey(
        userId,
        name,
        subscriptionId,
        allowedAIs,
        rateLimit,
        expiresInDays
      )
      return { success: true, apiKey }
    } catch (error) {
      logError(error as Error, { context: 'Create API key' })
      return reply.status(500).send({ error: 'Failed to create API key' })
    }
  })

  server.get('/api/gateway/keys/:keyId', async (request, reply) => {
    try {
      const { keyId } = request.params as any
      const apiKey = await apiGatewayManager.getAPIKey(keyId)
      if (!apiKey) {
        return reply.status(404).send({ error: 'API key not found' })
      }
      return { success: true, apiKey }
    } catch (error) {
      logError(error as Error, { context: 'Get API key' })
      return reply.status(500).send({ error: 'Failed to get API key' })
    }
  })

  server.get('/api/gateway/keys/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any
      const apiKeys = await apiGatewayManager.getAPIKeysByUserId(userId)
      return { success: true, apiKeys }
    } catch (error) {
      logError(error as Error, { context: 'Get API keys by user' })
      return reply.status(500).send({ error: 'Failed to get API keys' })
    }
  })

  server.post('/api/gateway/keys/:keyId/revoke', async (request, reply) => {
    try {
      const { keyId } = request.params as any
      const success = await apiGatewayManager.revokeAPIKey(keyId)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Revoke API key' })
      return reply.status(500).send({ error: 'Failed to revoke API key' })
    }
  })

  server.post('/api/gateway/keys/:keyId/renew', async (request, reply) => {
    try {
      const { keyId } = request.params as any
      const { expiresInDays } = request.body as any
      const apiKey = await apiGatewayManager.renewAPIKey(keyId, expiresInDays)
      if (!apiKey) {
        return reply.status(404).send({ error: 'API key not found' })
      }
      return { success: true, apiKey }
    } catch (error) {
      logError(error as Error, { context: 'Renew API key' })
      return reply.status(500).send({ error: 'Failed to renew API key' })
    }
  })

  // Usage tracking endpoints
  server.get('/api/gateway/keys/:keyId/usage', async (request, reply) => {
    try {
      const { keyId } = request.params as any
      const stats = await apiGatewayManager.getUsageStats(keyId)
      return { success: true, stats }
    } catch (error) {
      logError(error as Error, { context: 'Get usage stats' })
      return reply.status(500).send({ error: 'Failed to get usage stats' })
    }
  })

  server.get('/api/gateway/keys/:keyId/history', async (request, reply) => {
    try {
      const { keyId } = request.params as any
      const { limit } = request.query as any
      const history = await apiGatewayManager.getRequestHistory(keyId, limit ? parseInt(limit) : 100)
      return { success: true, history }
    } catch (error) {
      logError(error as Error, { context: 'Get request history' })
      return reply.status(500).send({ error: 'Failed to get request history' })
    }
  })

  // API Playground endpoint
  server.post('/api/gateway/playground', async (request, reply) => {
    try {
      const { key, aiId, endpoint, method, body } = request.body as any
      
      // Validate API key
      const validation = await apiGatewayManager.validateAPIKey(key, aiId)
      if (!validation.valid) {
        return reply.status(401).send({ error: validation.reason })
      }

      const apiKey = validation.apiKey!
      
      // Check rate limit
      const rateLimitOk = await apiGatewayManager.checkRateLimit(apiKey.id, 'requests_per_minute')
      if (!rateLimitOk) {
        return reply.status(429).send({ error: 'Rate limit exceeded' })
      }

      // Record request
      await apiGatewayManager.recordRequest(
        apiKey.id,
        aiId || 'unknown',
        endpoint || '/',
        method || 'POST',
        0, // tokens - would be calculated from actual AI response
        0  // cost - would be calculated from actual AI response
      )

      // In production, this would call the actual AI endpoint
      return {
        success: true,
        message: 'API Playground request recorded',
        apiKey: {
          id: apiKey.id,
          name: apiKey.name
        }
      }
    } catch (error) {
      logError(error as Error, { context: 'API Playground' })
      return reply.status(500).send({ error: 'Failed to process playground request' })
    }
  })

  logInfo('✅ API Gateway routes registered')
}

