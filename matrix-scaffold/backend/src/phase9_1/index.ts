/**
 * Phase 9.1 - Global Compliance & Legal Standards
 * 
 * Central initialization for all Phase 9.1 modules
 */

import { FastifyInstance } from 'fastify'
import { logger, logInfo } from '../../config/logger'
import { globalComplianceEngine } from '../compliance/globalCompliance'
import { dataResidencyManager } from '../compliance/dataResidency'
import { securityCertificationManager } from '../compliance/certificationManager'
import { legalDocumentationCenter } from '../legal/documentationCenter'
import { auditAndTraceabilitySystem } from '../audit/auditSystem'
import { ethicalAIGovernance } from '../aiGovernance/ethicalGovernance'
import { registerPhase9_1Routes } from './routes'

export async function initializePhase9_1(server: FastifyInstance) {
  try {
    logInfo('🚀 Initializing Phase 9.1 - Global Compliance & Legal Standards...')

    // Initialize all managers
    await globalComplianceEngine.initialize()
    await dataResidencyManager.initialize()
    await securityCertificationManager.initialize()
    await legalDocumentationCenter.initialize()
    await auditAndTraceabilitySystem.initialize()
    await ethicalAIGovernance.initialize()

    // Register routes
    await registerPhase9_1Routes(server)

    logInfo('✅ Phase 9.1 - Global Compliance & Legal Standards initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize Phase 9.1:', error)
    throw error
  }
}
