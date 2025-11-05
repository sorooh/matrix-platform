/**
 * Phase 8.3 - Enterprise Enhancements
 * 
 * Central initialization for all Phase 8.3 modules
 */

import { FastifyInstance } from 'fastify'
import { logger, logInfo } from '../../config/logger'
import { advancedWebhookSystem } from '../webhooks/webhookSystem'
import { taxManager } from '../tax/taxManager'
import { refundManager } from '../refunds/refundManager'
import { slaManager } from '../sla/slaManager'
import { currencyManager } from '../currency/currencyManager'
import { advancedSecurityManager } from '../security/advancedSecurity'
import { advancedAnalyticsManager } from '../analytics/advancedAnalytics'
import { costOptimizer } from '../optimization/costOptimizer'
import { initializeAPIDocumentation } from '../api/apiDocs'
import { registerPhase8_3Routes } from './routes'

export async function initializePhase8_3(server: FastifyInstance) {
  try {
    logInfo('🚀 Initializing Phase 8.3 - Enterprise Enhancements...')

    // Initialize all managers
    await advancedWebhookSystem.initialize()
    await taxManager.initialize()
    await refundManager.initialize()
    await slaManager.initialize()
    await currencyManager.initialize()
    await advancedSecurityManager.initialize()
    await advancedAnalyticsManager.initialize()
    await costOptimizer.initialize()

    // Initialize API documentation
    await initializeAPIDocumentation(server)

    // Register routes
    await registerPhase8_3Routes(server)

    logInfo('✅ Phase 8.3 - Enterprise Enhancements initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize Phase 8.3:', error)
    throw error
  }
}

