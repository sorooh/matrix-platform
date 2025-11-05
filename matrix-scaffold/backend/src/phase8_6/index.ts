/**
 * Phase 8.6 - Professional Enhancements & Global Competition Features
 * 
 * Central initialization for all Phase 8.6 modules
 */

import { FastifyInstance } from 'fastify'
import { logger, logInfo } from '../../config/logger'
import { advancedBilling } from '../billing/advancedBilling'
import { webSocketManager } from '../realtime/websocketManager'
import { advancedSearch } from '../search/advancedSearch'
import { cicdManager } from '../cicd/cicdManager'
import { complianceManager } from '../compliance/complianceManager'
import { performanceOptimizer } from '../performance/performanceOptimizer'
import { advancedMonitoring } from '../monitoring/advancedMonitoring'
import { mlAnalytics } from '../analytics/mlAnalytics'
import { registerPhase8_6Routes } from './routes'

export async function initializePhase8_6(server: FastifyInstance) {
  try {
    logInfo('🚀 Initializing Phase 8.6 - Professional Enhancements & Global Competition Features...')

    // Initialize all managers
    await advancedBilling.initialize()
    await webSocketManager.initialize(server.server)
    await advancedSearch.initialize()
    await cicdManager.initialize()
    await complianceManager.initialize()
    await performanceOptimizer.initialize()
    await advancedMonitoring.initialize()
    await mlAnalytics.initialize()

    // Start WebSocket cleanup
    webSocketManager.startCleanupInterval()

    // Register routes
    await registerPhase8_6Routes(server)

    logInfo('✅ Phase 8.6 - Professional Enhancements & Global Competition Features initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize Phase 8.6:', error)
    throw error
  }
}

