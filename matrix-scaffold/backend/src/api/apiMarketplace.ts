/**
 * Phase 11 - API Marketplace
 * 
 * Public API marketplace
 */

import { nanoid } from 'nanoid'
import { logger, logInfo } from '../config/logger'

export interface APIMarketplace {
  id: string
  name: string
  description: string
  category: string
  provider: string
  endpoint: string
  pricing: {
    type: 'free' | 'paid' | 'freemium'
    price?: number
    currency?: string
  }
  rating: number // 0-5
  reviews: number
  isActive: boolean
  createdAt: Date
}

class APIMarketplace {
  private apis: Map<string, APIMarketplace> = new Map()

  async initialize() {
    logInfo('Initializing API Marketplace...')
    logInfo('✅ API Marketplace initialized')
  }

  async listAPI(
    name: string,
    description: string,
    category: string,
    provider: string,
    endpoint: string,
    pricing: APIMarketplace['pricing']
  ): Promise<APIMarketplace> {
    const id = nanoid()
    const api: APIMarketplace = {
      id,
      name,
      description,
      category,
      provider,
      endpoint,
      pricing,
      rating: 0,
      reviews: 0,
      isActive: true,
      createdAt: new Date()
    }
    this.apis.set(id, api)
    return api
  }

  async getAPIs(category?: string): Promise<APIMarketplace[]> {
    const apis: APIMarketplace[] = []
    for (const api of this.apis.values()) {
      if (category && api.category !== category) continue
      if (!api.isActive) continue
      apis.push(api)
    }
    return apis.sort((a, b) => b.rating - a.rating)
  }
}

export const apiMarketplace = new APIMarketplace()

