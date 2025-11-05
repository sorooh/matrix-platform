/**
 * Phase 10.2 - Routes
 * 
 * All API routes for Phase 10.2 features
 */

import { FastifyInstance } from 'fastify'
import { logger, logError } from '../../config/logger'
import { collectiveSyncProtocol } from '../collective/syncProtocol'
import { matrixKnowledgeFederation } from '../federation/knowledgeFederation'
import { nicholasAdaptiveGovernance } from '../governance/adaptiveGovernance'
import { metaLearningEngine } from '../metamachine/metaLearning'
import { crossUniverseSynchronization } from '../federation/universeSync'

export async function registerPhase10_2Routes(server: FastifyInstance) {
  // Collective Sync Protocol
  server.post('/api/collective/nodes/register', async (request, reply) => {
    try {
      const { type, name, endpoint, publicKey, encryptionLevel, capabilities } = request.body as any
      const node = await collectiveSyncProtocol.registerSyncNode(type, name, endpoint, publicKey, encryptionLevel, capabilities)
      return reply.send({ success: true, node })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/collective/nodes/register' })
      return reply.status(500).send({ error: 'Failed to register sync node' })
    }
  })

  server.post('/api/collective/exchange', async (request, reply) => {
    try {
      const { sourceNodeId, targetNodeId, type, data, priority, tags } = request.body as any
      const packet = await collectiveSyncProtocol.exchangeKnowledgePacket(sourceNodeId, targetNodeId, type, data, priority, tags)
      return reply.send({ success: true, packet })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/collective/exchange' })
      return reply.status(500).send({ error: 'Failed to exchange knowledge packet' })
    }
  })

  // Matrix Knowledge Federation
  server.post('/api/knowledge/entities', async (request, reply) => {
    try {
      const { category, title, content, sourceNodeId, tags } = request.body as any
      const entity = await matrixKnowledgeFederation.addKnowledgeEntity(category, title, content, sourceNodeId, tags)
      return reply.send({ success: true, entity })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/knowledge/entities' })
      return reply.status(500).send({ error: 'Failed to add knowledge entity' })
    }
  })

  server.post('/api/knowledge/entities/:entityId/evaluate', async (request, reply) => {
    try {
      const { entityId } = request.params as any
      const { evaluatorNodeId, factors } = request.body as any
      const evaluation = await matrixKnowledgeFederation.evaluateKnowledgeEntity(entityId, evaluatorNodeId, factors)
      return reply.send({ success: true, evaluation })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/knowledge/entities/:entityId/evaluate' })
      return reply.status(500).send({ error: 'Failed to evaluate knowledge entity' })
    }
  })

  // Nicholas Adaptive Governance
  server.post('/api/governance/proposals', async (request, reply) => {
    try {
      const { type, title, description, proposedBy, consensusThreshold } = request.body as any
      const proposal = await nicholasAdaptiveGovernance.createProposal(type, title, description, proposedBy, consensusThreshold)
      return reply.send({ success: true, proposal })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/governance/proposals' })
      return reply.status(500).send({ error: 'Failed to create proposal' })
    }
  })

  server.post('/api/governance/proposals/:proposalId/vote', async (request, reply) => {
    try {
      const { proposalId } = request.params as any
      const { voterId, decision, reasoning } = request.body as any
      const vote = await nicholasAdaptiveGovernance.castVote(proposalId, voterId, decision, reasoning)
      return reply.send({ success: true, vote })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/governance/proposals/:proposalId/vote' })
      return reply.status(500).send({ error: 'Failed to cast vote' })
    }
  })

  // Meta-Learning Engine
  server.post('/api/meta-learning/events', async (request, reply) => {
    try {
      const { type, source, instanceId, component, description, context } = request.body as any
      const event = await metaLearningEngine.recordLearningEvent(type, source, instanceId, component, description, context)
      return reply.send({ success: true, event })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/meta-learning/events' })
      return reply.status(500).send({ error: 'Failed to record learning event' })
    }
  })

  server.post('/api/meta-learning/patterns/:patternId/apply', async (request, reply) => {
    try {
      const { patternId } = request.params as any
      const { instanceId } = request.body as any
      const applied = await metaLearningEngine.applyLearningPattern(patternId, instanceId)
      return reply.send({ success: true, applied })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/meta-learning/patterns/:patternId/apply' })
      return reply.status(500).send({ error: 'Failed to apply learning pattern' })
    }
  })

  // Cross-Universe Synchronization
  server.post('/api/universe/instances/register', async (request, reply) => {
    try {
      const { type, name, endpoint, version } = request.body as any
      const instance = await crossUniverseSynchronization.registerInstance(type, name, endpoint, version)
      return reply.send({ success: true, instance })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/universe/instances/register' })
      return reply.status(500).send({ error: 'Failed to register universe instance' })
    }
  })

  server.post('/api/universe/sync', async (request, reply) => {
    try {
      const { sourceInstanceId, targetInstanceId, type, data } = request.body as any
      const operation = await crossUniverseSynchronization.synchronize(sourceInstanceId, targetInstanceId, type, data)
      return reply.send({ success: true, operation })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/universe/sync' })
      return reply.status(500).send({ error: 'Failed to synchronize' })
    }
  })
}

