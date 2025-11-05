/**
 * Phase 10 - Routes
 * 
 * All API routes for Phase 10 features
 */

import { FastifyInstance } from 'fastify'
import { logger, logError } from '../../config/logger'
import { selfCodingAndAutoRepair } from '../selfcoding/autoRepair'
import { continuousSelfTesting } from '../selftesting/continuousTesting'
import { nicholasCoreEvolution } from '../evolution/nicholasCore'
import { governanceFrameworks } from '../governance/governanceFrameworks'
import { quantumMemoryAndHolographicMap } from '../memory/quantumMemory'
import { collectiveAIIntegration } from '../collective/aiIntegration'

export async function registerPhase10Routes(server: FastifyInstance) {
  // Self-Coding & Auto-Repair
  server.post('/api/self-coding/detect-issue', async (request, reply) => {
    try {
      const { filePath, lineNumber, type, severity, description } = request.body as any
      const issue = await selfCodingAndAutoRepair.detectIssue(filePath, lineNumber, type, severity, description)
      return reply.send({ success: true, issue })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/self-coding/detect-issue' })
      return reply.status(500).send({ error: 'Failed to detect issue' })
    }
  })

  server.post('/api/self-coding/auto-fix', async (request, reply) => {
    try {
      const { issueId } = request.body as any
      const change = await selfCodingAndAutoRepair.autoFix(issueId)
      return reply.send({ success: true, change })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/self-coding/auto-fix' })
      return reply.status(500).send({ error: 'Failed to auto-fix' })
    }
  })

  // Continuous Self-Testing
  server.post('/api/testing/create-test', async (request, reply) => {
    try {
      const { name, type, description, filePath } = request.body as any
      const testCase = await continuousSelfTesting.createTestCase(name, type, description, filePath)
      return reply.send({ success: true, testCase })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/testing/create-test' })
      return reply.status(500).send({ error: 'Failed to create test' })
    }
  })

  server.post('/api/testing/run-suite', async (request, reply) => {
    try {
      const { suiteId, triggeredBy } = request.body as any
      const testRun = await continuousSelfTesting.runTestSuite(suiteId, triggeredBy)
      return reply.send({ success: true, testRun })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/testing/run-suite' })
      return reply.status(500).send({ error: 'Failed to run test suite' })
    }
  })

  // Evolution Loop
  server.post('/api/evolution/execute-cycle', async (request, reply) => {
    try {
      const cycle = await nicholasCoreEvolution.executeEvolutionCycle()
      return reply.send({ success: true, cycle })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/evolution/execute-cycle' })
      return reply.status(500).send({ error: 'Failed to execute evolution cycle' })
    }
  })

  // Governance Frameworks
  server.post('/api/governance/grant-permission', async (request, reply) => {
    try {
      const { aiId, aiName, permission, resource, resourceType, grantedBy, expiresAt } = request.body as any
      const aiPermission = await governanceFrameworks.grantPermission(aiId, aiName, permission, resource, resourceType, grantedBy, expiresAt ? new Date(expiresAt) : undefined)
      return reply.send({ success: true, permission: aiPermission })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/governance/grant-permission' })
      return reply.status(500).send({ error: 'Failed to grant permission' })
    }
  })

  server.post('/api/governance/establish-trust', async (request, reply) => {
    try {
      const { fromAI, toAI, trustLevel, accessLevel, permissions } = request.body as any
      const relationship = await governanceFrameworks.establishTrust(fromAI, toAI, trustLevel, accessLevel, permissions)
      return reply.send({ success: true, relationship })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/governance/establish-trust' })
      return reply.status(500).send({ error: 'Failed to establish trust' })
    }
  })

  server.get('/api/governance/constitution', async (request, reply) => {
    try {
      const constitution = await governanceFrameworks.getConstitution()
      if (!constitution) return reply.status(404).send({ error: 'Constitution not found' })
      return reply.send({ success: true, constitution })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/governance/constitution' })
      return reply.status(500).send({ error: 'Failed to get constitution' })
    }
  })

  // Quantum Memory
  server.post('/api/memory/store', async (request, reply) => {
    try {
      const { type, content, priority, entities, relationships } = request.body as any
      const memory = await quantumMemoryAndHolographicMap.storeMemory(type, content, priority, entities, relationships)
      return reply.send({ success: true, memory })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/memory/store' })
      return reply.status(500).send({ error: 'Failed to store memory' })
    }
  })

  server.post('/api/memory/recall', async (request, reply) => {
    try {
      const { query } = request.body as any
      const recall = await quantumMemoryAndHolographicMap.instantRecall(query)
      return reply.send({ success: true, recall })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/memory/recall' })
      return reply.status(500).send({ error: 'Failed to recall memory' })
    }
  })

  server.post('/api/memory/entity', async (request, reply) => {
    try {
      const { type, name, description, properties } = request.body as any
      const entity = await quantumMemoryAndHolographicMap.createEntity(type, name, description, properties)
      return reply.send({ success: true, entity })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/memory/entity' })
      return reply.status(500).send({ error: 'Failed to create entity' })
    }
  })

  // Collective AI Integration
  server.post('/api/collective/connect', async (request, reply) => {
    try {
      const { platform, apiKey, endpoint } = request.body as any
      const connection = await collectiveAIIntegration.connectPlatform(platform, apiKey, endpoint)
      return reply.send({ success: true, connection })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/collective/connect' })
      return reply.status(500).send({ error: 'Failed to connect platform' })
    }
  })

  server.post('/api/collective/share', async (request, reply) => {
    try {
      const { platform, type, title, description, content, format, metadata } = request.body as any
      const knowledge = await collectiveAIIntegration.shareKnowledge(platform, type, title, description, content, format, metadata)
      return reply.send({ success: true, knowledge })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/collective/share' })
      return reply.status(500).send({ error: 'Failed to share knowledge' })
    }
  })

  server.post('/api/collective/learn', async (request, reply) => {
    try {
      const { platform, learningType, input, output, confidence } = request.body as any
      const learning = await collectiveAIIntegration.learnFromCollective(platform, learningType, input, output, confidence)
      return reply.send({ success: true, learning })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/collective/learn' })
      return reply.status(500).send({ error: 'Failed to learn from collective' })
    }
  })
}

