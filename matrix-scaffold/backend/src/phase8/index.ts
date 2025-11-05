/**
 * Phase 8 - AI Rental & Commercial Deployment
 * 
 * Main entry point for Phase 8 modules
 */

import { FastifyInstance } from 'fastify'
import { subscriptionManager, paymentProviderManager } from '../billing/subscription'
import { usageTracker } from '../billing/usageTracker'
import { apiGatewayManager } from '../gateway/apiGateway'
import { marketplaceManager } from '../marketplace/marketplace'
import { privateInstanceManager } from '../instances/privateInstance'
import { governanceManager } from '../licensing/governance'
import { registerBillingRoutes } from '../billing/billingRoutes'
import { registerGatewayRoutes } from '../gateway/gatewayRoutes'
import { registerMarketplaceRoutes } from '../marketplace/marketplaceRoutes'
import { registerInstanceRoutes } from '../instances/instanceRoutes'
import { registerLicensingRoutes } from '../licensing/licensingRoutes'
import { logError, logInfo } from '../config/logger'

export async function initializePhase8(server: FastifyInstance) {
  logInfo('🚀 Initializing Phase 8 - AI Rental & Commercial Deployment...')

  try {
    // Initialize managers
    await subscriptionManager.initialize()
    await paymentProviderManager.initialize()
    await usageTracker.initialize()
    await apiGatewayManager.initialize()
    await marketplaceManager.initialize()
    await privateInstanceManager.initialize()
    await governanceManager.initialize()

    // Register routes
    await registerBillingRoutes(server)
    await registerGatewayRoutes(server)
    await registerMarketplaceRoutes(server)
    await registerInstanceRoutes(server)
    await registerLicensingRoutes(server)

    logInfo('✅ Phase 8 - AI Rental & Commercial Deployment initialized (100%)')
  } catch (error) {
    logError(error as Error, { context: 'Phase 8 initialization' })
    logInfo('⚠️ Phase 8 not available, continuing without it')
  }
}

export {
  subscriptionManager,
  paymentProviderManager,
  usageTracker,
  apiGatewayManager,
  marketplaceManager,
  privateInstanceManager,
  governanceManager
}

