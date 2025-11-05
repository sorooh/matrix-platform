/**
 * Phase 11 - Revenue Recognition
 * 
 * Revenue recognition automation
 */

import { nanoid } from 'nanoid'
import { logger, logInfo } from '../config/logger'

export interface RevenueRecognition {
  id: string
  subscriptionId: string
  amount: number
  currency: string
  recognitionType: 'upfront' | 'monthly' | 'deferred'
  recognizedAt: Date
  periodStart: Date
  periodEnd: Date
  status: 'pending' | 'recognized' | 'reversed'
}

class RevenueRecognitionSystem {
  private recognitions: Map<string, RevenueRecognition> = new Map()

  async initialize() {
    logInfo('Initializing Revenue Recognition System...')
    logInfo('✅ Revenue Recognition System initialized')
  }

  async recognizeRevenue(
    subscriptionId: string,
    amount: number,
    currency: string,
    recognitionType: RevenueRecognition['recognitionType'],
    periodStart: Date,
    periodEnd: Date
  ): Promise<RevenueRecognition> {
    const id = nanoid()
    const recognition: RevenueRecognition = {
      id,
      subscriptionId,
      amount,
      currency,
      recognitionType,
      recognizedAt: new Date(),
      periodStart,
      periodEnd,
      status: 'recognized'
    }
    this.recognitions.set(id, recognition)
    return recognition
  }

  async getRevenueByPeriod(startDate: Date, endDate: Date): Promise<number> {
    let total = 0
    for (const recognition of this.recognitions.values()) {
      if (recognition.recognizedAt >= startDate && recognition.recognizedAt <= endDate && recognition.status === 'recognized') {
        total += recognition.amount
      }
    }
    return total
  }
}

export const revenueRecognitionSystem = new RevenueRecognitionSystem()

