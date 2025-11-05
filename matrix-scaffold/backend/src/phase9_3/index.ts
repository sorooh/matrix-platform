/**
 * Phase 9.3 - Professional Enhancements & Global Competition Features
 * 
 * Central initialization for all Phase 9.3 modules
 */

import { FastifyInstance } from 'fastify'
import { logger, logInfo } from '../../config/logger'
import { advancedAutoScaling } from '../scaling/autoScaling'
import { disasterRecoveryManager } from '../disaster/disasterRecovery'
import { advancedComplianceAutomation } from '../compliance/advancedCompliance'
import { mlPredictionsEngine } from '../ml/predictions'
import { costOptimizationManager } from '../cost/costOptimization'
import { performanceBenchmarking } from '../benchmarking/performanceBenchmarking'
import { competitiveIntelligence } from '../intelligence/competitiveIntelligence'
import { registerPhase9_3Routes } from './routes'

export async function initializePhase9_3(server: FastifyInstance) {
  try {
    logInfo('🚀 Initializing Phase 9.3 - Professional Enhancements & Global Competition Features...')

    // Initialize all managers
    await advancedAutoScaling.initialize()
    await disasterRecoveryManager.initialize()
    await advancedComplianceAutomation.initialize()
    await mlPredictionsEngine.initialize()
    await costOptimizationManager.initialize()
    await performanceBenchmarking.initialize()
    await competitiveIntelligence.initialize()

    // Register routes
    await registerPhase9_3Routes(server)

    logInfo('✅ Phase 9.3 - Professional Enhancements & Global Competition Features initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize Phase 9.3:', error)
    throw error
  }
}

