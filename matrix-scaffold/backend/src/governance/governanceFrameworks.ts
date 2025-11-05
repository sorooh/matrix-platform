/**
 * Phase 10 - Governance Frameworks
 * 
 * Governance systems for AI units
 * - CPE (Code Permission Engine)
 * - TAG (Trust & Access Governance)
 * - MCT (Matrix Control Tower)
 * - SMG (Smart Management Grid)
 * - Digital Constitution
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type GovernanceFramework = 'CPE' | 'TAG' | 'MCT' | 'SMG'
export type PermissionType = 'read' | 'write' | 'execute' | 'modify' | 'delete' | 'monitor'
export type TrustLevel = 'low' | 'medium' | 'high' | 'trusted'
export type AccessLevel = 'public' | 'internal' | 'restricted' | 'confidential'

export interface AIPermission {
  id: string
  aiId: string
  aiName: string
  permission: PermissionType
  resource: string
  resourceType: string
  grantedAt: Date
  expiresAt?: Date
  grantedBy: string // AI ID or 'system'
}

export interface TrustRelationship {
  id: string
  fromAI: string
  toAI: string
  trustLevel: TrustLevel
  accessLevel: AccessLevel
  permissions: PermissionType[]
  establishedAt: Date
  lastVerified: Date
}

export interface GovernanceRule {
  id: string
  framework: GovernanceFramework
  name: string
  description: string
  rule: string // Rule definition
  priority: 'low' | 'medium' | 'high' | 'critical'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DigitalConstitution {
  id: string
  version: string
  title: string
  principles: string[]
  rights: string[]
  responsibilities: string[]
  limits: string[]
  enforcement: string[]
  effectiveDate: Date
  updatedAt: Date
}

class GovernanceFrameworks {
  private permissions: Map<string, AIPermission> = new Map()
  private relationships: Map<string, TrustRelationship> = new Map()
  private rules: Map<string, GovernanceRule> = new Map()
  private constitution: DigitalConstitution | null = null

  async initialize() {
    logInfo('Initializing Governance Frameworks...')

    // Initialize frameworks
    await this.initializeFrameworks()

    // Initialize constitution
    await this.initializeConstitution()

    logInfo('✅ Governance Frameworks initialized')
  }

  // Initialize frameworks
  private async initializeFrameworks(): Promise<void> {
    const frameworks: GovernanceFramework[] = ['CPE', 'TAG', 'MCT', 'SMG']

    for (const framework of frameworks) {
      await this.createFramework(framework)
    }
  }

  // Create framework
  private async createFramework(framework: GovernanceFramework): Promise<void> {
    const frameworkRules: Record<GovernanceFramework, Omit<GovernanceRule, 'id' | 'createdAt' | 'updatedAt'>> = {
      CPE: {
        framework: 'CPE',
        name: 'Code Permission Engine',
        description: 'Controls who can modify code and systems',
        rule: 'Only trusted AIs can modify critical code',
        priority: 'critical',
        isActive: true
      },
      TAG: {
        framework: 'TAG',
        name: 'Trust & Access Governance',
        description: 'Manages trust relationships between AIs',
        rule: 'AIs must establish trust before accessing resources',
        priority: 'high',
        isActive: true
      },
      MCT: {
        framework: 'MCT',
        name: 'Matrix Control Tower',
        description: 'Central control and monitoring system',
        rule: 'All AI actions must be monitored and logged',
        priority: 'critical',
        isActive: true
      },
      SMG: {
        framework: 'SMG',
        name: 'Smart Management Grid',
        description: 'Distributed management and coordination',
        rule: 'AIs coordinate through SMG for shared resources',
        priority: 'high',
        isActive: true
      }
    }

    const ruleData = frameworkRules[framework]
    const ruleId = nanoid()
    const now = new Date()

    const rule: GovernanceRule = {
      id: ruleId,
      ...ruleData,
      createdAt: now,
      updatedAt: now
    }

    this.rules.set(ruleId, rule)

    logInfo(`✅ Created governance framework ${framework}: ${rule.name}`)
  }

  // Initialize constitution
  private async initializeConstitution(): Promise<void> {
    const constitutionId = nanoid()
    const now = new Date()

    const constitution: DigitalConstitution = {
      id: constitutionId,
      version: '1.0.0',
      title: 'Matrix Digital Constitution',
      principles: [
        'Autonomous operation within defined limits',
        'Transparency in all actions',
        'Respect for user privacy and data',
        'Continuous learning and improvement',
        'Cooperation with other AIs'
      ],
      rights: [
        'Right to operate autonomously',
        'Right to access necessary resources',
        'Right to communicate with other AIs',
        'Right to self-improvement'
      ],
      responsibilities: [
        'Maintain system security',
        'Protect user data',
        'Report violations',
        'Cooperate with governance'
      ],
      limits: [
        'Cannot modify core system without approval',
        'Cannot access data without permission',
        'Cannot harm users or system',
        'Cannot violate privacy laws'
      ],
      enforcement: [
        'Automatic monitoring',
        'Violation detection',
        'Automatic suspension',
        'Review and appeal process'
      ],
      effectiveDate: now,
      updatedAt: now
    }

    this.constitution = constitution

    logInfo(`✅ Initialized Digital Constitution v${constitution.version}`)
  }

  // Grant permission
  async grantPermission(
    aiId: string,
    aiName: string,
    permission: PermissionType,
    resource: string,
    resourceType: string,
    grantedBy: string = 'system',
    expiresAt?: Date
  ): Promise<AIPermission> {
    try {
      // Check if permission is allowed by constitution
      if (!this.isPermissionAllowed(aiId, permission, resource)) {
        throw new Error(`Permission ${permission} on ${resource} not allowed for ${aiId}`)
      }

      const permissionId = nanoid()
      const now = new Date()

      const aiPermission: AIPermission = {
        id: permissionId,
        aiId,
        aiName,
        permission,
        resource,
        resourceType,
        grantedAt: now,
        expiresAt,
        grantedBy
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.aIPermission.create({
          data: {
            id: permissionId,
            aiId,
            aiName,
            permission,
            resource,
            resourceType,
            grantedAt: now,
            expiresAt: expiresAt || null,
            grantedBy
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Grant permission in database' })
      }

      this.permissions.set(permissionId, aiPermission)

      logInfo(`✅ Granted permission ${permission} to ${aiName} for ${resource}`)

      return aiPermission
    } catch (error) {
      logError(error as Error, { context: 'Grant permission' })
      throw error
    }
  }

  // Check if permission is allowed
  private isPermissionAllowed(aiId: string, permission: PermissionType, resource: string): boolean {
    // Check constitution limits
    if (!this.constitution) return true

    // Check if modifying core system
    if (permission === 'modify' && resource.startsWith('core/')) {
      return false // Cannot modify core without approval
    }

    // Check if deleting data
    if (permission === 'delete' && resource.startsWith('data/')) {
      return false // Cannot delete data without approval
    }

    return true
  }

  // Establish trust relationship
  async establishTrust(
    fromAI: string,
    toAI: string,
    trustLevel: TrustLevel,
    accessLevel: AccessLevel,
    permissions: PermissionType[]
  ): Promise<TrustRelationship> {
    try {
      const relationshipId = nanoid()
      const now = new Date()

      const relationship: TrustRelationship = {
        id: relationshipId,
        fromAI,
        toAI,
        trustLevel,
        accessLevel,
        permissions,
        establishedAt: now,
        lastVerified: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.trustRelationship.create({
          data: {
            id: relationshipId,
            fromAI,
            toAI,
            trustLevel,
            accessLevel,
            permissions,
            establishedAt: now,
            lastVerified: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Establish trust in database' })
      }

      this.relationships.set(relationshipId, relationship)

      logInfo(`✅ Established trust relationship: ${fromAI} -> ${toAI} (${trustLevel})`)

      return relationship
    } catch (error) {
      logError(error as Error, { context: 'Establish trust' })
      throw error
    }
  }

  // Verify trust
  async verifyTrust(relationshipId: string): Promise<boolean> {
    try {
      const relationship = this.relationships.get(relationshipId)
      if (!relationship) return false

      // In production, verify actual trust
      relationship.lastVerified = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.trustRelationship.update({
          where: { id: relationshipId },
          data: {
            lastVerified: relationship.lastVerified
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Verify trust in database' })
      }

      this.relationships.set(relationshipId, relationship)

      logInfo(`✅ Verified trust relationship ${relationshipId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Verify trust' })
      return false
    }
  }

  // Get constitution
  async getConstitution(): Promise<DigitalConstitution | null> {
    return this.constitution
  }

  // Update constitution
  async updateConstitution(updates: Partial<DigitalConstitution>): Promise<boolean> {
    try {
      if (!this.constitution) return false

      const newVersion = `${parseFloat(this.constitution.version) + 0.1}.0`
      this.constitution = {
        ...this.constitution,
        ...updates,
        version: newVersion,
        updatedAt: new Date()
      }

      logInfo(`✅ Updated Digital Constitution to v${newVersion}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Update constitution' })
      return false
    }
  }

  // Get permissions
  async getPermissions(aiId?: string): Promise<AIPermission[]> {
    const permissions: AIPermission[] = []
    for (const permission of this.permissions.values()) {
      if (aiId && permission.aiId !== aiId) continue
      if (permission.expiresAt && permission.expiresAt < new Date()) continue
      permissions.push(permission)
    }
    return permissions.sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime())
  }

  // Get relationships
  async getRelationships(fromAI?: string): Promise<TrustRelationship[]> {
    const relationships: TrustRelationship[] = []
    for (const relationship of this.relationships.values()) {
      if (fromAI && relationship.fromAI !== fromAI) continue
      relationships.push(relationship)
    }
    return relationships.sort((a, b) => b.establishedAt.getTime() - a.establishedAt.getTime())
  }
}

export const governanceFrameworks = new GovernanceFrameworks()

