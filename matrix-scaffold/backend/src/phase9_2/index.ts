/**
 * Phase 9.2 - Matrix Core Governance & Self-Evolution Systems
 * 
 * Central initialization for all Phase 9.2 modules
 */

import { FastifyInstance } from 'fastify'
import { logger, logInfo } from '../../config/logger'
import { matrixEvolutionAndInnovation } from '../evolution/innovationDepartment'
import { applicationsAndPartnerEvolution } from '../evolution/partnerEvolution'
import { matrixCyberDefenseCenter } from '../cyberdefense/defenseCenter'
import { matrixRightsAndResponsibilities } from '../rights/rightsFramework'
import { matrixPublicIdentityCenter } from '../identity/publicIdentity'
import { matrixLicensingDepartment } from '../licensing/licensingDepartment'
import { smartLegalContractsEngine } from '../contracts/legalContracts'
import { registerPhase9_2Routes } from './routes'

export async function initializePhase9_2(server: FastifyInstance) {
  try {
    logInfo('🚀 Initializing Phase 9.2 - Matrix Core Governance & Self-Evolution Systems...')

    // Initialize all managers
    await matrixEvolutionAndInnovation.initialize()
    await applicationsAndPartnerEvolution.initialize()
    await matrixCyberDefenseCenter.initialize()
    await matrixRightsAndResponsibilities.initialize()
    await matrixPublicIdentityCenter.initialize()
    await matrixLicensingDepartment.initialize()
    await smartLegalContractsEngine.initialize()

    // Register routes
    await registerPhase9_2Routes(server)

    logInfo('✅ Phase 9.2 - Matrix Core Governance & Self-Evolution Systems initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize Phase 9.2:', error)
    throw error
  }
}

