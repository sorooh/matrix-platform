/**
 * Enterprise Authentication
 * Global-Ready Architecture with JWT + OAuth2
 */

import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { logger } from '../config/logger'
import { config } from '../config/app'

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'viewer'
  createdAt: string
  updatedAt: string
}

export interface AuthToken {
  token: string
  expiresIn: number
  user: User
}

export function generateToken(user: User): string {
  if (!config.security.jwtSecret) {
    throw new Error('JWT_SECRET is required')
  }

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  }

  return jwt.sign(payload, config.security.jwtSecret, {
    expiresIn: '7d',
    issuer: 'matrix-platform',
    audience: 'matrix-platform-users'
  })
}

export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  if (!config.security.jwtSecret) {
    return null
  }

  try {
    const decoded = jwt.verify(token, config.security.jwtSecret, {
      issuer: 'matrix-platform',
      audience: 'matrix-platform-users'
    }) as any

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    }
  } catch (error) {
    logger.warn('Token verification failed:', error)
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return bcrypt.hash(password, saltRounds)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

