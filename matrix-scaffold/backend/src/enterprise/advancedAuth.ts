/**
 * Advanced Authentication System
 * Phase 3: Enterprise-Grade Security
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { hashPassword, verifyPassword, generateToken, verifyToken } from './auth'
import { auditLogger } from './audit'
import { securitySystem } from './security'

export interface UserSession {
  userId: string
  email: string
  token: string
  ip?: string
  userAgent?: string
  createdAt: Date
  expiresAt: Date
  lastActivity: Date
}

export interface LoginAttempt {
  email: string
  ip?: string
  success: boolean
  timestamp: Date
  reason?: string
}

export class AdvancedAuthSystem {
  private sessions: Map<string, UserSession> = new Map()
  private loginAttempts: Map<string, LoginAttempt[]> = new Map()
  private maxLoginAttempts = 5
  private lockoutDuration = 3600000 // 1 hour

  /**
   * Register user
   */
  async register(
    email: string,
    password: string,
    options?: {
      ip?: string
      userAgent?: string
    }
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Check if email already exists (simplified - in production, check database)
      if (this.isEmailRegistered(email)) {
        return { success: false, error: 'Email already registered' }
      }

      // Validate password strength
      const passwordStrength = this.validatePasswordStrength(password)
      if (!passwordStrength.valid) {
        return { success: false, error: passwordStrength.errors.join('; ') }
      }

      // Hash password
      const hashedPassword = await hashPassword(password)

      // Create user (simplified - in production, use database)
      const user = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Log registration
      await auditLogger.log('user.registered', 'user', {
        userId: user.id,
        ip: options?.ip,
        details: { email }
      })

      logger.info(`User registered: ${email}`, {
        userId: user.id,
        ip: options?.ip
      })

      return { success: true, user: { id: user.id, email, createdAt: user.createdAt } }
    } catch (error: any) {
      logger.error('User registration failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Login user
   */
  async login(
    email: string,
    password: string,
    options?: {
      ip?: string
      userAgent?: string
    }
  ): Promise<{ success: boolean; session?: UserSession; error?: string }> {
    try {
      // Check for brute force attempts
      const attempts = this.getLoginAttempts(email)
      const recentFailed = attempts.filter(
        (a) => !a.success && Date.now() - a.timestamp.getTime() < this.lockoutDuration
      )

      if (recentFailed.length >= this.maxLoginAttempts) {
        // Log security event
        securitySystem.logSecurityEvent({
          type: 'threat',
          severity: 'high',
          description: `Brute force attempt detected for email: ${email}`,
          source: options?.ip || 'unknown',
          timestamp: new Date()
        })

        return {
          success: false,
          error: 'Account locked due to too many failed login attempts'
        }
      }

      // Verify credentials (simplified - in production, use database)
      const user = await this.getUserByEmail(email)
      if (!user) {
        this.recordLoginAttempt(email, false, options?.ip, 'Invalid email')
        return { success: false, error: 'Invalid credentials' }
      }

      const passwordValid = await verifyPassword(password, user.password)
      if (!passwordValid) {
        this.recordLoginAttempt(email, false, options?.ip, 'Invalid password')
        return { success: false, error: 'Invalid credentials' }
      }

      // Generate session
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: 'user',
        permissions: ['read', 'write'],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })

      const session: UserSession = {
        userId: user.id,
        email: user.email,
        token,
        ip: options?.ip,
        userAgent: options?.userAgent,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        lastActivity: new Date()
      }

      this.sessions.set(token, session)
      this.recordLoginAttempt(email, true, options?.ip)

      // Log successful login
      await auditLogger.log('user.logged_in', 'user', {
        userId: user.id,
        ip: options?.ip,
        details: { email }
      })

      logger.info(`User logged in: ${email}`, {
        userId: user.id,
        ip: options?.ip
      })

      return { success: true, session }
    } catch (error: any) {
      logger.error('User login failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Logout user
   */
  async logout(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const session = this.sessions.get(token)
      if (session) {
        this.sessions.delete(token)

        // Log logout
        await auditLogger.log('user.logged_out', 'user', {
          userId: session.userId,
          ip: session.ip,
          details: { email: session.email }
        })

        logger.info(`User logged out: ${session.email}`, {
          userId: session.userId
        })
      }

      return { success: true }
    } catch (error: any) {
      logger.error('User logout failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Validate session
   */
  validateSession(token: string): UserSession | null {
    try {
      const session = this.sessions.get(token)

      if (!session) {
        return null
      }

      // Check if session expired
      if (session.expiresAt < new Date()) {
        this.sessions.delete(token)
        return null
      }

      // Update last activity
      session.lastActivity = new Date()

      return session
    } catch (error: any) {
      logger.error('Session validation failed:', error)
      return null
    }
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters')
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Record login attempt
   */
  private recordLoginAttempt(
    email: string,
    success: boolean,
    ip?: string,
    reason?: string
  ): void {
    const attempts = this.getLoginAttempts(email)
    attempts.push({
      email,
      ip,
      success,
      timestamp: new Date(),
      reason
    })

    // Keep only last 20 attempts
    if (attempts.length > 20) {
      attempts.shift()
    }

    this.loginAttempts.set(email, attempts)
  }

  /**
   * Get login attempts
   */
  private getLoginAttempts(email: string): LoginAttempt[] {
    return this.loginAttempts.get(email) || []
  }

  /**
   * Check if email is registered (simplified)
   */
  private isEmailRegistered(email: string): boolean {
    // In production, check database
    return false // Simplified
  }

  /**
   * Get user by email (simplified)
   */
  private async getUserByEmail(email: string): Promise<any> {
    // In production, query database
    return null // Simplified
  }
}

// Global Advanced Auth System
export const advancedAuth = new AdvancedAuthSystem()

