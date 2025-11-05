/**
 * Phase 8.2 - Partner & Reseller Portal
 * 
 * Main entry point for Phase 8.2 modules
 */

import { FastifyInstance } from 'fastify'
import { partnerPortalManager } from '../partner/partnerPortal'
import { resellerManager } from '../partner/reseller'
import { commissionManager } from '../partner/commission'
import { partnerAPIGatewayManager } from '../partner/apiGateway'
import { multiBrandManager } from '../partner/multiBrand'
import { partnerAnalyticsManager } from '../partner/analytics'
import { partnerGovernanceManager } from '../partner/governance'
import { registerPartnerRoutes } from '../partner/partnerRoutes'
import { logError, logInfo } from '../config/logger'

export async function initializePhase8_2(server: FastifyInstance) {
  logInfo('🚀 Initializing Phase 8.2 - Partner & Reseller Portal...')

  try {
    // Initialize managers
    await partnerPortalManager.initialize()
    await resellerManager.initialize()
    await commissionManager.initialize()
    await partnerAPIGatewayManager.initialize()
    await multiBrandManager.initialize()
    await partnerAnalyticsManager.initialize()
    await partnerGovernanceManager.initialize()

    // Register routes
    await registerPartnerRoutes(server)

    logInfo('✅ Phase 8.2 - Partner & Reseller Portal initialized (100%)')
  } catch (error) {
    logError(error as Error, { context: 'Phase 8.2 initialization' })
    logInfo('⚠️ Phase 8.2 not available, continuing without it')
  }
}

export {
  partnerPortalManager,
  resellerManager,
  commissionManager,
  partnerAPIGatewayManager,
  multiBrandManager,
  partnerAnalyticsManager,
  partnerGovernanceManager
}

