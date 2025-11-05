/**
 * Phase 8.5 - Matrix Intelligence Federation & Internal Economy
 * 
 * Central initialization for all Phase 8.5 modules
 */

import { FastifyInstance } from 'fastify'
import { logger, logInfo } from '../../config/logger'
import { aiFederation } from '../federation/aiFederation'
import { matrixCoinManager } from '../economy/matrixCoin'
import { aiContractManager } from '../contracts/aiContractManager'
import { crossAppIntegration } from '../federation/crossAppIntegration'
import { aiReputationManager } from '../reputation/aiReputation'
import { governanceConsole } from '../console/governanceConsole'
import { registerPhase8_5Routes } from './routes'

export async function initializePhase8_5(server: FastifyInstance) {
  try {
    logInfo('🚀 Initializing Phase 8.5 - Matrix Intelligence Federation & Internal Economy...')

    // Initialize all managers
    await aiFederation.initialize()
    await matrixCoinManager.initialize()
    await aiContractManager.initialize()
    await crossAppIntegration.initialize()
    await aiReputationManager.initialize()
    await governanceConsole.initialize()

    // Register routes
    await registerPhase8_5Routes(server)

    logInfo('✅ Phase 8.5 - Matrix Intelligence Federation & Internal Economy initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize Phase 8.5:', error)
    throw error
  }
}

