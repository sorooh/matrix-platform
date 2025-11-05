/**
 * Phase 10 - Autonomous Evolution & Governance
 * 
 * Central initialization for all Phase 10 modules
 */

import { FastifyInstance } from 'fastify'
import { logger, logInfo } from '../../config/logger'
import { selfCodingAndAutoRepair } from '../selfcoding/autoRepair'
import { continuousSelfTesting } from '../selftesting/continuousTesting'
import { nicholasCoreEvolution } from '../evolution/nicholasCore'
import { governanceFrameworks } from '../governance/governanceFrameworks'
import { quantumMemoryAndHolographicMap } from '../memory/quantumMemory'
import { collectiveAIIntegration } from '../collective/aiIntegration'
import { registerPhase10Routes } from './routes'

export async function initializePhase10(server: FastifyInstance) {
  try {
    logInfo('🚀 Initializing Phase 10 - Autonomous Evolution & Governance...')

    // Initialize all managers
    await selfCodingAndAutoRepair.initialize()
    await continuousSelfTesting.initialize()
    await nicholasCoreEvolution.initialize()
    await governanceFrameworks.initialize()
    await quantumMemoryAndHolographicMap.initialize()
    await collectiveAIIntegration.initialize()

    // Register routes
    await registerPhase10Routes(server)

    logInfo('✅ Phase 10 - Autonomous Evolution & Governance initialized successfully')
    logInfo('🌌 Matrix is now fully autonomous and self-evolving!')
  } catch (error) {
    logger.error('Failed to initialize Phase 10:', error)
    throw error
  }
}

