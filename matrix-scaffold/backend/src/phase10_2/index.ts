/**
 * Phase 10.2 - Collective Intelligence & Cross-Universe Synchronization
 * 
 * Central initialization for all Phase 10.2 modules
 */

import { FastifyInstance } from 'fastify'
import { logger, logInfo } from '../../config/logger'
import { collectiveSyncProtocol } from '../collective/syncProtocol'
import { matrixKnowledgeFederation } from '../federation/knowledgeFederation'
import { nicholasAdaptiveGovernance } from '../governance/adaptiveGovernance'
import { metaLearningEngine } from '../metamachine/metaLearning'
import { crossUniverseSynchronization } from '../federation/universeSync'
import { registerPhase10_2Routes } from './routes'

export async function initializePhase10_2(server: FastifyInstance) {
  try {
    logInfo('🚀 Initializing Phase 10.2 - Collective Intelligence & Cross-Universe Synchronization...')

    // Initialize all managers
    await collectiveSyncProtocol.initialize()
    await matrixKnowledgeFederation.initialize()
    await nicholasAdaptiveGovernance.initialize()
    await metaLearningEngine.initialize()
    await crossUniverseSynchronization.initialize()

    // Register routes
    await registerPhase10_2Routes(server)

    logInfo('✅ Phase 10.2 - Collective Intelligence & Cross-Universe Synchronization initialized successfully')
    logInfo('🌌 Matrix is now a global collective intelligence network!')
  } catch (error) {
    logger.error('Failed to initialize Phase 10.2:', error)
    throw error
  }
}

