import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { AuthService, UserRole, validateEmail, validatePassword, User } from './middleware.js'
import crypto from 'crypto'

// Request/Response Types
interface RegisterRequest {
  email: string
  username: string
  password: string
  confirmPassword: string
  role?: UserRole
}

interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

interface RefreshTokenRequest {
  refreshToken: string
}

interface ResetPasswordRequest {
  email: string
}

interface UpdatePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// In-memory user store (replace with database in production)
const users: Map<string, User & { password: string; refreshTokens: string[] }> = new Map()
const passwordResetTokens: Map<string, { email: string; token: string; expires: number }> = new Map()

// Initialize default admin user
const defaultAdmin: User & { password: string; refreshTokens: string[] } = {
  id: 'admin-001',
  email: 'admin@matrix-platform.com',
  username: 'admin',
  role: UserRole.SUPER_ADMIN,
  isActive: true,
  createdAt: new Date(),
  password: '$2a$12$LQv3c1yqBWVHxkd0LQ1Gv.vHyQRc0QFO3FwhJwsqKJ8Kd8E7K8GXG', // password: admin123!
  refreshTokens: [],
  twoFactorEnabled: false
}
users.set(defaultAdmin.id, defaultAdmin)

export async function registerAuthRoutes(fastify: FastifyInstance) {
  // Register new user
  fastify.post<{ Body: RegisterRequest }>('/auth/register', async (request, reply) => {
    const { email, username, password, confirmPassword, role = UserRole.VIEWER } = request.body

    // Validation
    if (!email || !username || !password || !confirmPassword) {
      return reply.status(400).send({
        error: 'Missing required fields',
        message: 'Email, username, password, and confirmPassword are required'
      })
    }

    if (!validateEmail(email)) {
      return reply.status(400).send({
        error: 'Invalid email format'
      })
    }

    if (password !== confirmPassword) {
      return reply.status(400).send({
        error: 'Passwords do not match'
      })
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return reply.status(400).send({
        error: 'Password validation failed',
        details: passwordValidation.errors
      })
    }

    // Check if user already exists
    const existingUser = Array.from(users.values()).find(
      u => u.email === email || u.username === username
    )

    if (existingUser) {
      return reply.status(409).send({
        error: 'User already exists',
        message: 'Email or username is already taken'
      })
    }

    // Create new user
    const userId = crypto.randomUUID()
    const hashedPassword = await AuthService.hashPassword(password)

    const newUser: User & { password: string; refreshTokens: string[] } = {
      id: userId,
      email,
      username,
      role,
      isActive: true,
      createdAt: new Date(),
      password: hashedPassword,
      refreshTokens: []
    }

    users.set(userId, newUser)

    // Generate tokens
    const accessToken = AuthService.generateToken(newUser)
    const refreshToken = AuthService.generateRefreshToken(userId)
    
    newUser.refreshTokens.push(refreshToken)

    // Set secure cookie
    reply.setCookie('authToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    return reply.status(201).send({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        createdAt: newUser.createdAt
      },
      accessToken,
      refreshToken
    })
  })

  // Login user
  fastify.post<{ Body: LoginRequest }>('/auth/login', async (request, reply) => {
    const { email, password, rememberMe = false } = request.body

    if (!email || !password) {
      return reply.status(400).send({
        error: 'Missing credentials',
        message: 'Email and password are required'
      })
    }

    // Find user
    const user = Array.from(users.values()).find(u => u.email === email)

    if (!user || !user.isActive) {
      return reply.status(401).send({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      })
    }

    // Verify password
    const isValidPassword = await AuthService.verifyPassword(password, user.password)

    if (!isValidPassword) {
      return reply.status(401).send({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      })
    }

    // Update last login
    user.lastLogin = new Date()

    // Generate tokens
    const accessToken = AuthService.generateToken(user)
    const refreshToken = AuthService.generateRefreshToken(user.id)
    
    user.refreshTokens.push(refreshToken)

    // Set cookie
    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    
    reply.setCookie('authToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: cookieMaxAge
    })

    return reply.send({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        lastLogin: user.lastLogin
      },
      accessToken,
      refreshToken
    })
  })

  // Refresh access token
  fastify.post<{ Body: RefreshTokenRequest }>('/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body

    if (!refreshToken) {
      return reply.status(400).send({
        error: 'Refresh token required'
      })
    }

    try {
      const decoded = await AuthService.verifyToken(refreshToken) as any
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type')
      }

      const user = users.get(decoded.userId)
      
      if (!user || !user.refreshTokens.includes(refreshToken)) {
        return reply.status(401).send({
          error: 'Invalid refresh token'
        })
      }

      // Generate new access token
      const newAccessToken = AuthService.generateToken(user)
      
      return reply.send({
        accessToken: newAccessToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role
        }
      })
    } catch (error) {
      return reply.status(401).send({
        error: 'Invalid refresh token'
      })
    }
  })

  // Logout user
  fastify.post('/auth/logout', async (request, reply) => {
    const token = AuthService.extractToken(request)
    
    if (token) {
      const payload = await AuthService.verifyToken(token)
      
      if (payload) {
        const user = users.get(payload.userId)
        if (user) {
          // Clear all refresh tokens
          user.refreshTokens = []
        }
      }
    }

    // Clear cookie
    reply.clearCookie('authToken')

    return reply.send({
      message: 'Logout successful'
    })
  })

  // Get current user profile
  fastify.get('/auth/me', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = users.get(request.user!.userId)
    
    if (!user) {
      return reply.status(404).send({
        error: 'User not found'
      })
    }

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        twoFactorEnabled: user.twoFactorEnabled,
        profileImage: user.profileImage
      }
    })
  })

  // Update user profile
  fastify.put('/auth/profile', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { username, profileImage } = request.body as { username?: string; profileImage?: string }
    const user = users.get(request.user!.userId)
    
    if (!user) {
      return reply.status(404).send({
        error: 'User not found'
      })
    }

    // Update fields
    if (username) {
      // Check if username is taken
      const existingUser = Array.from(users.values()).find(
        u => u.username === username && u.id !== user.id
      )
      
      if (existingUser) {
        return reply.status(409).send({
          error: 'Username already taken'
        })
      }
      
      user.username = username
    }

    if (profileImage !== undefined) {
      user.profileImage = profileImage
    }

    return reply.send({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        profileImage: user.profileImage
      }
    })
  })

  // Change password
  fastify.put<{ Body: UpdatePasswordRequest }>('/auth/change-password', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { currentPassword, newPassword, confirmPassword } = request.body
    const user = users.get(request.user!.userId)
    
    if (!user) {
      return reply.status(404).send({
        error: 'User not found'
      })
    }

    // Verify current password
    const isValidPassword = await AuthService.verifyPassword(currentPassword, user.password)
    
    if (!isValidPassword) {
      return reply.status(400).send({
        error: 'Current password is incorrect'
      })
    }

    if (newPassword !== confirmPassword) {
      return reply.status(400).send({
        error: 'New passwords do not match'
      })
    }

    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.valid) {
      return reply.status(400).send({
        error: 'Password validation failed',
        details: passwordValidation.errors
      })
    }

    // Update password
    user.password = await AuthService.hashPassword(newPassword)
    
    // Clear all refresh tokens to force re-login
    user.refreshTokens = []

    return reply.send({
      message: 'Password changed successfully'
    })
  })

  // Request password reset
  fastify.post<{ Body: ResetPasswordRequest }>('/auth/forgot-password', async (request, reply) => {
    const { email } = request.body

    if (!email || !validateEmail(email)) {
      return reply.status(400).send({
        error: 'Valid email is required'
      })
    }

    const user = Array.from(users.values()).find(u => u.email === email)
    
    // Always return success for security (don't reveal if email exists)
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex')
      const expires = Date.now() + 15 * 60 * 1000 // 15 minutes
      
      passwordResetTokens.set(resetToken, {
        email: user.email,
        token: resetToken,
        expires
      })

      // In production, send email with reset link
      console.log(`Password reset token for ${email}: ${resetToken}`)
    }

    return reply.send({
      message: 'If an account with that email exists, a password reset link has been sent'
    })
  })

  // List all users (admin only)
  fastify.get('/auth/users', {
    preHandler: [fastify.authenticate, fastify.requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN])]
  }, async (request, reply) => {
    const usersList = Array.from(users.values()).map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    }))

    return reply.send({
      users: usersList,
      total: usersList.length
    })
  })

  // Deactivate user (admin only)
  fastify.put('/auth/users/:userId/deactivate', {
    preHandler: [fastify.authenticate, fastify.requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN])]
  }, async (request, reply) => {
    const { userId } = request.params as { userId: string }
    const user = users.get(userId)

    if (!user) {
      return reply.status(404).send({
        error: 'User not found'
      })
    }

    user.isActive = false
    user.refreshTokens = [] // Clear all sessions

    return reply.send({
      message: 'User deactivated successfully'
    })
  })
}