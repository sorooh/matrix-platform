/**
 * Phase 8.4 - Developer Marketplace & AI Runtime
 * 
 * Central initialization for all Phase 8.4 modules
 */

import { FastifyInstance } from 'fastify'
import { logger, logInfo } from '../../config/logger'
import { aiRuntime } from '../runtime/aiRuntime'
import { developerManager } from '../developer/developerManager'
import { appPublisher } from '../developer/appPublisher'
import { revenueShareManager } from '../developer/revenueShare'
import { codeScanner } from '../codeScanner/codeScanner'
import { appStore } from '../appstore/appStore'
import { developerTools } from '../developer/devTools'
import { versioningManager } from '../developer/versioning'
import { registerPhase8_4Routes } from './routes'

export async function initializePhase8_4(server: FastifyInstance) {
  try {
    logInfo('🚀 Initializing Phase 8.4 - Developer Marketplace & AI Runtime...')

    // Initialize all managers
    await aiRuntime.initialize()
    await developerManager.initialize()
    await appPublisher.initialize()
    await revenueShareManager.initialize()
    await codeScanner.initialize()
    await appStore.initialize()
    await developerTools.initialize()
    await versioningManager.initialize()

    // Register routes
    await registerPhase8_4Routes(server)

    logInfo('✅ Phase 8.4 - Developer Marketplace & AI Runtime initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize Phase 8.4:', error)
    throw error
  }
}

