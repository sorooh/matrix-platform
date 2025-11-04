/**
 * Smart User Accounts System
 * Phase 4: User Experience & Interaction
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { prisma } from '../config/database'
import { hashSensitiveData, encrypt, decrypt } from '../enterprise/encryption'
import { auditLogger } from '../enterprise/audit'
import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'
import crypto from 'crypto'

export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  role: 'user' | 'admin' | 'enterprise'
  emailVerified: boolean
  twoFactorEnabled: boolean
  twoFactorSecret?: string
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
  preferences?: {
    theme?: string
    language?: string
    notifications?: Record<string, boolean>
  }
  metadata?: Record<string, unknown>
}

export interface UserSession {
  id: string
  userId: string
  token: string
  ip?: string
  userAgent?: string
  expiresAt: Date
  createdAt: Date
  lastActivityAt: Date
}

export interface UserActivity {
  id: string
  userId: string
  type: 'login' | 'logout' | 'action' | 'api_call' | 'error'
  description: string
  metadata?: Record<string, unknown>
  timestamp: Date
}

export interface OAuthProvider {
  id: string
  name: 'google' | 'github' | 'microsoft'
  clientId: string
  clientSecret: string
  enabled: boolean
}

export class SmartUserAccounts {
  private oauthProviders: Map<string, OAuthProvider> = new Map()
  private sessions: Map<string, UserSession> = new Map()
  private jwtSecret: string = process.env.JWT_SECRET || 'matrix-platform-secret-key-change-in-production'

  constructor() {
    this.initializeOAuthProviders()
  }

  private initializeOAuthProviders(): void {
    // Initialize OAuth providers from environment
    const providers: OAuthProvider[] = [
      {
        id: 'google',
        name: 'google',
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        enabled: !!process.env.GOOGLE_CLIENT_ID,
      },
      {
        id: 'github',
        name: 'github',
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        enabled: !!process.env.GITHUB_CLIENT_ID,
      },
      {
        id: 'microsoft',
        name: 'microsoft',
        clientId: process.env.MICROSOFT_CLIENT_ID || '',
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
        enabled: !!process.env.MICROSOFT_CLIENT_ID,
      },
    ]

    for (const provider of providers) {
      if (provider.enabled) {
        this.oauthProviders.set(provider.id, provider)
      }
    }

    logger.info(`OAuth providers initialized: ${Array.from(this.oauthProviders.keys()).join(', ')}`)
  }

  /**
   * Register new user with email/password
   */
  async register(
    email: string,
    password: string,
    name?: string,
    options?: { ip?: string; userAgent?: string; referralToken?: string }
  ): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    try {
      // Check if user exists
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        return { success: false, error: 'User already exists' }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex')
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          emailVerified: false,
          verificationToken,
          verificationExpires,
          role: 'user',
          preferences: {
            theme: 'auto',
            language: 'en',
            notifications: {},
          },
        },
      })

      // Create user points
      await prisma.userPoints.create({
        data: {
          userId: user.id,
          totalPoints: 0,
          aiCredits: 100, // Free tier gets 100 credits
          tier: 'bronze',
          referralsCount: 0,
        },
      })

      // Check if user was referred
      if (options?.referralToken) {
        try {
          const { referralSystem } = await import('./referral')
          await referralSystem.completeReferral(options.referralToken, user.id)
        } catch (error) {
          logger.warn('Failed to complete referral on registration:', error)
        }
      }

      // Log activity
      await this.logActivity(user.id, 'action', 'User registered', {
        email,
        ip: options?.ip,
        userAgent: options?.userAgent,
      })

      // Generate session token
      const token = this.generateToken(user.id, user.email)

      // Create session
      await this.createSession(user.id, token, options)

      // Log audit
      await auditLogger.log('user.created', 'auth', {
        resourceId: user.id,
        details: { email, name },
      })

      logger.info(`User registered: ${user.id}`, { email })

      return {
        success: true,
        user: this.sanitizeUser(user),
        token,
      }
    } catch (error: any) {
      logger.error('User registration failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Login with email/password
   */
  async login(
    email: string,
    password: string,
    options?: { ip?: string; userAgent?: string; twoFactorCode?: string }
  ): Promise<{ success: boolean; user?: User; token?: string; session?: UserSession; error?: string }> {
    try {
      // Find user
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user || !user.password) {
        return { success: false, error: 'Invalid credentials' }
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password)
      if (!validPassword) {
        await this.logActivity(user.id, 'error', 'Failed login attempt - invalid password', {
          email,
          ip: options?.ip,
        })
        return { success: false, error: 'Invalid credentials' }
      }

      // Check 2FA if enabled
      if (user.twoFactorEnabled && user.twoFactorSecret) {
        if (!options?.twoFactorCode) {
          return { success: false, error: '2FA code required' }
        }

        const valid2FA = this.verify2FA(user.twoFactorSecret, options.twoFactorCode)
        if (!valid2FA) {
          await this.logActivity(user.id, 'error', 'Failed login attempt - invalid 2FA code', {
            email,
            ip: options?.ip,
          })
          return { success: false, error: 'Invalid 2FA code' }
        }
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })

      // Log activity
      await this.logActivity(user.id, 'login', 'User logged in', {
        email,
        ip: options?.ip,
        userAgent: options?.userAgent,
      })

      // Generate session token
      const token = this.generateToken(user.id, user.email)

      // Create session
      const session = await this.createSession(user.id, token, options)

      // Log audit
      await auditLogger.log('user.login', 'auth', {
        resourceId: user.id,
        details: { email, ip: options?.ip },
      })

      logger.info(`User logged in: ${user.id}`, { email })

      return {
        success: true,
        user: this.sanitizeUser(user),
        token,
        session,
      }
    } catch (error: any) {
      logger.error('User login failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * OAuth login
   */
  async oauthLogin(
    provider: 'google' | 'github' | 'microsoft',
    code: string,
    options?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    try {
      const oauthProvider = this.oauthProviders.get(provider)
      if (!oauthProvider || !oauthProvider.enabled) {
        return { success: false, error: `OAuth provider ${provider} not enabled` }
      }

      // Exchange code for access token (simplified - in production, use actual OAuth flow)
      const accessToken = await this.exchangeOAuthCode(provider, code, oauthProvider)

      // Get user info from provider
      const userInfo = await this.getOAuthUserInfo(provider, accessToken)

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email: userInfo.email },
      })

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: userInfo.email,
            name: userInfo.name,
            avatar: userInfo.avatar || null,
            emailVerified: true, // OAuth emails are pre-verified
            role: 'user',
            oauthProvider: provider,
            oauthId: userInfo.id,
            preferences: {
              theme: 'auto',
              language: 'en',
              notifications: {},
            },
          },
        })

        // Create user points
        await prisma.userPoints.create({
          data: {
            userId: user.id,
            totalPoints: 0,
            aiCredits: 100,
            tier: 'bronze',
            referralsCount: 0,
          },
        })

        await auditLogger.log('user.created', 'auth', {
          resourceId: user.id,
          details: { email: userInfo.email, provider },
        })
      } else {
        // Update OAuth info
        await prisma.user.update({
          where: { id: user.id },
          data: {
            oauthProvider: provider,
            oauthId: userInfo.id,
            avatar: userInfo.avatar || user.avatar,
            lastLoginAt: new Date(),
          },
        })
      }

      // Log activity
      await this.logActivity(user.id, 'login', `OAuth login via ${provider}`, {
        email: userInfo.email,
        ip: options?.ip,
        userAgent: options?.userAgent,
      })

      // Generate session token
      const token = this.generateToken(user.id, user.email)

      // Create session
      await this.createSession(user.id, token, options)

      logger.info(`OAuth login: ${user.id} via ${provider}`, { email: userInfo.email })

      return {
        success: true,
        user: this.sanitizeUser(user),
        token,
      }
    } catch (error: any) {
      logger.error(`OAuth login failed: ${provider}`, error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Exchange OAuth code for access token (simplified)
   */
  private async exchangeOAuthCode(
    provider: string,
    code: string,
    oauthProvider: OAuthProvider
  ): Promise<string> {
    // Simplified - in production, make actual OAuth API calls
    return `access_token_${code}_${Date.now()}`
  }

  /**
   * Get user info from OAuth provider (simplified)
   */
  private async getOAuthUserInfo(
    provider: string,
    accessToken: string
  ): Promise<{ id: string; email: string; name?: string; avatar?: string }> {
    // Simplified - in production, make actual OAuth API calls
    return {
      id: `oauth_${provider}_${Date.now()}`,
      email: `user_${Date.now()}@example.com`,
      name: `User ${Date.now()}`,
      avatar: undefined,
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          verificationToken: token,
          verificationExpires: { gt: new Date() },
        },
      })

      if (!user) {
        return { success: false, error: 'Invalid or expired verification token' }
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          verificationExpires: null,
        },
      })

      await this.logActivity(user.id, 'action', 'Email verified', { email: user.email })

      logger.info(`Email verified: ${user.id}`, { email: user.email })

      return { success: true }
    } catch (error: any) {
      logger.error('Email verification failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Enable 2FA
   */
  async enable2FA(userId: string): Promise<{ success: boolean; secret?: string; qrCode?: string; error?: string }> {
    try {
      const secret = this.generate2FASecret()
      const qrCode = this.generate2FAQrCode(userId, secret)

      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: secret,
        },
      })

      await this.logActivity(userId, 'action', '2FA enabled', {})

      logger.info(`2FA enabled: ${userId}`)

      return { success: true, secret, qrCode }
    } catch (error: any) {
      logger.error('2FA enable failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
      })

      await this.logActivity(userId, 'action', '2FA disabled', {})

      logger.info(`2FA disabled: ${userId}`)

      return { success: true }
    } catch (error: any) {
      logger.error('2FA disable failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Generate 2FA secret
   */
  private generate2FASecret(): string {
    return crypto.randomBytes(20).toString('base32')
  }

  /**
   * Generate 2FA QR code (simplified)
   */
  private generate2FAQrCode(userId: string, secret: string): string {
    // Simplified - in production, use actual QR code library
    return `otpauth://totp/MatrixPlatform:${userId}?secret=${secret}&issuer=MatrixPlatform`
  }

  /**
   * Verify 2FA code
   */
  private verify2FA(secret: string, code: string): boolean {
    // Simplified - in production, use actual TOTP library
    return code.length === 6 && /^\d+$/.test(code)
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string, email: string): string {
    return jwt.sign(
      {
        userId,
        email,
        iat: Math.floor(Date.now() / 1000),
      },
      this.jwtSecret,
      { expiresIn: '7d' }
    )
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { valid: boolean; userId?: string; email?: string; error?: string } {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any
      return { valid: true, userId: decoded.userId, email: decoded.email }
    } catch (error: any) {
      return { valid: false, error: error.message }
    }
  }

  /**
   * Create session
   */
  private async createSession(
    userId: string,
    token: string,
    options?: { ip?: string; userAgent?: string }
  ): Promise<UserSession> {
    const session: UserSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      userId,
      token,
      ip: options?.ip,
      userAgent: options?.userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
      lastActivityAt: new Date(),
    }

    this.sessions.set(session.id, session)

      // Store in database
      try {
        await prisma.userSession.create({
          data: {
            id: session.id,
            userId,
            token: hashSensitiveData(token),
            ip: session.ip || null,
            userAgent: session.userAgent || null,
            expiresAt: session.expiresAt,
            lastActivityAt: session.lastActivityAt,
          },
        })
      } catch (error) {
        logger.warn('Failed to store session in database:', error)
      }

    return session
  }

  /**
   * Logout
   */
  async logout(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const session = this.sessions.get(sessionId)
      if (session) {
        await this.logActivity(session.userId, 'logout', 'User logged out', {})
        this.sessions.delete(sessionId)

        // Delete from database
        try {
          await prisma.userSession.delete({ where: { id: sessionId } })
        } catch (error) {
          logger.warn('Failed to delete session from database:', error)
        }
      }

      return { success: true }
    } catch (error: any) {
      logger.error('Logout failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      return user ? this.sanitizeUser(user) : null
    } catch (error: any) {
      logger.error('Get user failed:', error)
      return null
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: { name?: string; avatar?: string; preferences?: Record<string, unknown> }
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      })

      await this.logActivity(userId, 'action', 'Profile updated', { updates })

      logger.info(`Profile updated: ${userId}`)

      return { success: true, user: this.sanitizeUser(user) }
    } catch (error: any) {
      logger.error('Profile update failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get user activity timeline
   */
  async getActivityTimeline(userId: string, limit: number = 50): Promise<UserActivity[]> {
    try {
      const activities = await prisma.userActivity.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      })

      return activities.map((a) => ({
        id: a.id,
        userId: a.userId,
        type: a.type as any,
        description: a.description,
        metadata: a.metadata as Record<string, unknown>,
        timestamp: a.timestamp,
      }))
    } catch (error: any) {
      logger.error('Get activity timeline failed:', error)
      return []
    }
  }

  /**
   * Get security logs
   */
  async getSecurityLogs(userId: string, limit: number = 50): Promise<UserActivity[]> {
    try {
      const activities = await prisma.userActivity.findMany({
        where: {
          userId,
          type: { in: ['login', 'logout', 'error'] },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      })

      return activities.map((a) => ({
        id: a.id,
        userId: a.userId,
        type: a.type as any,
        description: a.description,
        metadata: a.metadata as Record<string, unknown>,
        timestamp: a.timestamp,
      }))
    } catch (error: any) {
      logger.error('Get security logs failed:', error)
      return []
    }
  }

  /**
   * Get user sessions
   */
  async getSessions(userId: string): Promise<UserSession[]> {
    try {
      const sessions = await prisma.userSession.findMany({
        where: { userId, expiresAt: { gt: new Date() } },
        orderBy: { lastActivityAt: 'desc' },
      })

      return sessions.map((s) => ({
        id: s.id,
        userId: s.userId,
        token: '***', // Don't expose actual token
        ip: s.ip || undefined,
        userAgent: s.userAgent || undefined,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        lastActivityAt: s.lastActivityAt,
      }))
    } catch (error: any) {
      logger.error('Get sessions failed:', error)
      return []
    }
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.userSession.delete({ where: { id: sessionId } })
      this.sessions.delete(sessionId)

      logger.info(`Session revoked: ${sessionId}`)

      return { success: true }
    } catch (error: any) {
      logger.error('Revoke session failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Log user activity
   */
  private async logActivity(
    userId: string,
    type: 'login' | 'logout' | 'action' | 'api_call' | 'error',
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.userActivity.create({
        data: {
          userId,
          type,
          description,
          metadata: metadata || {},
          timestamp: new Date(),
        },
      })
    } catch (error: any) {
      logger.error('Log activity failed:', error)
    }
  }

  /**
   * Sanitize user (remove sensitive data)
   */
  private sanitizeUser(user: any): User {
    const { password, twoFactorSecret, verificationToken, ...sanitized } = user
    return sanitized as User
  }
}

// Global Smart User Accounts
export const smartUserAccounts = new SmartUserAccounts()

