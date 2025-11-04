/**
 * Authentication System
 * Phase 2: Enterprise Features - Authentication
 * Global-Ready Architecture
 */

import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { logger } from '../config/logger'
import { config } from '../config/app'
import { User, hasPermission } from './rbac'

export interface AuthToken {
  userId: string
  email: string
  role: string
  permissions: string[]
  iat?: number
  exp?: number
}

export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(10)
    return await bcrypt.hash(password, salt)
  } catch (error: any) {
    logger.error('hashPassword error:', error)
    throw error
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash)
  } catch (error: any) {
    logger.error('verifyPassword error:', error)
    return false
  }
}

export function generateToken(user: User): string {
  try {
    if (!config.security.jwtSecret) {
      throw new Error('JWT_SECRET not configured')
    }

    const payload: AuthToken = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    }

    return jwt.sign(payload, config.security.jwtSecret, {
      expiresIn: '7d',
      issuer: 'matrix-platform',
      audience: 'matrix-platform'
    })
  } catch (error: any) {
    logger.error('generateToken error:', error)
    throw error
  }
}

export function verifyToken(token: string): AuthToken | null {
  try {
    if (!config.security.jwtSecret) {
      logger.warn('JWT_SECRET not configured')
      return null
    }

    const decoded = jwt.verify(token, config.security.jwtSecret, {
      issuer: 'matrix-platform',
      audience: 'matrix-platform'
    }) as AuthToken

    return decoded
  } catch (error: any) {
    logger.warn('verifyToken error:', error)
    return null
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}
