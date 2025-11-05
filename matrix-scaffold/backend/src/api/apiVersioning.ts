/**
 * Phase 11 - Advanced API Versioning
 * 
 * Advanced API versioning with semantic versioning
 */

import { nanoid } from 'nanoid'
import { logger, logInfo } from '../config/logger'

export interface APIVersion {
  id: string
  version: string // Semantic version (e.g., "1.0.0")
  baseUrl: string
  isDeprecated: boolean
  deprecationDate?: Date
  sunsetDate?: Date
  migrationGuide?: string
  breakingChanges: string[]
  createdAt: Date
}

class AdvancedAPIVersioning {
  private versions: Map<string, APIVersion> = new Map()

  async initialize() {
    logInfo('Initializing Advanced API Versioning...')
    logInfo('✅ Advanced API Versioning initialized')
  }

  async createVersion(
    version: string,
    baseUrl: string,
    breakingChanges: string[] = []
  ): Promise<APIVersion> {
    const id = nanoid()
    const apiVersion: APIVersion = {
      id,
      version,
      baseUrl,
      isDeprecated: false,
      breakingChanges,
      createdAt: new Date()
    }
    this.versions.set(id, apiVersion)
    return apiVersion
  }

  async deprecateVersion(versionId: string, sunsetDate: Date, migrationGuide?: string): Promise<APIVersion> {
    const version = this.versions.get(versionId)
    if (!version) throw new Error('Version not found')
    version.isDeprecated = true
    version.deprecationDate = new Date()
    version.sunsetDate = sunsetDate
    version.migrationGuide = migrationGuide
    this.versions.set(versionId, version)
    return version
  }
}

export const advancedAPIVersioning = new AdvancedAPIVersioning()

