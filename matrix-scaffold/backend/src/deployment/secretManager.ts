/**
 * Advanced Secret Management
 * Phase 7.2: Professional Enhancements
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import crypto from 'crypto'

export type SecretProvider = 'vault' | 'aws' | 'azure' | 'gcp' | 'internal'

export interface Secret {
  id: string
  name: string
  value: string
  provider: SecretProvider
  type: 'password' | 'api-key' | 'certificate' | 'token' | 'other'
  metadata: Record<string, unknown>
  version: number
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
  rotationEnabled: boolean
  rotationInterval?: number // days
  lastRotatedAt?: Date
  accessControl: {
    roles: string[]
    users: string[]
  }
}

export interface SecretRotation {
  id: string
  secretId: string
  oldVersion: number
  newVersion: number
  rotatedAt: Date
  rotatedBy: string
  status: 'success' | 'failed'
  error?: string
}

export interface SecretAccess {
  id: string
  secretId: string
  userId: string
  action: 'read' | 'write' | 'delete'
  timestamp: Date
  ipAddress?: string
  userAgent?: string
}

export class AdvancedSecretManager {
  private secrets: Map<string, Secret> = new Map()
  private rotations: Map<string, SecretRotation> = new Map()
  private accessLogs: SecretAccess[] = []
  private encryptionKey: Buffer

  constructor() {
    // In production, use a secure key management system
    this.encryptionKey = crypto.randomBytes(32)
  }

  /**
   * Initialize Secret Manager
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Advanced Secret Manager initialized')
    } catch (error: any) {
      logger.error('Secret Manager initialization failed:', error)
      throw error
    }
  }

  /**
   * Create secret
   */
  async createSecret(config: {
    name: string
    value: string
    provider?: SecretProvider
    type?: Secret['type']
    metadata?: Record<string, unknown>
    expiresAt?: Date
    rotationEnabled?: boolean
    rotationInterval?: number
    accessControl?: Secret['accessControl']
  }): Promise<string> {
    try {
      const secretId = `secret-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      // Encrypt secret value
      const encryptedValue = this.encrypt(config.value)

      const secret: Secret = {
        id: secretId,
        name: config.name,
        value: encryptedValue,
        provider: config.provider || 'internal',
        type: config.type || 'other',
        metadata: config.metadata || {},
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: config.expiresAt,
        rotationEnabled: config.rotationEnabled || false,
        rotationInterval: config.rotationInterval,
        accessControl: config.accessControl || {
          roles: [],
          users: [],
        },
      }

      this.secrets.set(secretId, secret)

      logger.info('Secret created', {
        secretId,
        name: config.name,
        provider: secret.provider,
      })

      eventBus.publish('deployment.secret.created', {
        secret: {
          id: secret.id,
          name: secret.name,
          provider: secret.provider,
        },
      })

      return secretId
    } catch (error: any) {
      logger.error('Create secret failed:', error)
      throw error
    }
  }

  /**
   * Get secret
   */
  async getSecret(secretId: string, userId?: string): Promise<Secret | null> {
    try {
      const secret = this.secrets.get(secretId)
      if (!secret) {
        return null
      }

      // Check access control
      if (userId && !this.hasAccess(secret, userId, 'read')) {
        throw new Error('Access denied')
      }

      // Log access
      this.logAccess(secretId, userId || 'system', 'read')

      return secret
    } catch (error: any) {
      logger.error('Get secret failed:', error)
      throw error
    }
  }

  /**
   * Get secret value (decrypted)
   */
  async getSecretValue(secretId: string, userId?: string): Promise<string | null> {
    try {
      const secret = await this.getSecret(secretId, userId)
      if (!secret) {
        return null
      }

      // Decrypt value
      const decryptedValue = this.decrypt(secret.value)

      return decryptedValue
    } catch (error: any) {
      logger.error('Get secret value failed:', error)
      throw error
    }
  }

  /**
   * Update secret
   */
  async updateSecret(
    secretId: string,
    updates: {
      value?: string
      metadata?: Record<string, unknown>
      expiresAt?: Date
      accessControl?: Secret['accessControl']
    },
    userId?: string
  ): Promise<void> {
    try {
      const secret = this.secrets.get(secretId)
      if (!secret) {
        throw new Error(`Secret ${secretId} not found`)
      }

      // Check access control
      if (userId && !this.hasAccess(secret, userId, 'write')) {
        throw new Error('Access denied')
      }

      // Encrypt new value if provided
      if (updates.value) {
        secret.value = this.encrypt(updates.value)
        secret.version += 1
      }

      if (updates.metadata) {
        secret.metadata = { ...secret.metadata, ...updates.metadata }
      }

      if (updates.expiresAt !== undefined) {
        secret.expiresAt = updates.expiresAt
      }

      if (updates.accessControl) {
        secret.accessControl = updates.accessControl
      }

      secret.updatedAt = new Date()

      this.secrets.set(secretId, secret)

      // Log access
      this.logAccess(secretId, userId || 'system', 'write')

      logger.info('Secret updated', {
        secretId,
        version: secret.version,
      })

      eventBus.publish('deployment.secret.updated', {
        secret: {
          id: secret.id,
          name: secret.name,
          version: secret.version,
        },
      })
    } catch (error: any) {
      logger.error('Update secret failed:', error)
      throw error
    }
  }

  /**
   * Rotate secret
   */
  async rotateSecret(secretId: string, newValue: string, rotatedBy: string): Promise<void> {
    try {
      const secret = this.secrets.get(secretId)
      if (!secret) {
        throw new Error(`Secret ${secretId} not found`)
      }

      const oldVersion = secret.version

      // Encrypt new value
      secret.value = this.encrypt(newValue)
      secret.version += 1
      secret.lastRotatedAt = new Date()
      secret.updatedAt = new Date()

      this.secrets.set(secretId, secret)

      // Create rotation record
      const rotationId = `rotation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const rotation: SecretRotation = {
        id: rotationId,
        secretId,
        oldVersion,
        newVersion: secret.version,
        rotatedAt: new Date(),
        rotatedBy,
        status: 'success',
      }

      this.rotations.set(rotationId, rotation)

      logger.info('Secret rotated', {
        secretId,
        oldVersion,
        newVersion: secret.version,
        rotatedBy,
      })

      eventBus.publish('deployment.secret.rotated', {
        rotation,
      })
    } catch (error: any) {
      logger.error('Rotate secret failed:', error)
      throw error
    }
  }

  /**
   * Delete secret
   */
  async deleteSecret(secretId: string, userId?: string): Promise<void> {
    try {
      const secret = this.secrets.get(secretId)
      if (!secret) {
        throw new Error(`Secret ${secretId} not found`)
      }

      // Check access control
      if (userId && !this.hasAccess(secret, userId, 'delete')) {
        throw new Error('Access denied')
      }

      this.secrets.delete(secretId)

      // Log access
      this.logAccess(secretId, userId || 'system', 'delete')

      logger.info('Secret deleted', {
        secretId,
      })

      eventBus.publish('deployment.secret.deleted', {
        secret: {
          id: secret.id,
          name: secret.name,
        },
      })
    } catch (error: any) {
      logger.error('Delete secret failed:', error)
      throw error
    }
  }

  /**
   * Check if secret needs rotation
   */
  async checkRotationNeeded(): Promise<Array<{ secretId: string; name: string; daysSinceRotation: number }>> {
    try {
      const secretsNeedingRotation: Array<{ secretId: string; name: string; daysSinceRotation: number }> = []

      for (const secret of this.secrets.values()) {
        if (!secret.rotationEnabled || !secret.rotationInterval || !secret.lastRotatedAt) {
          continue
        }

        const daysSinceRotation = (Date.now() - secret.lastRotatedAt.getTime()) / (1000 * 60 * 60 * 24)

        if (daysSinceRotation >= secret.rotationInterval) {
          secretsNeedingRotation.push({
            secretId: secret.id,
            name: secret.name,
            daysSinceRotation: Math.floor(daysSinceRotation),
          })
        }
      }

      return secretsNeedingRotation
    } catch (error: any) {
      logger.error('Check rotation needed failed:', error)
      return []
    }
  }

  /**
   * Encrypt value
   */
  private encrypt(value: string): string {
    try {
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv)
      let encrypted = cipher.update(value, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      return iv.toString('hex') + ':' + encrypted
    } catch (error: any) {
      logger.error('Encrypt failed:', error)
      throw error
    }
  }

  /**
   * Decrypt value
   */
  private decrypt(encryptedValue: string): string {
    try {
      const parts = encryptedValue.split(':')
      const iv = Buffer.from(parts[0], 'hex')
      const encrypted = parts[1]
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv)
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (error: any) {
      logger.error('Decrypt failed:', error)
      throw error
    }
  }

  /**
   * Check access
   */
  private hasAccess(secret: Secret, userId: string, action: 'read' | 'write' | 'delete'): boolean {
    // In production, implement proper RBAC
    return (
      secret.accessControl.users.includes(userId) ||
      secret.accessControl.roles.some((role) => {
        // Check if user has role
        return true // Simplified
      })
    )
  }

  /**
   * Log access
   */
  private logAccess(secretId: string, userId: string, action: 'read' | 'write' | 'delete'): void {
    const access: SecretAccess = {
      id: `access-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      secretId,
      userId,
      action,
      timestamp: new Date(),
    }

    this.accessLogs.push(access)

    // Keep only last 10000 access logs
    if (this.accessLogs.length > 10000) {
      this.accessLogs = this.accessLogs.slice(-10000)
    }
  }

  /**
   * Get all secrets
   */
  getAllSecrets(): Secret[] {
    return Array.from(this.secrets.values())
  }

  /**
   * Get access logs
   */
  getAccessLogs(secretId?: string, limit = 100): SecretAccess[] {
    let logs = this.accessLogs

    if (secretId) {
      logs = logs.filter((log) => log.secretId === secretId)
    }

    return logs.slice(-limit)
  }

  /**
   * Get rotation history
   */
  getRotationHistory(secretId?: string): SecretRotation[] {
    let rotations = Array.from(this.rotations.values())

    if (secretId) {
      rotations = rotations.filter((r) => r.secretId === secretId)
    }

    return rotations.sort((a, b) => b.rotatedAt.getTime() - a.rotatedAt.getTime())
  }
}

// Global Advanced Secret Manager
export const advancedSecretManager = new AdvancedSecretManager()

