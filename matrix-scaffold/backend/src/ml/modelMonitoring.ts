/**
 * Phase 11 - Model Monitoring
 * 
 * Model performance monitoring
 */

import { nanoid } from 'nanoid'
import { logger, logInfo } from '../config/logger'

export interface ModelMonitoring {
  id: string
  modelId: string
  metric: string
  value: number
  threshold: number
  status: 'healthy' | 'warning' | 'critical'
  timestamp: Date
}

class ModelMonitoring {
  private monitorings: Map<string, ModelMonitoring> = new Map()

  async initialize() {
    logInfo('Initializing Model Monitoring...')
    logInfo('✅ Model Monitoring initialized')
  }

  async trackMetric(
    modelId: string,
    metric: string,
    value: number,
    threshold: number
  ): Promise<ModelMonitoring> {
    const id = nanoid()
    const status: ModelMonitoring['status'] = 
      value < threshold * 0.5 ? 'critical' :
      value < threshold * 0.8 ? 'warning' : 'healthy'

    const monitoring: ModelMonitoring = {
      id,
      modelId,
      metric,
      value,
      threshold,
      status,
      timestamp: new Date()
    }
    this.monitorings.set(id, monitoring)
    return monitoring
  }

  async getMetrics(modelId: string): Promise<ModelMonitoring[]> {
    return Array.from(this.monitorings.values())
      .filter(m => m.modelId === modelId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }
}

export const modelMonitoring = new ModelMonitoring()

