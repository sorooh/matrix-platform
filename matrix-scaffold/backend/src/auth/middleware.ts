import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { promisify } from 'util'
import type { FastifyRequest, FastifyReply } from 'fastify'

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'matrix-platform-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '30d'

// User Roles
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  VIEWER = 'viewer'
}

// User Interface
export interface User {
  id: string
  email: string
  username: string
  role: UserRole
  isActive: boolean
  createdAt: Date
  lastLogin?: Date
  twoFactorEnabled?: boolean
  profileImage?: string
}

// JWT Payload Interface
export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  iat: number
  exp: number
}

// Auth Service Class
export class AuthService {
  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12
    return bcrypt.hash(password, saltRounds)
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  /**
   * Generate JWT token
   */
  static generateToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role
    }
    
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'matrix-platform',
      audience: 'matrix-users'
    })
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(userId: string): string {
    return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES
    })
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'matrix-platform',
        audience: 'matrix-users'
      }) as JWTPayload
      
      return decoded
    } catch (error) {
      return null
    }
  }

  /**
   * Extract token from request headers
   */
  static extractToken(request: FastifyRequest): string | null {
    const authHeader = request.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7)
    }
    
    // Check for token in cookies as fallback
    return request.cookies?.authToken || null
  }
}

// Authentication Middleware
export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const token = AuthService.extractToken(request)
  
  if (!token) {
    return reply.status(401).send({
      error: 'Access denied',
      message: 'Authentication token required',
      code: 'NO_TOKEN'
    })
  }

  const payload = await AuthService.verifyToken(token)
  
  if (!payload) {
    return reply.status(401).send({
      error: 'Access denied',
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    })
  }

  // Add user info to request
  request.user = payload
}

// Role-based Access Control
export function requireRole(allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Authentication required',
        code: 'NO_AUTH'
      })
    }

    const userRole = request.user.role
    
    if (!allowedRoles.includes(userRole)) {
      return reply.status(403).send({
        error: 'Insufficient permissions',
        message: `Role '${userRole}' not authorized. Required: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_ROLE'
      })
    }
  }
}

// Optional Authentication (for public endpoints that enhance with user data)
export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const token = AuthService.extractToken(request)
  
  if (token) {
    const payload = await AuthService.verifyToken(token)
    if (payload) {
      request.user = payload
    }
  }
  // Continue regardless of auth status
}

// Rate limiting by user
const userRequestCounts = new Map<string, { count: number; resetTime: number }>()

export function rateLimitByUser(maxRequests: number = 100, windowMinutes: number = 15) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.userId || request.ip
    const now = Date.now()
    const windowMs = windowMinutes * 60 * 1000
    
    const userLimit = userRequestCounts.get(userId)
    
    if (!userLimit || now > userLimit.resetTime) {
      userRequestCounts.set(userId, {
        count: 1,
        resetTime: now + windowMs
      })
      return
    }
    
    if (userLimit.count >= maxRequests) {
      const resetIn = Math.ceil((userLimit.resetTime - now) / 1000)
      
      return reply.status(429).send({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${resetIn} seconds.`,
        retryAfter: resetIn,
        code: 'RATE_LIMIT'
      })
    }
    
    userLimit.count++
  }
}

// Security headers middleware
export async function securityHeaders(
  request: FastifyRequest,
  reply: FastifyReply
) {
  reply.headers({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  })
}

// Input validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
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

// Extend FastifyRequest type
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload
  }
}