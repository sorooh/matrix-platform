/**
 * Phase 8.4 - API Versioning & App Isolation
 * 
 * Version management and app isolation
 * - Support for multiple app versions (v1, v2, v3...)
 * - Preserve old versions for backward compatibility
 * - App token isolation system
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type VersionStatus = 'draft' | 'published' | 'deprecated' | 'archived'
export type CompatibilityLevel = 'backward_compatible' | 'breaking' | 'major' | 'minor' | 'patch'

export interface AppVersion {
  id: string
  appId: string
  version: string
  status: VersionStatus
  compatibility: CompatibilityLevel
  changelog?: string
  sourceCode: string
  runtimeConfig: any
  apiTokens: string[] // App-specific API tokens
  endpoints: string[]
  isStable: boolean
  isDefault: boolean
  createdAt: Date
  publishedAt?: Date
  deprecatedAt?: Date
}

export interface AppToken {
  id: string
  appId: string
  version: string
  token: string
  name: string
  permissions: string[]
  rateLimit: {
    requestsPerMinute: number
    requestsPerHour: number
    requestsPerDay: number
  }
  isActive: boolean
  expiresAt?: Date
  createdAt: Date
}

class VersioningManager {
  private versions: Map<string, AppVersion> = new Map()
  private tokens: Map<string, AppToken> = new Map()

  async initialize() {
    logInfo('Initializing API Versioning & App Isolation...')
    logInfo('✅ API Versioning & App Isolation initialized')
  }

  // Create version
  async createVersion(
    appId: string,
    version: string,
    sourceCode: string,
    compatibility: CompatibilityLevel,
    changelog?: string
  ): Promise<AppVersion> {
    try {
      const versionId = nanoid()
      const now = new Date()

      // Generate API tokens for this version
      const apiTokens = await this.generateAppTokens(appId, version)

      const appVersion: AppVersion = {
        id: versionId,
        appId,
        version,
        status: 'draft',
        compatibility,
        changelog,
        sourceCode,
        runtimeConfig: {},
        apiTokens: apiTokens.map(t => t.token),
        endpoints: [],
        isStable: false,
        isDefault: false,
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.appVersion.create({
          data: {
            id: versionId,
            appId,
            version,
            status: 'draft',
            compatibility,
            changelog: changelog || null,
            sourceCode,
            runtimeConfig: {},
            apiTokens: apiTokens.map(t => t.token),
            endpoints: [],
            isStable: false,
            isDefault: false
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create version in database' })
      }

      this.versions.set(versionId, appVersion)
      logInfo(`✅ Created version ${version} for app ${appId}`)

      return appVersion
    } catch (error) {
      logError(error as Error, { context: 'Create version' })
      throw error
    }
  }

  // Generate app tokens
  private async generateAppTokens(appId: string, version: string): Promise<AppToken[]> {
    const tokens: AppToken[] = []

    // Generate default token
    const defaultToken = await this.createToken(appId, version, 'Default Token', [
      'read',
      'write',
      'execute'
    ])
    tokens.push(defaultToken)

    return tokens
  }

  // Create token
  async createToken(
    appId: string,
    version: string,
    name: string,
    permissions: string[],
    rateLimit?: {
      requestsPerMinute: number
      requestsPerHour: number
      requestsPerDay: number
    }
  ): Promise<AppToken> {
    try {
      const tokenId = nanoid()
      const token = `app_${appId}_${version}_${nanoid(32)}`
      const now = new Date()

      const appToken: AppToken = {
        id: tokenId,
        appId,
        version,
        token,
        name,
        permissions,
        rateLimit: rateLimit || {
          requestsPerMinute: 100,
          requestsPerHour: 1000,
          requestsPerDay: 10000
        },
        isActive: true,
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.appToken.create({
          data: {
            id: tokenId,
            appId,
            version,
            token,
            name,
            permissions,
            rateLimit: appToken.rateLimit,
            isActive: true
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create token in database' })
      }

      this.tokens.set(tokenId, appToken)
      logInfo(`✅ Created token ${tokenId} for app ${appId} version ${version}`)

      return appToken
    } catch (error) {
      logError(error as Error, { context: 'Create token' })
      throw error
    }
  }

  // Publish version
  async publishVersion(versionId: string): Promise<boolean> {
    try {
      const version = this.versions.get(versionId)
      if (!version) return false

      // Set old default version to non-default
      const oldDefault = Array.from(this.versions.values()).find(
        v => v.appId === version.appId && v.isDefault && v.id !== versionId
      )
      if (oldDefault) {
        oldDefault.isDefault = false
        this.versions.set(oldDefault.id, oldDefault)
      }

      version.status = 'published'
      version.isDefault = true
      version.isStable = true
      version.publishedAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.appVersion.update({
          where: { id: versionId },
          data: {
            status: 'published',
            isDefault: true,
            isStable: true,
            publishedAt: version.publishedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Publish version in database' })
      }

      this.versions.set(versionId, version)
      logInfo(`✅ Published version ${versionId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Publish version' })
      return false
    }
  }

  // Deprecate version
  async deprecateVersion(versionId: string): Promise<boolean> {
    try {
      const version = this.versions.get(versionId)
      if (!version) return false

      version.status = 'deprecated'
      version.isDefault = false
      version.deprecatedAt = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.appVersion.update({
          where: { id: versionId },
          data: {
            status: 'deprecated',
            isDefault: false,
            deprecatedAt: version.deprecatedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Deprecate version in database' })
      }

      this.versions.set(versionId, version)
      logInfo(`✅ Deprecated version ${versionId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Deprecate version' })
      return false
    }
  }

  // Get version
  async getVersion(versionId: string): Promise<AppVersion | null> {
    return this.versions.get(versionId) || null
  }

  // Get versions by app
  async getVersionsByApp(appId: string): Promise<AppVersion[]> {
    const appVersions: AppVersion[] = []
    for (const version of this.versions.values()) {
      if (version.appId === appId) {
        appVersions.push(version)
      }
    }
    return appVersions.sort((a, b) => {
      // Sort by semantic version
      const aParts = a.version.split('.').map(Number)
      const bParts = b.version.split('.').map(Number)
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0
        const bPart = bParts[i] || 0
        if (aPart !== bPart) {
          return bPart - aPart // Descending
        }
      }
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
  }

  // Get default version
  async getDefaultVersion(appId: string): Promise<AppVersion | null> {
    for (const version of this.versions.values()) {
      if (version.appId === appId && version.isDefault && version.status === 'published') {
        return version
      }
    }
    return null
  }

  // Verify token
  async verifyToken(token: string): Promise<AppToken | null> {
    for (const appToken of this.tokens.values()) {
      if (appToken.token === token && appToken.isActive) {
        if (appToken.expiresAt && appToken.expiresAt < new Date()) {
          return null
        }
        return appToken
      }
    }
    return null
  }

  // Revoke token
  async revokeToken(tokenId: string): Promise<boolean> {
    try {
      const token = this.tokens.get(tokenId)
      if (!token) return false

      token.isActive = false

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.appToken.update({
          where: { id: tokenId },
          data: { isActive: false }
        })
      } catch (error) {
        logError(error as Error, { context: 'Revoke token in database' })
      }

      this.tokens.set(tokenId, token)
      logInfo(`✅ Revoked token ${tokenId}`)

      return true
    } catch (error) {
      logError(error as Error, { context: 'Revoke token' })
      return false
    }
  }
}

export const versioningManager = new VersioningManager()

