/**
 * User Access & Role System
 * Phase 7.3: Admin Dashboard & Integration Control
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { advancedSecretManager } from '../deployment/secretManager'
import crypto from 'crypto'

export type UserRole = 'owner' | 'admin' | 'developer' | 'viewer'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  twoFactorEnabled: boolean
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
  active: boolean
}

export interface UserInvitation {
  id: string
  email: string
  role: UserRole
  invitedBy: string
  invitedAt: Date
  expiresAt: Date
  accepted: boolean
  acceptedAt?: Date
  token: string
}

export interface Permission {
  resource: string
  actions: string[]
}

export interface RolePermissions {
  role: UserRole
  permissions: Permission[]
}

export class UserAccessAndRoleSystem {
  private users: Map<string, User> = new Map()
  private invitations: Map<string, UserInvitation> = new Map()
  private rolePermissions: Map<UserRole, RolePermissions> = new Map()

  /**
   * Initialize User Access & Role System
   */
  async initialize(): Promise<void> {
    try {
      // Initialize role permissions
      this.initializeRolePermissions()

      logger.info('User Access & Role System initialized')
    } catch (error: any) {
      logger.error('User Access & Role System initialization failed:', error)
      throw error
    }
  }

  /**
   * Initialize role permissions
   */
  private initializeRolePermissions(): void {
    const permissions: RolePermissions[] = [
      {
        role: 'owner',
        permissions: [
          { resource: '*', actions: ['*'] }, // Full access
        ],
      },
      {
        role: 'admin',
        permissions: [
          { resource: 'deployments', actions: ['create', 'update', 'delete', 'read'] },
          { resource: 'domains', actions: ['create', 'update', 'delete', 'read'] },
          { resource: 'monitoring', actions: ['read'] },
          { resource: 'keys', actions: ['create', 'update', 'delete', 'read'] },
          { resource: 'config', actions: ['update', 'read'] },
          { resource: 'users', actions: ['create', 'update', 'read'] },
        ],
      },
      {
        role: 'developer',
        permissions: [
          { resource: 'deployments', actions: ['create', 'read'] },
          { resource: 'monitoring', actions: ['read'] },
          { resource: 'logs', actions: ['read'] },
          { resource: 'config', actions: ['read'] },
        ],
      },
      {
        role: 'viewer',
        permissions: [
          { resource: 'deployments', actions: ['read'] },
          { resource: 'monitoring', actions: ['read'] },
          { resource: 'config', actions: ['read'] },
        ],
      },
    ]

    for (const rolePerm of permissions) {
      this.rolePermissions.set(rolePerm.role, rolePerm)
    }

    logger.debug('Role permissions initialized')
  }

  /**
   * Create user
   */
  async createUser(config: {
    email: string
    name: string
    role: UserRole
    avatar?: string
  }): Promise<string> {
    try {
      const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      logger.info('Creating user', {
        userId,
        email: config.email,
        role: config.role,
      })

      const user: User = {
        id: userId,
        email: config.email,
        name: config.name,
        role: config.role,
        avatar: config.avatar,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true,
      }

      this.users.set(userId, user)

      logger.info('User created', {
        userId,
        email: config.email,
      })

      eventBus.publish('admin.user.created', {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      })

      return userId
    } catch (error: any) {
      logger.error('Create user failed:', error)
      throw error
    }
  }

  /**
   * Update user
   */
  async updateUser(
    userId: string,
    updates: {
      name?: string
      role?: UserRole
      avatar?: string
      active?: boolean
    }
  ): Promise<void> {
    try {
      const user = this.users.get(userId)
      if (!user) {
        throw new Error(`User ${userId} not found`)
      }

      logger.info('Updating user', {
        userId,
      })

      if (updates.name) {
        user.name = updates.name
      }
      if (updates.role) {
        user.role = updates.role
      }
      if (updates.avatar !== undefined) {
        user.avatar = updates.avatar
      }
      if (updates.active !== undefined) {
        user.active = updates.active
      }

      user.updatedAt = new Date()

      this.users.set(userId, user)

      logger.info('User updated', {
        userId,
      })

      eventBus.publish('admin.user.updated', {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      })
    } catch (error: any) {
      logger.error('Update user failed:', error)
      throw error
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const user = this.users.get(userId)
      if (!user) {
        throw new Error(`User ${userId} not found`)
      }

      logger.info('Deleting user', {
        userId,
      })

      this.users.delete(userId)

      logger.info('User deleted', {
        userId,
      })

      eventBus.publish('admin.user.deleted', {
        user: {
          id: user.id,
          email: user.email,
        },
      })
    } catch (error: any) {
      logger.error('Delete user failed:', error)
      throw error
    }
  }

  /**
   * Invite user
   */
  async inviteUser(config: {
    email: string
    role: UserRole
    invitedBy: string
  }): Promise<string> {
    try {
      const invitationId = `invitation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      logger.info('Inviting user', {
        invitationId,
        email: config.email,
        role: config.role,
      })

      const invitation: UserInvitation = {
        id: invitationId,
        email: config.email,
        role: config.role,
        invitedBy: config.invitedBy,
        invitedAt: new Date(),
        expiresAt,
        accepted: false,
        token,
      }

      this.invitations.set(invitationId, invitation)

      logger.info('User invited', {
        invitationId,
        email: config.email,
        token, // In production, send via email
      })

      eventBus.publish('admin.user.invited', {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
        },
      })

      return invitationId
    } catch (error: any) {
      logger.error('Invite user failed:', error)
      throw error
    }
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(token: string, userData: { name: string; avatar?: string }): Promise<string> {
    try {
      const invitation = Array.from(this.invitations.values()).find((inv) => inv.token === token)

      if (!invitation) {
        throw new Error('Invalid invitation token')
      }

      if (invitation.accepted) {
        throw new Error('Invitation already accepted')
      }

      if (invitation.expiresAt < new Date()) {
        throw new Error('Invitation expired')
      }

      logger.info('Accepting invitation', {
        invitationId: invitation.id,
        email: invitation.email,
      })

      // Create user
      const userId = await this.createUser({
        email: invitation.email,
        name: userData.name,
        role: invitation.role,
        avatar: userData.avatar,
      })

      // Mark invitation as accepted
      invitation.accepted = true
      invitation.acceptedAt = new Date()

      this.invitations.set(invitation.id, invitation)

      logger.info('Invitation accepted', {
        invitationId: invitation.id,
        userId,
      })

      eventBus.publish('admin.user.invitation.accepted', {
        invitation: {
          id: invitation.id,
          email: invitation.email,
        },
        userId,
      })

      return userId
    } catch (error: any) {
      logger.error('Accept invitation failed:', error)
      throw error
    }
  }

  /**
   * Enable 2FA
   */
  async enable2FA(userId: string): Promise<{ secret: string; qrCode: string }> {
    try {
      const user = this.users.get(userId)
      if (!user) {
        throw new Error(`User ${userId} not found`)
      }

      // Generate 2FA secret
      const secret = crypto.randomBytes(20).toString('base32')
      // In production, generate QR code
      const qrCode = `otpauth://totp/Matrix:${user.email}?secret=${secret}&issuer=Matrix`

      // Store secret in secret manager
      await advancedSecretManager.createSecret({
        name: `2fa-${userId}`,
        value: secret,
        type: 'token',
        provider: 'internal',
        metadata: {
          userId,
        },
      })

      user.twoFactorEnabled = true
      user.updatedAt = new Date()

      this.users.set(userId, user)

      logger.info('2FA enabled', {
        userId,
      })

      eventBus.publish('admin.user.2fa.enabled', {
        userId,
      })

      return { secret, qrCode }
    } catch (error: any) {
      logger.error('Enable 2FA failed:', error)
      throw error
    }
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string): Promise<void> {
    try {
      const user = this.users.get(userId)
      if (!user) {
        throw new Error(`User ${userId} not found`)
      }

      // Delete 2FA secret from secret manager
      const secrets = advancedSecretManager.getAllSecrets()
      const twoFASecret = secrets.find((s) => s.metadata?.userId === userId && s.name.startsWith('2fa-'))

      if (twoFASecret) {
        await advancedSecretManager.deleteSecret(twoFASecret.id)
      }

      user.twoFactorEnabled = false
      user.updatedAt = new Date()

      this.users.set(userId, user)

      logger.info('2FA disabled', {
        userId,
      })

      eventBus.publish('admin.user.2fa.disabled', {
        userId,
      })
    } catch (error: any) {
      logger.error('Disable 2FA failed:', error)
      throw error
    }
  }

  /**
   * Check permission
   */
  hasPermission(userId: string, resource: string, action: string): boolean {
    try {
      const user = this.users.get(userId)
      if (!user || !user.active) {
        return false
      }

      const rolePerm = this.rolePermissions.get(user.role)
      if (!rolePerm) {
        return false
      }

      for (const permission of rolePerm.permissions) {
        // Check wildcard
        if (permission.resource === '*' && permission.actions.includes('*')) {
          return true
        }

        // Check resource match
        if (permission.resource === resource || permission.resource === '*') {
          // Check action match
          if (permission.actions.includes(action) || permission.actions.includes('*')) {
            return true
          }
        }
      }

      return false
    } catch (error: any) {
      logger.error('Check permission failed:', error)
      return false
    }
  }

  /**
   * Get user
   */
  getUser(userId: string): User | null {
    return this.users.get(userId) || null
  }

  /**
   * Get user by email
   */
  getUserByEmail(email: string): User | null {
    return Array.from(this.users.values()).find((u) => u.email === email) || null
  }

  /**
   * Get all users
   */
  getAllUsers(): User[] {
    return Array.from(this.users.values())
  }

  /**
   * Get invitation
   */
  getInvitation(invitationId: string): UserInvitation | null {
    return this.invitations.get(invitationId) || null
  }

  /**
   * Get invitation by token
   */
  getInvitationByToken(token: string): UserInvitation | null {
    return Array.from(this.invitations.values()).find((inv) => inv.token === token) || null
  }

  /**
   * Get all invitations
   */
  getAllInvitations(includeAccepted = false): UserInvitation[] {
    let invitations = Array.from(this.invitations.values())

    if (!includeAccepted) {
      invitations = invitations.filter((inv) => !inv.accepted)
    }

    return invitations.sort((a, b) => b.invitedAt.getTime() - a.invitedAt.getTime())
  }

  /**
   * Get role permissions
   */
  getRolePermissions(role: UserRole): RolePermissions | null {
    return this.rolePermissions.get(role) || null
  }
}

// Global User Access & Role System
export const userAccessAndRoleSystem = new UserAccessAndRoleSystem()

