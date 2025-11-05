/**
 * Phase 11 - Customer Journey Analytics
 * 
 * Customer journey tracking
 */

import { nanoid } from 'nanoid'
import { logger, logInfo } from '../config/logger'

export interface CustomerJourney {
  id: string
  customerId: string
  stages: {
    stage: string
    timestamp: Date
    metadata: any
  }[]
  createdAt: Date
  updatedAt: Date
}

class CustomerJourneyAnalytics {
  private journeys: Map<string, CustomerJourney> = new Map()

  async initialize() {
    logInfo('Initializing Customer Journey Analytics...')
    logInfo('✅ Customer Journey Analytics initialized')
  }

  async trackStage(
    customerId: string,
    stage: string,
    metadata: any = {}
  ): Promise<CustomerJourney> {
    let journey = Array.from(this.journeys.values()).find(j => j.customerId === customerId)
    
    if (!journey) {
      const id = nanoid()
      journey = {
        id,
        customerId,
        stages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      this.journeys.set(id, journey)
    }

    journey.stages.push({
      stage,
      timestamp: new Date(),
      metadata
    })
    journey.updatedAt = new Date()
    this.journeys.set(journey.id, journey)
    return journey
  }

  async getJourney(customerId: string): Promise<CustomerJourney | null> {
    return Array.from(this.journeys.values()).find(j => j.customerId === customerId) || null
  }
}

export const customerJourneyAnalytics = new CustomerJourneyAnalytics()

