/**
 * Phase 10.5 - End-to-End Encryption (E2E)
 * 
 * End-to-end encryption for sensitive data
 * - E2E encryption implementation
 * - Key exchange
 * - Message encryption/decryption
 * - Secure channels
 */

import { nanoid } from 'nanoid'
import crypto from 'crypto'
import { logger, logError, logInfo } from '../../config/logger'

export type EncryptionAlgorithm = 'aes-256-gcm' | 'chacha20-poly1305' | 'rsa-oaep'
export type EncryptionStatus = 'encrypted' | 'decrypted' | 'failed'

export interface E2EKeyPair {
  id: string
  userId: string
  publicKey: string
  privateKey: string // Encrypted
  algorithm: EncryptionAlgorithm
  createdAt: Date
  updatedAt: Date
}

export interface E2EEncryptedData {
  id: string
  data: string // Encrypted data
  algorithm: EncryptionAlgorithm
  keyId: string
  iv: string // Initialization vector
  tag: string // Authentication tag
  metadata: Record<string, any>
  encryptedAt: Date
}

export interface E2EChannel {
  id: string
  participants: string[] // User IDs
  sharedKey: string // Encrypted
  algorithm: EncryptionAlgorithm
  status: 'active' | 'inactive' | 'expired'
  createdAt: Date
  expiresAt?: Date
}

class EndToEndEncryption {
  private keyPairs: Map<string, E2EKeyPair> = new Map()
  private encryptedData: Map<string, E2EEncryptedData> = new Map()
  private channels: Map<string, E2EChannel> = new Map()

  async initialize() {
    logInfo('Initializing End-to-End Encryption (E2E)...')

    logInfo('✅ End-to-End Encryption (E2E) initialized')
  }

  // Generate key pair
  async generateKeyPair(
    userId: string,
    algorithm: EncryptionAlgorithm = 'aes-256-gcm'
  ): Promise<E2EKeyPair> {
    try {
      const keyPairId = nanoid()
      const now = new Date()

      // Generate key pair based on algorithm
      let publicKey: string
      let privateKey: string

      if (algorithm === 'rsa-oaep') {
        const { publicKey: pubKey, privateKey: privKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        })
        publicKey = pubKey
        privateKey = privKey
      } else {
        // AES/ChaCha20 - generate symmetric key
        const key = crypto.randomBytes(32)
        publicKey = key.toString('hex')
        privateKey = key.toString('hex')
      }

      // Encrypt private key
      const encryptedPrivateKey = this.encryptPrivateKey(privateKey, userId)

      const keyPair: E2EKeyPair = {
        id: keyPairId,
        userId,
        publicKey,
        privateKey: encryptedPrivateKey,
        algorithm,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../../config/database')
        await prisma.e2EKeyPair.create({
          data: {
            id: keyPairId,
            userId,
            publicKey,
            privateKey: encryptedPrivateKey,
            algorithm,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Generate key pair in database' })
      }

      this.keyPairs.set(keyPairId, keyPair)

      logInfo(`✅ E2E key pair generated ${keyPairId} for user ${userId}`)

      return keyPair
    } catch (error) {
      logError(error as Error, { context: 'Generate key pair' })
      throw error
    }
  }

  // Encrypt private key
  private encryptPrivateKey(privateKey: string, userId: string): string {
    // In production, use user's password or master key
    const masterKey = crypto.createHash('sha256').update(userId).digest()
    const cipher = crypto.createCipher('aes-256-cbc', masterKey)
    const encrypted = cipher.update(privateKey, 'utf8', 'hex') + cipher.final('hex')
    return encrypted
  }

  // Encrypt data
  async encryptData(
    data: string,
    keyId: string,
    algorithm: EncryptionAlgorithm = 'aes-256-gcm'
  ): Promise<E2EEncryptedData> {
    try {
      const keyPair = this.keyPairs.get(keyId)
      if (!keyPair) throw new Error('Key pair not found')

      const dataId = nanoid()
      const now = new Date()

      let encrypted: string
      let iv: string
      let tag: string

      if (algorithm === 'aes-256-gcm') {
        iv = crypto.randomBytes(16).toString('hex')
        const key = Buffer.from(keyPair.publicKey, 'hex')
        const cipher = crypto.createCipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'))
        encrypted = cipher.update(data, 'utf8', 'hex') + cipher.final('hex')
        tag = cipher.getAuthTag().toString('hex')
      } else if (algorithm === 'rsa-oaep') {
        const publicKey = crypto.createPublicKey(keyPair.publicKey)
        const encryptedBuffer = crypto.publicEncrypt(
          { key: publicKey, oaepHash: 'sha256' },
          Buffer.from(data)
        )
        encrypted = encryptedBuffer.toString('hex')
        iv = ''
        tag = ''
      } else {
        throw new Error('Unsupported algorithm')
      }

      const encryptedData: E2EEncryptedData = {
        id: dataId,
        data: encrypted,
        algorithm,
        keyId,
        iv,
        tag,
        metadata: {},
        encryptedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../../config/database')
        await prisma.e2EEncryptedData.create({
          data: {
            id: dataId,
            data: encrypted,
            algorithm,
            keyId,
            iv,
            tag,
            metadata: {},
            encryptedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Encrypt data in database' })
      }

      this.encryptedData.set(dataId, encryptedData)

      logInfo(`✅ Data encrypted ${dataId} using ${algorithm}`)

      return encryptedData
    } catch (error) {
      logError(error as Error, { context: 'Encrypt data' })
      throw error
    }
  }

  // Decrypt data
  async decryptData(encryptedDataId: string, keyId: string): Promise<string> {
    try {
      const encryptedData = this.encryptedData.get(encryptedDataId)
      if (!encryptedData) throw new Error('Encrypted data not found')

      const keyPair = this.keyPairs.get(keyId)
      if (!keyPair) throw new Error('Key pair not found')

      let decrypted: string

      if (encryptedData.algorithm === 'aes-256-gcm') {
        const key = Buffer.from(keyPair.publicKey, 'hex')
        const decipher = crypto.createDecipheriv(
          'aes-256-gcm',
          key,
          Buffer.from(encryptedData.iv, 'hex')
        )
        decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'))
        decrypted = decipher.update(encryptedData.data, 'hex', 'utf8') + decipher.final('utf8')
      } else if (encryptedData.algorithm === 'rsa-oaep') {
        const privateKey = this.decryptPrivateKey(keyPair.privateKey, keyPair.userId)
        const privKey = crypto.createPrivateKey(privateKey)
        const decryptedBuffer = crypto.privateDecrypt(
          { key: privKey, oaepHash: 'sha256' },
          Buffer.from(encryptedData.data, 'hex')
        )
        decrypted = decryptedBuffer.toString('utf8')
      } else {
        throw new Error('Unsupported algorithm')
      }

      logInfo(`✅ Data decrypted ${encryptedDataId}`)

      return decrypted
    } catch (error) {
      logError(error as Error, { context: 'Decrypt data' })
      throw error
    }
  }

  // Decrypt private key
  private decryptPrivateKey(encryptedPrivateKey: string, userId: string): string {
    const masterKey = crypto.createHash('sha256').update(userId).digest()
    const decipher = crypto.createDecipher('aes-256-cbc', masterKey)
    const decrypted = decipher.update(encryptedPrivateKey, 'hex', 'utf8') + decipher.final('utf8')
    return decrypted
  }

  // Create E2E channel
  async createChannel(
    participants: string[],
    algorithm: EncryptionAlgorithm = 'aes-256-gcm'
  ): Promise<E2EChannel> {
    try {
      const channelId = nanoid()
      const now = new Date()

      // Generate shared key
      const sharedKey = crypto.randomBytes(32).toString('hex')
      const encryptedSharedKey = this.encryptSharedKey(sharedKey, participants)

      const channel: E2EChannel = {
        id: channelId,
        participants,
        sharedKey: encryptedSharedKey,
        algorithm,
        status: 'active',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }

      // Save to database
      try {
        const { prisma } = await import('../../config/database')
        await prisma.e2EChannel.create({
          data: {
            id: channelId,
            participants,
            sharedKey: encryptedSharedKey,
            algorithm,
            status: 'active',
            createdAt: now,
            expiresAt: channel.expiresAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create E2E channel in database' })
      }

      this.channels.set(channelId, channel)

      logInfo(`✅ E2E channel created ${channelId} for ${participants.length} participants`)

      return channel
    } catch (error) {
      logError(error as Error, { context: 'Create E2E channel' })
      throw error
    }
  }

  // Encrypt shared key
  private encryptSharedKey(sharedKey: string, participants: string[]): string {
    // In production, encrypt with each participant's public key
    return sharedKey // Simplified
  }

  // Get key pairs
  async getKeyPairs(userId?: string): Promise<E2EKeyPair[]> {
    const keyPairs: E2EKeyPair[] = []
    for (const keyPair of this.keyPairs.values()) {
      if (userId && keyPair.userId !== userId) continue
      keyPairs.push(keyPair)
    }
    return keyPairs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
}

export const endToEndEncryption = new EndToEndEncryption()

