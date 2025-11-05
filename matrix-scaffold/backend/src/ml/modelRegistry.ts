/**
 * Phase 11 - Model Registry
 * 
 * Model versioning and registry
 */

import { nanoid } from 'nanoid'
import { logger, logInfo } from '../config/logger'

export interface ModelVersion {
  id: string
  modelId: string
  version: string
  metrics: Record<string, number>
  artifacts: string[]
  tags: string[]
  registeredBy: string
  registeredAt: Date
}

class ModelRegistry {
  private versions: Map<string, ModelVersion> = new Map()

  async initialize() {
    logInfo('Initializing Model Registry...')
    logInfo('✅ Model Registry initialized')
  }

  async registerVersion(
    modelId: string,
    version: string,
    metrics: Record<string, number>,
    artifacts: string[],
    tags: string[],
    registeredBy: string
  ): Promise<ModelVersion> {
    const id = nanoid()
    const modelVersion: ModelVersion = {
      id,
      modelId,
      version,
      metrics,
      artifacts,
      tags,
      registeredBy,
      registeredAt: new Date()
    }
    this.versions.set(id, modelVersion)
    return modelVersion
  }

  async getVersion(modelId: string, version: string): Promise<ModelVersion | null> {
    for (const version_ of this.versions.values()) {
      if (version_.modelId === modelId && version_.version === version) {
        return version_
      }
    }
    return null
  }

  async listVersions(modelId: string): Promise<ModelVersion[]> {
    return Array.from(this.versions.values())
      .filter(v => v.modelId === modelId)
      .sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime())
  }
}

export const modelRegistry = new ModelRegistry()

