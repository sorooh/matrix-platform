/**
 * Encryption System
 * Phase 2: Enterprise Features - Encryption
 * Global-Ready Architecture
 */

import crypto from 'crypto'
import { logger } from '../config/logger'
import { config } from '../config/app'

const algorithm = 'aes-256-gcm'

function getEncryptionKey(): Buffer {
  if (!config.security.encryptionKey) {
    throw new Error('ENCRYPTION_KEY not configured')
  }
  return Buffer.from(config.security.encryptionKey, 'hex')
}

function getEncryptionIV(): Buffer {
  if (!config.security.encryptionIV) {
    throw new Error('ENCRYPTION_IV not configured')
  }
  return Buffer.from(config.security.encryptionIV, 'hex')
}

export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey()
    const iv = getEncryptionIV()
    const cipher = crypto.createCipheriv(algorithm, key, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    // Combine IV, authTag, and encrypted data
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  } catch (error: any) {
    logger.error('encrypt error:', error)
    throw error
  }
}

export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format')
    }

    const [ivHex, authTagHex, encrypted] = parts
    const key = getEncryptionKey()
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error: any) {
    logger.error('decrypt error:', error)
    throw error
  }
}

export function hashSensitiveData(data: string): string {
  try {
    return crypto.createHash('sha256').update(data).digest('hex')
  } catch (error: any) {
    logger.error('hashSensitiveData error:', error)
    throw error
  }
}
