/**
 * Phase 8.4 - Routes
 * 
 * All API routes for Phase 8.4 features
 */

import { FastifyInstance } from 'fastify'
import { logger, logError } from '../../config/logger'
import { aiRuntime } from '../runtime/aiRuntime'
import { developerManager } from '../developer/developerManager'
import { appPublisher } from '../developer/appPublisher'
import { revenueShareManager } from '../developer/revenueShare'
import { codeScanner } from '../codeScanner/codeScanner'
import { appStore } from '../appstore/appStore'
import { developerTools } from '../developer/devTools'
import { versioningManager } from '../developer/versioning'

export async function registerPhase8_4Routes(server: FastifyInstance) {
  // Developer Registration
  server.post('/api/developer/register', async (request, reply) => {
    try {
      const { userId, email, name, company } = request.body as any
      const developer = await developerManager.registerDeveloper(userId, email, name, company)
      return reply.send({ success: true, developer })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/developer/register' })
      return reply.status(500).send({ error: 'Failed to register developer' })
    }
  })

  server.post('/api/developer/verify-email', async (request, reply) => {
    try {
      const { developerId } = request.body as any
      const verified = await developerManager.verifyEmail(developerId)
      return reply.send({ success: true, verified })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/developer/verify-email' })
      return reply.status(500).send({ error: 'Failed to verify email' })
    }
  })

  server.post('/api/developer/kyc', async (request, reply) => {
    try {
      const { developerId, kycData } = request.body as any
      const verified = await developerManager.submitKYC(developerId, kycData)
      return reply.send({ success: true, verified })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/developer/kyc' })
      return reply.status(500).send({ error: 'Failed to submit KYC' })
    }
  })

  // App Publishing
  server.post('/api/developer/apps', async (request, reply) => {
    try {
      const { developerId, name, description, category, pricing } = request.body as any
      const app = await appPublisher.createApp(developerId, name, description, category, pricing)
      return reply.send({ success: true, app })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/developer/apps' })
      return reply.status(500).send({ error: 'Failed to create app' })
    }
  })

  server.post('/api/developer/apps/:appId/submit', async (request, reply) => {
    try {
      const { appId } = request.params as any
      const submitted = await appPublisher.submitForReview(appId)
      return reply.send({ success: true, submitted })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/developer/apps/:appId/submit' })
      return reply.status(500).send({ error: 'Failed to submit app' })
    }
  })

  server.post('/api/developer/apps/:appId/publish', async (request, reply) => {
    try {
      const { appId } = request.params as any
      const published = await appPublisher.publishApp(appId)
      return reply.send({ success: true, published })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/developer/apps/:appId/publish' })
      return reply.status(500).send({ error: 'Failed to publish app' })
    }
  })

  // App Store
  server.get('/api/appstore/apps', async (request, reply) => {
    try {
      const { category, sortBy, limit } = request.query as any
      const apps = await appStore.getApps(category, sortBy, parseInt(limit) || 50)
      return reply.send({ success: true, apps })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/appstore/apps' })
      return reply.status(500).send({ error: 'Failed to get apps' })
    }
  })

  server.get('/api/appstore/apps/:appId', async (request, reply) => {
    try {
      const { appId } = request.params as any
      const app = await appStore.getAppDetails(appId)
      if (!app) return reply.status(404).send({ error: 'App not found' })
      return reply.send({ success: true, app })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/appstore/apps/:appId' })
      return reply.status(500).send({ error: 'Failed to get app' })
    }
  })

  server.post('/api/appstore/apps/:appId/install', async (request, reply) => {
    try {
      const { appId } = request.params as any
      const { userId, version } = request.body as any
      const installation = await appStore.installApp(appId, userId, version)
      return reply.send({ success: true, installation })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/appstore/apps/:appId/install' })
      return reply.status(500).send({ error: 'Failed to install app' })
    }
  })

  server.post('/api/appstore/apps/:appId/reviews', async (request, reply) => {
    try {
      const { appId } = request.params as any
      const { userId, rating, title, comment } = request.body as any
      const review = await appStore.createReview(appId, userId, rating, title, comment)
      return reply.send({ success: true, review })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/appstore/apps/:appId/reviews' })
      return reply.status(500).send({ error: 'Failed to create review' })
    }
  })

  // Runtime
  server.post('/api/runtime/instances', async (request, reply) => {
    try {
      const { appId, developerId, version, runtimeConfig } = request.body as any
      const instance = await aiRuntime.createInstance(appId, developerId, version, runtimeConfig)
      return reply.send({ success: true, instance })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/runtime/instances' })
      return reply.status(500).send({ error: 'Failed to create instance' })
    }
  })

  server.get('/api/runtime/instances/:instanceId', async (request, reply) => {
    try {
      const { instanceId } = request.params as any
      const instance = await aiRuntime.getInstance(instanceId)
      if (!instance) return reply.status(404).send({ error: 'Instance not found' })
      return reply.send({ success: true, instance })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/runtime/instances/:instanceId' })
      return reply.status(500).send({ error: 'Failed to get instance' })
    }
  })

  server.post('/api/runtime/instances/:instanceId/execute', async (request, reply) => {
    try {
      const { instanceId } = request.params as any
      const { method, path, body, headers } = request.body as any
      const result = await aiRuntime.executeRequest(instanceId, method, path, body, headers)
      return reply.send({ success: true, result })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/runtime/instances/:instanceId/execute' })
      return reply.status(500).send({ error: 'Failed to execute request' })
    }
  })

  // Revenue Sharing
  server.get('/api/developer/wallet', async (request, reply) => {
    try {
      const { developerId } = request.query as any
      const wallet = await revenueShareManager.getWallet(developerId)
      if (!wallet) return reply.status(404).send({ error: 'Wallet not found' })
      return reply.send({ success: true, wallet })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/developer/wallet' })
      return reply.status(500).send({ error: 'Failed to get wallet' })
    }
  })

  server.get('/api/developer/revenue', async (request, reply) => {
    try {
      const { developerId, limit } = request.query as any
      const shares = await revenueShareManager.getRevenueShares(developerId, parseInt(limit) || 100)
      return reply.send({ success: true, shares })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/developer/revenue' })
      return reply.status(500).send({ error: 'Failed to get revenue shares' })
    }
  })

  server.post('/api/developer/withdrawals', async (request, reply) => {
    try {
      const { developerId, amount, currency, paymentMethod, walletAddress, bankAccount } = request.body as any
      const withdrawal = await revenueShareManager.createWithdrawal(
        developerId,
        amount,
        currency,
        paymentMethod,
        walletAddress,
        bankAccount
      )
      if (!withdrawal) return reply.status(400).send({ error: 'Failed to create withdrawal' })
      return reply.send({ success: true, withdrawal })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/developer/withdrawals' })
      return reply.status(500).send({ error: 'Failed to create withdrawal' })
    }
  })

  // Code Scanner
  server.post('/api/developer/apps/:appId/scan', async (request, reply) => {
    try {
      const { appId } = request.params as any
      const { version, sourceCode } = request.body as any
      const scanResult = await codeScanner.scanApp(appId, version, sourceCode)
      return reply.send({ success: true, scanResult })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/developer/apps/:appId/scan' })
      return reply.status(500).send({ error: 'Failed to scan app' })
    }
  })

  // Developer Tools
  server.get('/api/developer/tools/cli', async (request, reply) => {
    try {
      const cli = developerTools.generateCLI()
      reply.type('text/plain')
      return reply.send(cli)
    } catch (error) {
      logError(error as Error, { context: 'GET /api/developer/tools/cli' })
      return reply.status(500).send({ error: 'Failed to generate CLI' })
    }
  })

  server.get('/api/developer/tools/sdk/:language', async (request, reply) => {
    try {
      const { language } = request.params as any
      const sdk = developerTools.generateSDK(language)
      reply.type('text/plain')
      return reply.send(sdk)
    } catch (error) {
      logError(error as Error, { context: 'GET /api/developer/tools/sdk/:language' })
      return reply.status(500).send({ error: 'Failed to generate SDK' })
    }
  })

  // Versioning
  server.post('/api/developer/apps/:appId/versions', async (request, reply) => {
    try {
      const { appId } = request.params as any
      const { version, sourceCode, compatibility, changelog } = request.body as any
      const appVersion = await versioningManager.createVersion(appId, version, sourceCode, compatibility, changelog)
      return reply.send({ success: true, version: appVersion })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/developer/apps/:appId/versions' })
      return reply.status(500).send({ error: 'Failed to create version' })
    }
  })

  server.get('/api/developer/apps/:appId/versions', async (request, reply) => {
    try {
      const { appId } = request.params as any
      const versions = await versioningManager.getVersionsByApp(appId)
      return reply.send({ success: true, versions })
    } catch (error) {
      logError(error as Error, { context: 'GET /api/developer/apps/:appId/versions' })
      return reply.status(500).send({ error: 'Failed to get versions' })
    }
  })
}

