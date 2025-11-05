/**
 * Phase 11 - Integration Analytics
 * 
 * Integration usage analytics
 */

import { nanoid } from 'nanoid'
import { logger, logInfo } from '../config/logger'

export interface IntegrationAnalytics {
  id: string
  integrationId: string
  date: Date
  metrics: {
    requests: number
    successRate: number
    averageLatency: number
    errors: number
  }
  createdAt: Date
}

class IntegrationAnalytics {
  private analytics: Map<string, IntegrationAnalytics> = new Map()

  async initialize() {
    logInfo('Initializing Integration Analytics...')
    logInfo('✅ Integration Analytics initialized')
  }

  async trackUsage(
    integrationId: string,
    requests: number,
    successRate: number,
    averageLatency: number,
    errors: number
  ): Promise<IntegrationAnalytics> {
    const id = nanoid()
    const analytics: IntegrationAnalytics = {
      id,
      integrationId,
      date: new Date(),
      metrics: {
        requests,
        successRate,
        averageLatency,
        errors
      },
      createdAt: new Date()
    }
    this.analytics.set(id, analytics)
    return analytics
  }

  async getAnalytics(integrationId: string): Promise<IntegrationAnalytics[]> {
    return Array.from(this.analytics.values())
      .filter(a => a.integrationId === integrationId)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  }
}

export const integrationAnalytics = new IntegrationAnalytics()

