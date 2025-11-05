/**
 * Phase 8.1 - AI Rental Dashboard & Client Panel
 * 
 * Main entry point for Phase 8.1 modules
 */

import { FastifyInstance } from 'fastify'
import { clientPortalManager } from '../client/clientPortal'
import { ticketingManager } from '../tickets/ticketing'
import { notificationManager } from '../client/notifications'
import { clientSecurityManager } from '../client/security'
import { adminClientViewManager } from '../client/adminView'
import { registerClientRoutes } from '../client/clientRoutes'
import { registerSecurityRoutes } from '../client/securityRoutes'
import { registerAdminClientRoutes } from '../client/adminRoutes'
import { logError, logInfo } from '../config/logger'

export async function initializePhase8_1(server: FastifyInstance) {
  logInfo('🚀 Initializing Phase 8.1 - AI Rental Dashboard & Client Panel...')

  try {
    // Initialize managers
    await clientPortalManager.initialize()
    await ticketingManager.initialize()
    await notificationManager.initialize()
    await clientSecurityManager.initialize()
    await adminClientViewManager.initialize()

    // Register routes
    await registerClientRoutes(server)
    await registerSecurityRoutes(server)
    await registerAdminClientRoutes(server)

    logInfo('✅ Phase 8.1 - AI Rental Dashboard & Client Panel initialized (100%)')
  } catch (error) {
    logError(error as Error, { context: 'Phase 8.1 initialization' })
    logInfo('⚠️ Phase 8.1 not available, continuing without it')
  }
}

export {
  clientPortalManager,
  ticketingManager,
  notificationManager,
  clientSecurityManager,
  adminClientViewManager
}

