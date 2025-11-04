/**
 * RBAC System
 * Phase 2: Enterprise Features - Role-Based Access Control
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { prisma } from '../config/database'

export type Role = 'admin' | 'user' | 'viewer' | 'developer'
export type Permission = 'read' | 'write' | 'delete' | 'admin'

export interface User {
  id: string
  email: string
  role: Role
  permissions: Permission[]
  createdAt: Date
  updatedAt: Date
}

// Role permissions mapping
const rolePermissions: Record<Role, Permission[]> = {
  admin: ['read', 'write', 'delete', 'admin'],
  developer: ['read', 'write'],
  user: ['read', 'write'],
  viewer: ['read']
}

export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false
  return user.permissions.includes(permission) || user.permissions.includes('admin')
}

export function hasRole(user: User | null, role: Role): boolean {
  if (!user) return false
  return user.role === role || user.role === 'admin'
}

export function getUserPermissions(role: Role): Permission[] {
  return rolePermissions[role] || []
}

// User management (full RBAC)
export interface UserWithPermissions extends User {
  projects: string[]
  lastLogin?: Date
}

export class RBACManager {
  private users: Map<string, UserWithPermissions> = new Map()

  async createUser(
    email: string,
    role: Role = 'user',
    options?: {
      password?: string
      projects?: string[]
    }
  ): Promise<{ success: boolean; user?: UserWithPermissions; error?: string }> {
    try {
      const permissions = getUserPermissions(role)
      const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      const user: UserWithPermissions = {
        id: userId,
        email,
        role,
        permissions,
        projects: options?.projects || [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      this.users.set(userId, user)

      // Log user creation
      const { auditLogger } = await import('./audit')
      await auditLogger.log('user.created', 'user', {
        userId,
        details: { email, role, permissions }
      })

      logger.info(`User created: ${email}`, { userId, email, role, permissions })

      return {
        success: true,
        user
      }
    } catch (error: any) {
      logger.error('createUser error:', error)
      return { success: false, error: error.message }
    }
  }

  async updateUserRole(
    userId: string,
    role: Role
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = this.users.get(userId)
      if (!user) {
        return { success: false, error: 'User not found' }
      }

      const permissions = getUserPermissions(role)
      user.role = role
      user.permissions = permissions
      user.updatedAt = new Date()

      this.users.set(userId, user)

      // Log role update
      const { auditLogger } = await import('./audit')
      await auditLogger.log('user.role.updated', 'user', {
        userId,
        details: { role, permissions }
      })

      logger.info(`User role updated: ${userId}`, { userId, role, permissions })

      return { success: true }
    } catch (error: any) {
      logger.error('updateUserRole error:', error)
      return { success: false, error: error.message }
    }
  }

  async assignProject(userId: string, projectId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = this.users.get(userId)
      if (!user) {
        return { success: false, error: 'User not found' }
      }

      if (!user.projects.includes(projectId)) {
        user.projects.push(projectId)
        user.updatedAt = new Date()
        this.users.set(userId, user)

        // Log project assignment
        const { auditLogger } = await import('./audit')
        await auditLogger.log('user.project.assigned', 'project', {
          userId,
          resourceId: projectId
        })
      }

      return { success: true }
    } catch (error: any) {
      logger.error('assignProject error:', error)
      return { success: false, error: error.message }
    }
  }

  async removeProject(userId: string, projectId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = this.users.get(userId)
      if (!user) {
        return { success: false, error: 'User not found' }
      }

      user.projects = user.projects.filter((p) => p !== projectId)
      user.updatedAt = new Date()
      this.users.set(userId, user)

      // Log project removal
      const { auditLogger } = await import('./audit')
      await auditLogger.log('user.project.removed', 'project', {
        userId,
        resourceId: projectId
      })

      return { success: true }
    } catch (error: any) {
      logger.error('removeProject error:', error)
      return { success: false, error: error.message }
    }
  }

  async getUser(userId: string): Promise<UserWithPermissions | null> {
    return this.users.get(userId) || null
  }

  async listUsers(): Promise<UserWithPermissions[]> {
    return Array.from(this.users.values())
  }
}

// Global RBAC Manager
export const rbacManager = new RBACManager()

// Legacy functions (for backward compatibility)
export async function createUser(
  email: string,
  role: Role = 'user'
): Promise<{ success: boolean; user?: User; error?: string }> {
  const result = await rbacManager.createUser(email, role)
  return {
    success: result.success,
    user: result.user ? {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      permissions: result.user.permissions,
      createdAt: result.user.createdAt,
      updatedAt: result.user.updatedAt
    } : undefined,
    error: result.error
  }
}

export async function updateUserRole(
  userId: string,
  role: Role
): Promise<{ success: boolean; error?: string }> {
  return await rbacManager.updateUserRole(userId, role)
}
