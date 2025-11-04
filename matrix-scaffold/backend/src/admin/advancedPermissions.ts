/**
 * Advanced Permissions
 * Phase 7.3.1: Professional Enhancements
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'manage'
export type PermissionResource = 'user' | 'integration' | 'deployment' | 'domain' | 'monitoring' | 'config' | 'analytics' | 'report' | '*'

export interface Permission {
  id: string
  resource: PermissionResource
  action: PermissionAction
  conditions?: Record<string, unknown>
}

export interface PermissionSet {
  id: string
  name: string
  description?: string
  permissions: Permission[]
  createdAt: Date
  updatedAt: Date
}

export interface UserPermission {
  userId: string
  permissionSetId?: string
  customPermissions: Permission[]
  inheritedPermissions: Permission[]
  effectivePermissions: Permission[]
  createdAt: Date
  updatedAt: Date
}

export interface PermissionDelegation {
  id: string
  fromUserId: string
  toUserId: string
  permissionSetId: string
  expiresAt?: Date
  createdAt: Date
  active: boolean
}

export class AdvancedPermissions {
  private permissionSets: Map<string, PermissionSet> = new Map()
  private userPermissions: Map<string, UserPermission> = new Map()
  private delegations: Map<string, PermissionDelegation> = new Map()
  private permissionCache: Map<string, Permission[]> = new Map() // userId -> effective permissions

  /**
   * Initialize Advanced Permissions
   */
  async initialize(): Promise<void> {
    try {
      // Load default permission sets
      this.loadDefaultPermissionSets()

      // Start periodic cache refresh
      this.startPeriodicCacheRefresh()

      // Subscribe to events
      this.subscribeToEvents()

      logger.info('Advanced Permissions initialized')
    } catch (error: any) {
      logger.error('Advanced Permissions initialization failed:', error)
      throw error
    }
  }

  /**
   * Load default permission sets
   */
  private loadDefaultPermissionSets(): void {
    // Viewer permission set
    this.addPermissionSet({
      id: 'viewer',
      name: 'Viewer',
      description: 'Read-only access to all resources',
      permissions: [
        { id: 'view-all', resource: '*', action: 'read' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Developer permission set
    this.addPermissionSet({
      id: 'developer',
      name: 'Developer',
      description: 'Access to logs and development tools',
      permissions: [
        { id: 'view-all', resource: '*', action: 'read' },
        { id: 'manage-deployments', resource: 'deployment', action: 'manage' },
        { id: 'view-monitoring', resource: 'monitoring', action: 'read' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Admin permission set
    this.addPermissionSet({
      id: 'admin',
      name: 'Admin',
      description: 'Full access except user management',
      permissions: [
        { id: 'manage-all', resource: '*', action: '*' as PermissionAction },
        { id: 'no-user-management', resource: 'user', action: 'read' }, // Explicit deny for user management
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Owner permission set
    this.addPermissionSet({
      id: 'owner',
      name: 'Owner',
      description: 'Full access to all resources',
      permissions: [
        { id: 'full-access', resource: '*', action: '*' as PermissionAction },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    logger.debug('Default permission sets loaded')
  }

  /**
   * Start periodic cache refresh
   */
  private startPeriodicCacheRefresh(): void {
    // Refresh permission cache every 5 minutes
    setInterval(() => {
      this.refreshPermissionCache()
    }, 5 * 60 * 1000)

    logger.debug('Periodic cache refresh started')
  }

  /**
   * Subscribe to events
   */
  private subscribeToEvents(): void {
    // Subscribe to permission changes
    eventBus.subscribe('admin.permission.changed', (data: any) => {
      try {
        const userId = data.userId
        if (userId) {
          this.permissionCache.delete(userId)
          this.refreshUserPermissions(userId)
        }
      } catch (err: any) {
        logger.error('Permission change subscription failed:', err)
      }
    })

    logger.debug('Permissions event subscriptions initialized')
  }

  /**
   * Add permission set
   */
  addPermissionSet(set: PermissionSet): void {
    try {
      this.permissionSets.set(set.id, set)

      logger.info('Permission set added', {
        setId: set.id,
        name: set.name,
      })

      // Publish event
      eventBus.publish('admin.permission.set.added', {
        set,
      })
    } catch (error: any) {
      logger.error('Add permission set failed:', error)
      throw error
    }
  }

  /**
   * Get permission set
   */
  getPermissionSet(setId: string): PermissionSet | null {
    return this.permissionSets.get(setId) || null
  }

  /**
   * Get permission sets
   */
  getPermissionSets(): PermissionSet[] {
    return Array.from(this.permissionSets.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Assign permission set to user
   */
  assignPermissionSet(userId: string, permissionSetId: string): void {
    try {
      const set = this.getPermissionSet(permissionSetId)
      if (!set) {
        throw new Error(`Permission set ${permissionSetId} not found`)
      }

      let userPermission = this.userPermissions.get(userId)

      if (!userPermission) {
        userPermission = {
          userId,
          customPermissions: [],
          inheritedPermissions: [],
          effectivePermissions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }

      userPermission.permissionSetId = permissionSetId
      userPermission.inheritedPermissions = [...set.permissions]
      userPermission.updatedAt = new Date()

      // Recalculate effective permissions
      this.recalculateEffectivePermissions(userId, userPermission)

      this.userPermissions.set(userId, userPermission)
      this.permissionCache.delete(userId)

      logger.info('Permission set assigned', {
        userId,
        permissionSetId,
      })

      // Publish event
      eventBus.publish('admin.permission.set.assigned', {
        userId,
        permissionSetId,
      })
    } catch (error: any) {
      logger.error('Assign permission set failed:', error)
      throw error
    }
  }

  /**
   * Add custom permission to user
   */
  addCustomPermission(userId: string, permission: Permission): void {
    try {
      let userPermission = this.userPermissions.get(userId)

      if (!userPermission) {
        userPermission = {
          userId,
          customPermissions: [],
          inheritedPermissions: [],
          effectivePermissions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }

      // Check if permission already exists
      const existing = userPermission.customPermissions.find(
        (p) => p.resource === permission.resource && p.action === permission.action
      )

      if (existing) {
        // Update existing permission
        Object.assign(existing, permission)
      } else {
        // Add new permission
        userPermission.customPermissions.push(permission)
      }

      userPermission.updatedAt = new Date()

      // Recalculate effective permissions
      this.recalculateEffectivePermissions(userId, userPermission)

      this.userPermissions.set(userId, userPermission)
      this.permissionCache.delete(userId)

      logger.info('Custom permission added', {
        userId,
        permissionId: permission.id,
      })

      // Publish event
      eventBus.publish('admin.permission.custom.added', {
        userId,
        permission,
      })
    } catch (error: any) {
      logger.error('Add custom permission failed:', error)
      throw error
    }
  }

  /**
   * Remove custom permission from user
   */
  removeCustomPermission(userId: string, permissionId: string): void {
    try {
      const userPermission = this.userPermissions.get(userId)
      if (!userPermission) {
        return
      }

      userPermission.customPermissions = userPermission.customPermissions.filter(
        (p) => p.id !== permissionId
      )
      userPermission.updatedAt = new Date()

      // Recalculate effective permissions
      this.recalculateEffectivePermissions(userId, userPermission)

      this.userPermissions.set(userId, userPermission)
      this.permissionCache.delete(userId)

      logger.info('Custom permission removed', {
        userId,
        permissionId,
      })

      // Publish event
      eventBus.publish('admin.permission.custom.removed', {
        userId,
        permissionId,
      })
    } catch (error: any) {
      logger.error('Remove custom permission failed:', error)
    }
  }

  /**
   * Recalculate effective permissions
   */
  private recalculateEffectivePermissions(userId: string, userPermission: UserPermission): void {
    try {
      const effective: Permission[] = []

      // Add inherited permissions
      for (const permission of userPermission.inheritedPermissions) {
        effective.push(permission)
      }

      // Add custom permissions (override inherited)
      for (const permission of userPermission.customPermissions) {
        const existingIndex = effective.findIndex(
          (p) => p.resource === permission.resource && p.action === permission.action
        )

        if (existingIndex >= 0) {
          effective[existingIndex] = permission
        } else {
          effective.push(permission)
        }
      }

      // Add delegated permissions
      const delegations = this.getActiveDelegations(userId)
      for (const delegation of delegations) {
        const set = this.getPermissionSet(delegation.permissionSetId)
        if (set) {
          for (const permission of set.permissions) {
            const existingIndex = effective.findIndex(
              (p) => p.resource === permission.resource && p.action === permission.action
            )

            if (existingIndex < 0) {
              effective.push(permission)
            }
          }
        }
      }

      userPermission.effectivePermissions = effective

      // Update cache
      this.permissionCache.set(userId, effective)

      logger.debug('Effective permissions recalculated', {
        userId,
        count: effective.length,
      })
    } catch (error: any) {
      logger.error('Recalculate effective permissions failed:', error)
    }
  }

  /**
   * Check permission
   */
  hasPermission(userId: string, resource: PermissionResource, action: PermissionAction): boolean {
    try {
      // Check cache first
      let effectivePermissions = this.permissionCache.get(userId)

      if (!effectivePermissions) {
        // Load from user permissions
        const userPermission = this.userPermissions.get(userId)
        if (!userPermission) {
          return false
        }

        // Recalculate if needed
        this.recalculateEffectivePermissions(userId, userPermission)
        effectivePermissions = userPermission.effectivePermissions
      }

      // Check for wildcard permissions
      const hasWildcard = effectivePermissions.some(
        (p) => p.resource === '*' && (p.action === action || p.action === '*' as PermissionAction)
      )

      if (hasWildcard) {
        return true
      }

      // Check for specific resource permission
      const hasResourcePermission = effectivePermissions.some(
        (p) => (p.resource === resource || p.resource === '*') && (p.action === action || p.action === '*' as PermissionAction)
      )

      return hasResourcePermission
    } catch (error: any) {
      logger.error('Check permission failed:', error)
      return false
    }
  }

  /**
   * Get user permissions
   */
  getUserPermissions(userId: string): UserPermission | null {
    return this.userPermissions.get(userId) || null
  }

  /**
   * Delegate permissions
   */
  delegatePermissions(
    fromUserId: string,
    toUserId: string,
    permissionSetId: string,
    expiresAt?: Date
  ): string {
    try {
      const delegationId = `delegation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      const delegation: PermissionDelegation = {
        id: delegationId,
        fromUserId,
        toUserId,
        permissionSetId,
        expiresAt,
        createdAt: new Date(),
        active: true,
      }

      this.delegations.set(delegationId, delegation)

      // Refresh recipient permissions
      const toUserPermission = this.userPermissions.get(toUserId)
      if (toUserPermission) {
        this.recalculateEffectivePermissions(toUserId, toUserPermission)
      }

      logger.info('Permissions delegated', {
        delegationId,
        fromUserId,
        toUserId,
        permissionSetId,
      })

      // Publish event
      eventBus.publish('admin.permission.delegated', {
        delegation,
      })

      return delegationId
    } catch (error: any) {
      logger.error('Delegate permissions failed:', error)
      throw error
    }
  }

  /**
   * Revoke delegation
   */
  revokeDelegation(delegationId: string): void {
    try {
      const delegation = this.delegations.get(delegationId)
      if (!delegation) {
        return
      }

      delegation.active = false
      this.delegations.set(delegationId, delegation)

      // Refresh recipient permissions
      const toUserPermission = this.userPermissions.get(delegation.toUserId)
      if (toUserPermission) {
        this.recalculateEffectivePermissions(delegation.toUserId, toUserPermission)
      }

      logger.info('Delegation revoked', {
        delegationId,
      })

      // Publish event
      eventBus.publish('admin.permission.delegation.revoked', {
        delegationId,
      })
    } catch (error: any) {
      logger.error('Revoke delegation failed:', error)
    }
  }

  /**
   * Get active delegations
   */
  private getActiveDelegations(userId: string): PermissionDelegation[] {
    const now = new Date()
    return Array.from(this.delegations.values()).filter(
      (d) =>
        d.toUserId === userId &&
        d.active &&
        (!d.expiresAt || d.expiresAt > now)
    )
  }

  /**
   * Refresh permission cache
   */
  private refreshPermissionCache(): void {
    try {
      // Clean expired delegations
      const now = new Date()
      for (const [id, delegation] of this.delegations.entries()) {
        if (delegation.expiresAt && delegation.expiresAt < now && delegation.active) {
          delegation.active = false
          this.delegations.set(id, delegation)
        }
      }

      // Refresh all user permissions
      for (const userId of this.userPermissions.keys()) {
        this.refreshUserPermissions(userId)
      }

      logger.debug('Permission cache refreshed')
    } catch (error: any) {
      logger.error('Refresh permission cache failed:', error)
    }
  }

  /**
   * Refresh user permissions
   */
  private refreshUserPermissions(userId: string): void {
    try {
      const userPermission = this.userPermissions.get(userId)
      if (userPermission) {
        this.recalculateEffectivePermissions(userId, userPermission)
      }
    } catch (error: any) {
      logger.error('Refresh user permissions failed:', error)
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalPermissionSets: number
    totalUsers: number
    totalDelegations: number
    activeDelegations: number
    permissionsByResource: Record<string, number>
  } {
    const users = Array.from(this.userPermissions.values())
    const delegations = Array.from(this.delegations.values())
    const permissionsByResource: Record<string, number> = {}

    for (const user of users) {
      for (const permission of user.effectivePermissions) {
        const resource = permission.resource === '*' ? 'all' : permission.resource
        permissionsByResource[resource] = (permissionsByResource[resource] || 0) + 1
      }
    }

    return {
      totalPermissionSets: this.permissionSets.size,
      totalUsers: users.length,
      totalDelegations: delegations.length,
      activeDelegations: delegations.filter((d) => d.active).length,
      permissionsByResource,
    }
  }
}

// Global Advanced Permissions
export const advancedPermissions = new AdvancedPermissions()

