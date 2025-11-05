/**
 * Phase 11 - Customer Success Platform
 * 
 * Full CSM platform
 */

import { nanoid } from 'nanoid'
import { logger, logInfo } from '../config/logger'

export interface CustomerHealth {
  id: string
  customerId: string
  healthScore: number // 0-100
  engagementScore: number // 0-100
  adoptionScore: number // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  nextReview: Date
  lastReview?: Date
  createdAt: Date
}

class CustomerSuccessPlatform {
  private customers: Map<string, CustomerHealth> = new Map()

  async initialize() {
    logInfo('Initializing Customer Success Platform...')
    logInfo('✅ Customer Success Platform initialized')
  }

  async trackCustomer(
    customerId: string,
    healthScore: number,
    engagementScore: number,
    adoptionScore: number
  ): Promise<CustomerHealth> {
    const id = nanoid()
    const overallScore = (healthScore + engagementScore + adoptionScore) / 3
    const riskLevel: CustomerHealth['riskLevel'] = 
      overallScore < 30 ? 'critical' :
      overallScore < 50 ? 'high' :
      overallScore < 75 ? 'medium' : 'low'

    const customer: CustomerHealth = {
      id,
      customerId,
      healthScore,
      engagementScore,
      adoptionScore,
      riskLevel,
      nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: new Date()
    }
    this.customers.set(id, customer)
    return customer
  }

  async getAtRiskCustomers(): Promise<CustomerHealth[]> {
    return Array.from(this.customers.values())
      .filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical')
      .sort((a, b) => a.healthScore - b.healthScore)
  }
}

export const customerSuccessPlatform = new CustomerSuccessPlatform()

