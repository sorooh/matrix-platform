/**
 * Phase 9 - Global Deployment & Domains Network
 * 
 * Central initialization for all Phase 9 modules
 */

import { FastifyInstance } from 'fastify'
import { logger, logInfo } from '../../config/logger'
import { globalDeploymentEngine } from '../deployment/globalDeployment'
import { domainsNetworkManager } from '../domains/domainsManager'
import { edgeDistributionLayer } from '../cdn/edgeDistribution'
import { globalMonitoringAndFailover } from '../global/monitoringAndFailover'
import { regionalPricingAndLocalization } from '../regional/pricingAndLocalization'
import { publicAccessGateway } from '../public/publicGateway'
import { registerPhase9Routes } from './routes'

export async function initializePhase9(server: FastifyInstance) {
  try {
    logInfo('🚀 Initializing Phase 9 - Global Deployment & Domains Network...')

    // Initialize all managers
    await globalDeploymentEngine.initialize()
    await domainsNetworkManager.initialize()
    await edgeDistributionLayer.initialize()
    await globalMonitoringAndFailover.initialize()
    await regionalPricingAndLocalization.initialize()
    await publicAccessGateway.initialize()

    // Register routes
    await registerPhase9Routes(server)

    logInfo('✅ Phase 9 - Global Deployment & Domains Network initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize Phase 9:', error)
    throw error
  }
}

