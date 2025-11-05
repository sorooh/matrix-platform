/**
 * Phase 10.5 - Key Management System (KMS)
 * 
 * Key management system
 * - Key generation
 * - Key rotation
 * - Key versioning
 * - Key storage
 * - Key access control
 */

import { nanoid } from 'nanoid'
import crypto from 'crypto'
import { logger, logError, logInfo } from '../../config/logger'

export type KeyType = 'symmetric' | 'asymmetric' | 'hmac' | 'derived'
export type KeyStatus = 'active' | 'inactive' | 'expired' | 'revoked'
export type KeyAlgorithm = 'aes-256' | 'rsa-2048' | 'rsa-4096' | 'ec-p256' | 'ec-p384'

export interface EncryptionKey {
  id: string
  name: string
  type: KeyType
  algorithm: KeyAlgorithm
  keyMaterial: string // Encrypted
  version: number
  status: KeyStatus
  createdAt: Date
  expiresAt?: Date
  rotatedAt?: Date
  metadata: Record<string, any>
}

export interface KeyRotation {
  id: string
  keyId: string
  oldVersion: number
  newVersion: number
  rotatedAt: Date
  rotatedBy: string
  reason: string
}

export interface KeyAccess {
  id: string
  keyId: string
  userId: string
  permission: 'read' | 'write' | 'delete' | 'rotate'
  grantedAt: Date
  expiresAt?: Date
  revokedAt?: Date
}

class KeyManagementSystem {
  private keys: Map<string, EncryptionKey> = new Map()
  private rotations: Map<string, KeyRotation> = new Map()
  private accesses: Map<string, KeyAccess> = new Map()
  private masterKey: Buffer

  async initialize() {
    logInfo('Initializing Key Management System (KMS)...')

    // Generate or load master key
    this.masterKey = this.getOrGenerateMasterKey()

    logInfo('✅ Key Management System (KMS) initialized')
  }

  // Get or generate master key
  private getOrGenerateMasterKey(): Buffer {
    // In production, load from secure storage
    // For now, generate from environment or default
    const masterKeyStr = process.env.MASTER_KEY || crypto.randomBytes(32).toString('hex')
    return crypto.createHash('sha256').update(masterKeyStr).digest()
  }

  // Generate key
  async generateKey(
    name: string,
    type: KeyType,
    algorithm: KeyAlgorithm,
    expiresInDays?: number
  ): Promise<EncryptionKey> {
    try {
      const keyId = nanoid()
      const now = new Date()
      const expiresAt = expiresInDays ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000) : undefined

      // Generate key material based on type and algorithm
      let keyMaterial: Buffer

      switch (type) {
        case 'symmetric':
          if (algorithm === 'aes-256') {
            keyMaterial = crypto.randomBytes(32)
          } else {
            throw new Error('Unsupported symmetric algorithm')
          }
          break
        case 'asymmetric':
          if (algorithm.startsWith('rsa-')) {
            const bits = parseInt(algorithm.split('-')[1])
            const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
              modulusLength: bits
            })
            keyMaterial = Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' }))
          } else if (algorithm.startsWith('ec-')) {
            const curve = algorithm.split('-')[1]
            const { privateKey } = crypto.generateKeyPairSync('ec', {
              namedCurve: `secp${curve}` as any
            })
            keyMaterial = Buffer.from(privateKey.export({ type: 'sec1', format: 'pem' }))
          } else {
            throw new Error('Unsupported asymmetric algorithm')
          }
          break
        case 'hmac':
          keyMaterial = crypto.randomBytes(32)
          break
        default:
          throw new Error('Unsupported key type')
      }

      // Encrypt key material
      const encryptedKeyMaterial = this.encryptKeyMaterial(keyMaterial)

      const key: EncryptionKey = {
        id: keyId,
        name,
        type,
        algorithm,
        keyMaterial: encryptedKeyMaterial.toString('hex'),
        version: 1,
        status: 'active',
        createdAt: now,
        expiresAt,
        metadata: {}
      }

      // Save to database
      try {
        const { prisma } = await import('../../config/database')
        await prisma.encryptionKey.create({
          data: {
            id: keyId,
            name,
            type,
            algorithm,
            keyMaterial: encryptedKeyMaterial.toString('hex'),
            version: 1,
            status: 'active',
            createdAt: now,
            expiresAt: expiresAt || null,
            rotatedAt: null,
            metadata: {}
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Generate key in database' })
      }

      this.keys.set(keyId, key)

      logInfo(`✅ Key generated ${keyId}: ${name} (${type}, ${algorithm})`)

      return key
    } catch (error) {
      logError(error as Error, { context: 'Generate key' })
      throw error
    }
  }

  // Encrypt key material
  private encryptKeyMaterial(keyMaterial: Buffer): Buffer {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv)
    const encrypted = Buffer.concat([cipher.update(keyMaterial), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, encrypted])
  }

  // Decrypt key material
  private decryptKeyMaterial(encryptedKeyMaterial: string): Buffer {
    const encrypted = Buffer.from(encryptedKeyMaterial, 'hex')
    const iv = encrypted.slice(0, 16)
    const tag = encrypted.slice(16, 32)
    const data = encrypted.slice(32)
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(data), decipher.final()])
  }

  // Rotate key
  async rotateKey(
    keyId: string,
    rotatedBy: string,
    reason: string = 'Scheduled rotation'
  ): Promise<EncryptionKey> {
    try {
      const oldKey = this.keys.get(keyId)
      if (!oldKey) throw new Error('Key not found')

      // Generate new key
      const newKey = await this.generateKey(
        oldKey.name,
        oldKey.type,
        oldKey.algorithm,
        oldKey.expiresAt ? Math.ceil((oldKey.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : undefined
      )

      // Update old key status
      oldKey.status = 'inactive'
      oldKey.rotatedAt = new Date()
      this.keys.set(keyId, oldKey)

      // Create rotation record
      const rotationId = nanoid()
      const now = new Date()

      const rotation: KeyRotation = {
        id: rotationId,
        keyId,
        oldVersion: oldKey.version,
        newVersion: newKey.version,
        rotatedAt: now,
        rotatedBy,
        reason
      }

      // Update new key version
      newKey.version = oldKey.version + 1
      this.keys.set(newKey.id, newKey)

      // Save to database
      try {
        const { prisma } = await import('../../config/database')
        await prisma.keyRotation.create({
          data: {
            id: rotationId,
            keyId,
            oldVersion: oldKey.version,
            newVersion: newKey.version,
            rotatedAt: now,
            rotatedBy,
            reason
          })
      } catch (error) {
        logError(error as Error, { context: 'Rotate key in database' })
      }

      this.rotations.set(rotationId, rotation)

      logInfo(`✅ Key rotated ${keyId}: v${oldKey.version} -> v${newKey.version}`)

      return newKey
    } catch (error) {
      logError(error as Error, { context: 'Rotate key' })
      throw error
    }
  }

  // Get key
  async getKey(keyId: string, decrypt: boolean = false): Promise<EncryptionKey | { key: EncryptionKey; decryptedMaterial: Buffer }> {
    const key = this.keys.get(keyId)
    if (!key) throw new Error('Key not found')

    if (decrypt) {
      const decryptedMaterial = this.decryptKeyMaterial(key.keyMaterial)
      return { key, decryptedMaterial }
    }

    return key
  }

  // Grant key access
  async grantAccess(
    keyId: string,
    userId: string,
    permission: KeyAccess['permission'],
    expiresInDays?: number
  ): Promise<KeyAccess> {
    try {
      const accessId = nanoid()
      const now = new Date()
      const expiresAt = expiresInDays ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000) : undefined

      const access: KeyAccess = {
        id: accessId,
        keyId,
        userId,
        permission,
        grantedAt: now,
        expiresAt,
        revokedAt: undefined
      }

      // Save to database
      try {
        const { prisma } = await import('../../config/database')
        await prisma.keyAccess.create({
          data: {
            id: accessId,
            keyId,
            userId,
            permission,
            grantedAt: now,
            expiresAt: expiresAt || null,
            revokedAt: null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Grant key access in database' })
      }

      this.accesses.set(accessId, access)

      logInfo(`✅ Key access granted ${accessId}: ${userId} -> ${keyId} (${permission})`)

      return access
    } catch (error) {
      logError(error as Error, { context: 'Grant key access' })
      throw error
    }
  }

  // Revoke key access
  async revokeAccess(accessId: string): Promise<boolean> {
    try {
      const access = this.accesses.get(accessId)
      if (!access) return false

      access.revokedAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../../config/database')
        await prisma.keyAccess.update({
          where: { id: accessId },
          data: {
            revokedAt: access.revokedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Revoke key access in database' })
      }

      this.accesses.set(accessId, access)

      logInfo(`✅ Key access revoked ${accessId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Revoke key access' })
      return false
    }
  }

  // Get keys
  async getKeys(status?: KeyStatus): Promise<EncryptionKey[]> {
    const keys: EncryptionKey[] = []
    for (const key of this.keys.values()) {
      if (status && key.status !== status) continue
      keys.push(key)
    }
    return keys.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
}

export const keyManagementSystem = new KeyManagementSystem()

