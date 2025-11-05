/**
 * Phase 10.3 - User Experience & Public Interface
 * 
 * Central initialization for all Phase 10.3 modules
 */

import { FastifyInstance } from 'fastify'
import { logger, logInfo } from '../../config/logger'
import { uiDesignSystem } from '../ui/uiDesignSystem'
import { documentationCenter } from '../documentation/documentationCenter'
import { communitySupportSystem } from '../community/communitySupport'
import { flexibleAPIsSystem } from '../api/flexibleAPIs'
import { customizationFeatures } from '../customization/customizationFeatures'
import { trainingWorkshopsSystem } from '../training/trainingWorkshops'
import { continuousImprovementSystem } from '../improvement/continuousImprovement'
import { registerPhase10_3Routes } from './routes'

export async function initializePhase10_3(server: FastifyInstance) {
  try {
    logInfo('🚀 Initializing Phase 10.3 - User Experience & Public Interface...')

    // Initialize all managers
    await uiDesignSystem.initialize()
    await documentationCenter.initialize()
    await communitySupportSystem.initialize()
    await flexibleAPIsSystem.initialize()
    await customizationFeatures.initialize()
    await trainingWorkshopsSystem.initialize()
    await continuousImprovementSystem.initialize()

    // Register routes
    await registerPhase10_3Routes(server)

    logInfo('✅ Phase 10.3 - User Experience & Public Interface initialized successfully')
    logInfo('🌍 Matrix is now accessible to everyone!')
  } catch (error) {
    logger.error('Failed to initialize Phase 10.3:', error)
    throw error
  }
}

