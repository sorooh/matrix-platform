/**
 * Role-Based Access Control (RBAC)
 * Global-Ready Architecture with enterprise RBAC
 */

import { logger } from '../config/logger'

export type Role = 'admin' | 'user' | 'viewer' | 'developer' | 'manager'

export interface Permission {
  resource: string
  action: string
}

export interface RolePermissions {
  role: Role
  permissions: Permission[]
}

// Role permissions mapping
const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    { resource: '*', action: '*' },
    { resource: 'projects', action: '*' },
    { resource: 'jobs', action: '*' },
    { resource: 'users', action: '*' },
    { resource: 'system', action: '*' }
  ],
  developer: [
    { resource: 'projects', action: 'read' },
    { resource: 'projects', action: 'write' },
    { resource: 'jobs', action: 'read' },
    { resource: 'jobs', action: 'write' },
    { resource: 'memory', action: 'read' },
    { resource: 'memory', action: 'write' }
  ],
  manager: [
    { resource: 'projects', action: 'read' },
    { resource: 'projects', action: 'write' },
    { resource: 'jobs', action: 'read' },
    { resource: 'users', action: 'read' },
    { resource: 'kpis', action: 'read' }
  ],
  user: [
    { resource: 'projects', action: 'read' },
    { resource: 'jobs', action: 'read' },
    { resource: 'memory', action: 'read' }
  ],
  viewer: [
    { resource: 'projects', action: 'read' },
    { resource: 'jobs', action: 'read' },
    { resource: 'kpis', action: 'read' }
  ]
}

export function hasPermission(role: Role, resource: string, action: string): boolean {
  const permissions = rolePermissions[role] || []
  
  // Check for wildcard admin
  if (permissions.some((p) => p.resource === '*' && p.action === '*')) {
    return true
  }

  // Check for specific permission
  return permissions.some(
    (p) => (p.resource === resource || p.resource === '*') && (p.action === action || p.action === '*')
  )
}

export function getRolePermissions(role: Role): Permission[] {
  return rolePermissions[role] || []
}

export function requirePermission(role: Role, resource: string, action: string): void {
  if (!hasPermission(role, resource, action)) {
    logger.warn('Permission denied', { role, resource, action })
    throw new Error(`Permission denied: ${role} cannot ${action} on ${resource}`)
  }
}

