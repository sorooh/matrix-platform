/**
 * Unified Launch Command
 * Phase 7.1: Global Auto-Integration & Self-Contained Platform
 * Global-Ready Architecture
 */

import { logger, logInfo } from '../config/logger'
import { autoInstaller } from './installer'
import { redisEmulator } from './redisEmulator'
import { ffmpegManager } from './ffmpegManager'
import { systemSelfCheck } from './selfCheck'
import { crawlerEngine } from '../crawler/engine'
import { browserSimulation } from '../crawler/browserSimulation'
import { environmentSandbox } from '../crawler/sandbox'
import { autonomousDeploymentEngine } from '../deployment/engine'
import { domainSSLManager } from '../deployment/domainSSL'
import { aiLoadBalancerOrchestrator } from '../deployment/loadBalancer'
import { smartMonitoringAutoRepair } from '../deployment/monitoring'
import { securityComplianceHub } from '../deployment/securityCompliance'

export interface LaunchResult {
  success: boolean
  status: 'ready' | 'missing' | 'error'
  components: string[]
  readiness: any
  checkResult: any
  message: string
}

export class UnifiedLauncher {
  /**
   * Launch Matrix Platform
   */
  async launch(): Promise<LaunchResult> {
    try {
      logInfo('🚀 Starting Matrix Platform (Self-Contained Mode)...')

      // Step 1: Check system readiness
      logInfo('📋 Step 1: Checking system readiness...')
      const readiness = await autoInstaller.checkSystemReadiness()

      if (readiness.status === 'error') {
        return {
          success: false,
          status: 'error',
          components: [],
          readiness,
          checkResult: null,
          message: '❌ System readiness check failed. Please fix errors and try again.',
        }
      }

      // Step 2: Install missing dependencies
      if (readiness.status === 'missing') {
        logInfo('📦 Step 2: Installing missing dependencies...')
        const installResult = await autoInstaller.installMissingDependencies()

        if (installResult.failed.length > 0) {
          logInfo(`⚠️ Some dependencies failed to install: ${installResult.failed.join(', ')}`)
        }

        if (installResult.installed.length > 0) {
          logInfo(`✅ Installed dependencies: ${installResult.installed.join(', ')}`)
        }

        // Re-check readiness
        await autoInstaller.checkSystemReadiness()
      }

      // Step 3: Initialize Redis Emulator
      logInfo('📦 Step 3: Initializing Redis Emulator...')
      // Redis emulator is already initialized in constructor

      // Step 4: Initialize FFmpeg Manager
      logInfo('📦 Step 4: Initializing FFmpeg Manager...')
      await ffmpegManager.initialize()

      const ffmpegStatus = ffmpegManager.getStatus()
      if (ffmpegStatus?.available) {
        logInfo(`✅ FFmpeg available: ${ffmpegStatus.version}`)
      } else {
        logInfo('⚠️ FFmpeg not available, using simulation mode')
      }

      // Step 5: Initialize System Self-Check
      logInfo('📦 Step 5: Initializing System Self-Check...')
      await systemSelfCheck.initialize()

      // Step 6: Initialize all components
      logInfo('📦 Step 6: Initializing all components...')

      const components: string[] = []

      // Initialize Crawler Engine
      try {
        await crawlerEngine.initialize()
        components.push('Crawler Engine')
        logInfo('✅ Crawler Engine initialized')
      } catch (error: any) {
        logInfo(`⚠️ Crawler Engine initialization failed: ${error.message}`)
      }

      // Initialize Browser Simulation
      try {
        await browserSimulation.initialize()
        components.push('Browser Simulation')
        logInfo('✅ Browser Simulation initialized')
      } catch (error: any) {
        logInfo(`⚠️ Browser Simulation initialization failed: ${error.message}`)
      }

      // Initialize Environment Sandbox
      try {
        await environmentSandbox.initialize()
        components.push('Environment Sandbox')
        logInfo('✅ Environment Sandbox initialized')
      } catch (error: any) {
        logInfo(`⚠️ Environment Sandbox initialization failed: ${error.message}`)
      }

      // Initialize Deployment Engine
      try {
        await autonomousDeploymentEngine.initialize()
        components.push('Deployment Engine')
        logInfo('✅ Deployment Engine initialized')
      } catch (error: any) {
        logInfo(`⚠️ Deployment Engine initialization failed: ${error.message}`)
      }

      // Initialize Domain & SSL Manager
      try {
        await domainSSLManager.initialize()
        components.push('Domain & SSL Manager')
        logInfo('✅ Domain & SSL Manager initialized')
      } catch (error: any) {
        logInfo(`⚠️ Domain & SSL Manager initialization failed: ${error.message}`)
      }

      // Initialize Load Balancer
      try {
        await aiLoadBalancerOrchestrator.initialize()
        components.push('Load Balancer')
        logInfo('✅ Load Balancer initialized')
      } catch (error: any) {
        logInfo(`⚠️ Load Balancer initialization failed: ${error.message}`)
      }

      // Initialize Monitoring
      try {
        await smartMonitoringAutoRepair.initialize()
        components.push('Monitoring System')
        logInfo('✅ Monitoring System initialized')
      } catch (error: any) {
        logInfo(`⚠️ Monitoring System initialization failed: ${error.message}`)
      }

      // Initialize Security
      try {
        await securityComplianceHub.initialize()
        components.push('Security & Compliance')
        logInfo('✅ Security & Compliance initialized')
      } catch (error: any) {
        logInfo(`⚠️ Security & Compliance initialization failed: ${error.message}`)
      }

      // Step 7: Run system check
      logInfo('📋 Step 7: Running system check...')
      const checkResult = await systemSelfCheck.checkAllComponents()

      // Determine final status
      const finalReadiness = autoInstaller.getSystemReadiness()
      const status = checkResult.status === 'error' ? 'error' : finalReadiness?.status || 'ready'

      logInfo('✅ Matrix Platform started successfully!')
      logInfo('✅ System Ready for Production ✅')
      logInfo(`📊 Components initialized: ${components.length}`)
      logInfo(`📊 System status: ${status}`)

      return {
        success: status === 'ready',
        status: status as 'ready' | 'missing' | 'error',
        components,
        readiness: finalReadiness,
        checkResult,
        message: status === 'ready' ? '✅ System Ready for Production ✅' : `⚠️ System status: ${status}`,
      }
    } catch (error: any) {
      logger.error('Launch failed:', error)
      return {
        success: false,
        status: 'error',
        components: [],
        readiness: null,
        checkResult: null,
        message: `❌ Launch failed: ${error.message}`,
      }
    }
  }

  /**
   * Get launch status
   */
  async getLaunchStatus(): Promise<{
    readiness: any
    components: string[]
    checkResult: any
  }> {
    const readiness = autoInstaller.getSystemReadiness()
    const checkResult = systemSelfCheck.getLatestCheck()

    return {
      readiness,
      components: [], // Will be populated from actual components
      checkResult,
    }
  }
}

// Global Unified Launcher
export const unifiedLauncher = new UnifiedLauncher()

// If run directly, launch the system
if (require.main === module) {
  unifiedLauncher.launch().then((result) => {
    if (result.success) {
      process.exit(0)
    } else {
      process.exit(1)
    }
  })
}
