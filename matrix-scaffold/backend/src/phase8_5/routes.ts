/**
 * Phase 8.5 - Routes
 * 
 * All API routes for Phase 8.5 features
 */

import { FastifyInstance } from 'fastify'
import { logger, logError } from '../../config/logger'
import { aiFederation } from '../federation/aiFederation'
import { matrixCoinManager } from '../economy/matrixCoin'
import { aiContractManager } from '../contracts/aiContractManager'
import { crossAppIntegration } from '../federation/crossAppIntegration'
import { aiReputationManager } from '../reputation/aiReputation'
import { governanceConsole } from '../console/governanceConsole'

export async function registerPhase8_5Routes(server: FastifyInstance) {
  // AI Federation
  server.post('/api/federation/identities', async (request, reply) => {
    try {
      const { type, name, capabilities, description, endpoint } = request.body as any
      const identity = await aiFederation.registerIdentity(type, name, capabilities, description, endpoint)
      return reply.send({ success: true, identity })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/federation/identities' })
      return reply.status(500).send({ error: 'Failed to register identity' })
    }
  })

  server.post('/api/federation/communications', async (request, reply) => {
    try {
      const { fromAI, toAI, message, payload } = request.body as any
      const communication = await aiFederation.sendCommunication(fromAI, toAI, message, payload)
      return reply.send({ success: true, communication })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/federation/communications' })
      return reply.status(500).send({ error: 'Failed to send communication' })
    }
  })

  server.post('/api/federation/service-requests', async (request, reply) => {
    try {
      const { requesterAI, providerAI, service, parameters } = request.body as any
      const request = await aiFederation.createServiceRequest(requesterAI, providerAI, service, parameters)
      return reply.send({ success: true, request })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/federation/service-requests' })
      return reply.status(500).send({ error: 'Failed to create service request' })
    }
  })

  // MatrixCoin
  server.get('/api/economy/wallet/:accountId', async (request, reply) => {
    try {
      const { accountId } = request.params as any
      const wallet = await matrixCoinManager.getWallet(accountId)
      if (!wallet) return reply.status(404).send({ error: 'Wallet not found' })
      return reply.send({ success: true, wallet })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/economy/wallet/:accountId' })
      return reply.status(500).send({ error: 'Failed to get wallet' })
    }
  })

  server.post('/api/economy/transfer', async (request, reply) => {
    try {
      const { fromAccountId, toAccountId, amount, type, description } = request.body as any
      const transaction = await matrixCoinManager.transferCoins(fromAccountId, toAccountId, amount, type, description)
      return reply.send({ success: true, transaction })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/economy/transfer' })
      return reply.status(500).send({ error: 'Failed to transfer coins' })
    }
  })

  server.post('/api/economy/convert', async (request, reply) => {
    try {
      const { accountId, fromCurrency, toCurrency, fromAmount } = request.body as any
      const conversion = await matrixCoinManager.convertCurrency(accountId, fromCurrency, toCurrency, fromAmount)
      return reply.send({ success: true, conversion })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/economy/convert' })
      return reply.status(500).send({ error: 'Failed to convert currency' })
    }
  })

  // AI Contracts
  server.post('/api/contracts', async (request, reply) => {
    try {
      const { fromAI, toAI, type, service, description, price, currency, duration, conditions } = request.body as any
      const contract = await aiContractManager.createContract(
        fromAI, toAI, type, service, description, price, currency, duration, conditions
      )
      return reply.send({ success: true, contract })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/contracts' })
      return reply.status(500).send({ error: 'Failed to create contract' })
    }
  })

  server.post('/api/contracts/:contractId/complete', async (request, reply) => {
    try {
      const { contractId } = request.params as any
      const { result } = request.body as any
      const completed = await aiContractManager.completeContract(contractId, result)
      return reply.send({ success: true, completed })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/contracts/:contractId/complete' })
      return reply.status(500).send({ error: 'Failed to complete contract' })
    }
  })

  // Cross-App Integration
  server.post('/api/integration/call-ai', async (request, reply) => {
    try {
      const { appId, aiId, service, input } = request.body as any
      const call = await crossAppIntegration.callAI(appId, aiId, service, input)
      return reply.send({ success: true, call })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/integration/call-ai' })
      return reply.status(500).send({ error: 'Failed to call AI' })
    }
  })

  // AI Reputation
  server.get('/api/reputation/:aiId', async (request, reply) => {
    try {
      const { aiId } = request.params as any
      const reputation = await aiReputationManager.getReputation(aiId)
      if (!reputation) return reply.status(404).send({ error: 'Reputation not found' })
      return reply.send({ success: true, reputation })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/reputation/:aiId' })
      return reply.status(500).send({ error: 'Failed to get reputation' })
    }
  })

  server.get('/api/reputation/top', async (request, reply) => {
    try {
      const { limit } = request.query as any
      const topAIs = await aiReputationManager.getTopAIs(parseInt(limit) || 10)
      return reply.send({ success: true, topAIs })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/reputation/top' })
      return reply.status(500).send({ error: 'Failed to get top AIs' })
    }
  })

  // Governance Console
  server.get('/api/governance/economy', async (request, reply) => {
    try {
      const metrics = await governanceConsole.getEconomyMetrics()
      return reply.send({ success: true, metrics })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/governance/economy' })
      return reply.status(500).send({ error: 'Failed to get economy metrics' })
    }
  })

  server.post('/api/governance/reports', async (request, reply) => {
    try {
      const { type } = request.body as any
      const report = await governanceConsole.generateReport(type)
      return reply.send({ success: true, report })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/governance/reports' })
      return reply.status(500).send({ error: 'Failed to generate report' })
    }
  })
}

