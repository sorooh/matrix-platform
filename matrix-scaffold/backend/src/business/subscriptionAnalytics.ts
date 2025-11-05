/**
 * Phase 11 - Subscription Analytics
 * 
 * Advanced subscription analytics
 */

import { nanoid } from 'nanoid'
import { logger, logInfo } from '../config/logger'

export interface SubscriptionAnalytics {
  id: string
  date: Date
  metrics: {
    mrr: number // Monthly Recurring Revenue
    arr: number // Annual Recurring Revenue
    churnRate: number
    newSubscriptions: number
    upgrades: number
    downgrades: number
  }
  createdAt: Date
}

class SubscriptionAnalytics {
  private analytics: Map<string, SubscriptionAnalytics> = new Map()

  async initialize() {
    logInfo('Initializing Subscription Analytics...')
    logInfo('✅ Subscription Analytics initialized')
  }

  async trackMetrics(
    mrr: number,
    arr: number,
    churnRate: number,
    newSubscriptions: number,
    upgrades: number,
    downgrades: number
  ): Promise<SubscriptionAnalytics> {
    const id = nanoid()
    const analytics: SubscriptionAnalytics = {
      id,
      date: new Date(),
      metrics: {
        mrr,
        arr,
        churnRate,
        newSubscriptions,
        upgrades,
        downgrades
      },
      createdAt: new Date()
    }
    this.analytics.set(id, analytics)
    return analytics
  }

  async getMetrics(startDate: Date, endDate: Date): Promise<SubscriptionAnalytics[]> {
    return Array.from(this.analytics.values())
      .filter(a => a.date >= startDate && a.date <= endDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }
}

export const subscriptionAnalytics = new SubscriptionAnalytics()

