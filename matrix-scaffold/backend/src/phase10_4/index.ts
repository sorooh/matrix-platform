/**
 * Phase 10.4 - Professional Enhancements & Global Competition
 * 
 * Central initialization for all Phase 10.4 modules
 */

import { FastifyInstance } from 'fastify'
import { logger, logInfo } from '../../config/logger'
import { advancedSecuritySuite } from '../security/advancedSecurity'
import { performanceOptimizationEngine } from '../performance/optimizationEngine'
import { observabilityStack } from '../observability/observabilityStack'
import { developerExperiencePlatform } from '../developer/developerExperience'
import { businessIntelligenceAnalytics } from '../business/businessIntelligence'
import { registerPhase10_4Routes } from './routes'

export async function initializePhase10_4(server: FastifyInstance) {
  try {
    logInfo('🚀 Initializing Phase 10.4 - Professional Enhancements & Global Competition...')

    // Initialize all managers
    await advancedSecuritySuite.initialize()
    await performanceOptimizationEngine.initialize()
    await observabilityStack.initialize()
    await developerExperiencePlatform.initialize()
    await businessIntelligenceAnalytics.initialize()

    // Register routes
    await registerPhase10_4Routes(server)

    logInfo('✅ Phase 10.4 - Professional Enhancements & Global Competition initialized successfully')
    logInfo('🌍 Matrix is now globally competitive!')
  } catch (error) {
    logger.error('Failed to initialize Phase 10.4:', error)
    throw error
  }
}

