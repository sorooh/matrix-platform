/**
 * Phase 10.1 - Global Partnerships & Ecosystem Expansion
 * 
 * Central initialization for all Phase 10.1 modules
 */

import { FastifyInstance } from 'fastify'
import { logger, logInfo } from '../../config/logger'
import { integrationPartnerships } from '../integrations/integrationPartnerships'
import { globalPartnerNetwork } from '../partners/partnerNetwork'
import { publicAPIDeveloperGateway } from '../developer/apiGateway'
import { globalIntegrationsMarketplace } from '../marketplace/integrationsMarketplace'
import { globalPartnerCompliance } from '../partners/partnerCompliance'
import { registerPhase10_1Routes } from './routes'

export async function initializePhase10_1(server: FastifyInstance) {
  try {
    logInfo('🚀 Initializing Phase 10.1 - Global Partnerships & Ecosystem Expansion...')

    // Initialize all managers
    await integrationPartnerships.initialize()
    await globalPartnerNetwork.initialize()
    await publicAPIDeveloperGateway.initialize()
    await globalIntegrationsMarketplace.initialize()
    await globalPartnerCompliance.initialize()

    // Register routes
    await registerPhase10_1Routes(server)

    logInfo('✅ Phase 10.1 - Global Partnerships & Ecosystem Expansion initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize Phase 10.1:', error)
    throw error
  }
}

