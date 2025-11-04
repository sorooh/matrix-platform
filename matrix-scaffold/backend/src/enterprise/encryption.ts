/**
 * Encryption Utilities
 * Global-Ready Architecture with data encryption
 */

import crypto from 'crypto'
import { logger } from '../config/logger'
import { config } from '../config/app'

export function encrypt(text: string): string {
  if (!config.security.encryptionKey || !config.security.encryptionIV) {
    logger.warn('Encryption keys not configured, returning plain text')
    return text
  }

  try {
    const key = Buffer.from(config.security.encryptionKey, 'hex')
    const iv = Buffer.from(config.security.encryptionIV, 'hex')
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return encrypted
  } catch (error: any) {
    logger.error('Encryption failed:', error)
    throw error
  }
}

export function decrypt(encryptedText: string): string {
  if (!config.security.encryptionKey || !config.security.encryptionIV) {
    logger.warn('Encryption keys not configured, returning plain text')
    return encryptedText
  }

  try {
    const key = Buffer.from(config.security.encryptionKey, 'hex')
    const iv = Buffer.from(config.security.encryptionIV, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error: any) {
    logger.error('Decryption failed:', error)
    throw error
  }
}

export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

