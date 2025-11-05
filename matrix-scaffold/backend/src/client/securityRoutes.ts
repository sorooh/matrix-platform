/**
 * Phase 8.1 - Security API Routes
 * 
 * Client security endpoints
 */

import { FastifyInstance } from 'fastify'
import { clientSecurityManager } from './security'
import { clientPortalManager } from './clientPortal'
import { logError, logInfo } from '../config/logger'

export async function registerSecurityRoutes(server: FastifyInstance) {
  logInfo('Registering Security API routes...')

  // 2FA endpoints
  server.post('/api/client/security/2fa/enable', async (request, reply) => {
    try {
      const { userId } = request.body as any
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' })
      }

      const result = await clientSecurityManager.enable2FA(userId)
      return { success: true, ...result }
    } catch (error) {
      logError(error as Error, { context: 'Enable 2FA' })
      return reply.status(500).send({ error: 'Failed to enable 2FA' })
    }
  })

  server.post('/api/client/security/2fa/disable', async (request, reply) => {
    try {
      const { userId } = request.body as any
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' })
      }

      const success = await clientSecurityManager.disable2FA(userId)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Disable 2FA' })
      return reply.status(500).send({ error: 'Failed to disable 2FA' })
    }
  })

  server.post('/api/client/security/2fa/verify', async (request, reply) => {
    try {
      const { userId, code } = request.body as any
      if (!userId || !code) {
        return reply.status(400).send({ error: 'User ID and code required' })
      }

      const valid = await clientSecurityManager.verify2FA(userId, code)
      return { success: valid }
    } catch (error) {
      logError(error as Error, { context: 'Verify 2FA' })
      return reply.status(500).send({ error: 'Failed to verify 2FA' })
    }
  })

  server.get('/api/client/security/2fa/status', async (request, reply) => {
    try {
      const { userId } = request.query as any
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' })
      }

      const status = await clientSecurityManager.get2FAStatus(userId)
      return { success: true, status }
    } catch (error) {
      logError(error as Error, { context: 'Get 2FA status' })
      return reply.status(500).send({ error: 'Failed to get 2FA status' })
    }
  })

  server.get('/api/client/security/2fa/backup-codes', async (request, reply) => {
    try {
      const { userId } = request.query as any
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' })
      }

      const codes = await clientSecurityManager.getBackupCodes(userId)
      return { success: true, codes }
    } catch (error) {
      logError(error as Error, { context: 'Get backup codes' })
      return reply.status(500).send({ error: 'Failed to get backup codes' })
    }
  })

  server.post('/api/client/security/2fa/regenerate-backup-codes', async (request, reply) => {
    try {
      const { userId } = request.body as any
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' })
      }

      const codes = await clientSecurityManager.regenerateBackupCodes(userId)
      return { success: true, codes }
    } catch (error) {
      logError(error as Error, { context: 'Regenerate backup codes' })
      return reply.status(500).send({ error: 'Failed to regenerate backup codes' })
    }
  })

  // Password management
  server.post('/api/client/security/password/change', async (request, reply) => {
    try {
      const { userId, oldPassword, newPassword } = request.body as any
      if (!userId || !oldPassword || !newPassword) {
        return reply.status(400).send({ error: 'User ID, old password, and new password required' })
      }

      const success = await clientSecurityManager.changePassword(userId, oldPassword, newPassword)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Change password' })
      return reply.status(500).send({ error: 'Failed to change password' })
    }
  })

  logInfo('✅ Security API routes registered')
}

