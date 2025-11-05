/**
 * Phase 8 - AI Marketplace
 * 
 * Digital marketplace for AI intelligences
 * - Display available AIs (Nicholas, Surooh, Lida, Bots, Models...)
 * - Show details: description, price, AI type, capabilities, usage capacity
 * - Support instant purchase / monthly subscription / custom booking (Private Instance)
 * - Customer reviews and ratings system
 * - Integrated interface in Dashboard for users and developers
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type AIType = 'nicholas' | 'surooh' | 'lida' | 'bot' | 'model' | 'custom'
export type PricingModel = 'instant' | 'monthly' | 'custom' | 'private'
export type PurchaseStatus = 'available' | 'purchased' | 'subscribed' | 'private'

export interface AIListing {
  id: string
  name: string
  description: string
  type: AIType
  capabilities: string[]
  price: Pricing
  usageCapacity: UsageCapacity
  status: PurchaseStatus
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface Pricing {
  instant?: number // One-time purchase price
  monthly?: number // Monthly subscription price
  custom?: number // Custom pricing
  private?: number // Private instance price
  currency: string
}

export interface UsageCapacity {
  requestsPerMonth?: number
  tokensPerMonth?: number
  storage?: number // in bytes
  aiInstances?: number
  apiKeys?: number
}

export interface Review {
  id: string
  aiId: string
  userId: string
  rating: number // 1-5
  title: string
  content: string
  verified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Purchase {
  id: string
  userId: string
  aiId: string
  pricingModel: PricingModel
  subscriptionId?: string
  instanceId?: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  createdAt: Date
  completedAt?: Date
}

class MarketplaceManager {
  private listings: Map<string, AIListing> = new Map()
  private reviews: Map<string, Review> = new Map()
  private purchases: Map<string, Purchase> = new Map()

  async initialize() {
    logInfo('Initializing AI Marketplace...')

    // Load listings from database
    try {
      const { prisma } = await import('../config/database')
      const listings = await prisma.aiListing.findMany()
      for (const listing of listings) {
        this.listings.set(listing.id, {
          id: listing.id,
          name: listing.name,
          description: listing.description,
          type: listing.type as AIType,
          capabilities: listing.capabilities as string[],
          price: listing.price as Pricing,
          usageCapacity: listing.usageCapacity as UsageCapacity,
          status: listing.status as PurchaseStatus,
          metadata: listing.metadata as Record<string, any>,
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt
        })
      }
      logInfo(`✅ Loaded ${listings.length} AI listings from database`)
    } catch (error) {
      logError(error as Error, { context: 'Marketplace initialization' })
    }

    // Initialize default listings
    await this.initializeDefaultListings()

    logInfo('✅ AI Marketplace initialized')
  }

  // Initialize default AI listings
  async initializeDefaultListings(): Promise<void> {
    const defaultListings: Omit<AIListing, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Nicholas Core',
        description: 'Advanced AI agent with code generation, review, and execution capabilities',
        type: 'nicholas',
        capabilities: ['code_generation', 'code_review', 'execution', 'planning'],
        price: {
          instant: 99,
          monthly: 29,
          custom: 0,
          private: 999,
          currency: 'USD'
        },
        usageCapacity: {
          requestsPerMonth: 10000,
          tokensPerMonth: 1000000,
          storage: 1 * 1024 * 1024 * 1024, // 1 GB
          aiInstances: 1,
          apiKeys: 5
        },
        status: 'available',
        metadata: {}
      },
      {
        name: 'Surooh Neural Engine',
        description: 'High-performance neural network engine with GPU acceleration',
        type: 'surooh',
        capabilities: ['neural_inference', 'gpu_acceleration', 'batch_processing'],
        price: {
          instant: 199,
          monthly: 49,
          custom: 0,
          private: 1999,
          currency: 'USD'
        },
        usageCapacity: {
          requestsPerMonth: 50000,
          tokensPerMonth: 5000000,
          storage: 5 * 1024 * 1024 * 1024, // 5 GB
          aiInstances: 3,
          apiKeys: 10
        },
        status: 'available',
        metadata: {}
      },
      {
        name: 'Lida AI Assistant',
        description: 'Intelligent assistant for project management and automation',
        type: 'lida',
        capabilities: ['project_management', 'automation', 'scheduling'],
        price: {
          instant: 79,
          monthly: 19,
          custom: 0,
          private: 799,
          currency: 'USD'
        },
        usageCapacity: {
          requestsPerMonth: 5000,
          tokensPerMonth: 500000,
          storage: 500 * 1024 * 1024, // 500 MB
          aiInstances: 1,
          apiKeys: 3
        },
        status: 'available',
        metadata: {}
      }
    ]

    for (const listing of defaultListings) {
      const existing = Array.from(this.listings.values()).find(
        l => l.name === listing.name && l.type === listing.type
      )
      if (!existing) {
        await this.createListing(listing)
      }
    }
  }

  // Create AI listing
  async createListing(
    listing: Omit<AIListing, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AIListing> {
    try {
      const listingId = nanoid()
      const now = new Date()

      const aiListing: AIListing = {
        id: listingId,
        ...listing,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.aiListing.create({
          data: {
            id: listingId,
            name: listing.name,
            description: listing.description,
            type: listing.type,
            capabilities: listing.capabilities,
            price: listing.price,
            usageCapacity: listing.usageCapacity,
            status: listing.status,
            metadata: listing.metadata
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create listing in database' })
      }

      this.listings.set(listingId, aiListing)
      logInfo(`✅ Created AI listing ${listingId}: ${listing.name}`)

      return aiListing
    } catch (error) {
      logError(error as Error, { context: 'Create listing' })
      throw error
    }
  }

  // Get listing
  async getListing(listingId: string): Promise<AIListing | null> {
    return this.listings.get(listingId) || null
  }

  // Get all listings
  async getAllListings(type?: AIType): Promise<AIListing[]> {
    const allListings = Array.from(this.listings.values())
    if (type) {
      return allListings.filter(l => l.type === type)
    }
    return allListings
  }

  // Create purchase
  async createPurchase(
    userId: string,
    aiId: string,
    pricingModel: PricingModel,
    subscriptionId?: string,
    instanceId?: string
  ): Promise<Purchase> {
    try {
      const listing = this.listings.get(aiId)
      if (!listing) throw new Error('AI listing not found')

      const purchaseId = nanoid()
      const now = new Date()

      let amount = 0
      switch (pricingModel) {
        case 'instant':
          amount = listing.price.instant || 0
          break
        case 'monthly':
          amount = listing.price.monthly || 0
          break
        case 'custom':
          amount = listing.price.custom || 0
          break
        case 'private':
          amount = listing.price.private || 0
          break
      }

      const purchase: Purchase = {
        id: purchaseId,
        userId,
        aiId,
        pricingModel,
        subscriptionId,
        instanceId,
        amount,
        currency: listing.price.currency,
        status: 'pending',
        createdAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.purchase.create({
          data: {
            id: purchaseId,
            userId,
            aiId,
            pricingModel,
            subscriptionId: subscriptionId || null,
            instanceId: instanceId || null,
            amount,
            currency: listing.price.currency,
            status: 'pending'
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create purchase in database' })
      }

      this.purchases.set(purchaseId, purchase)
      logInfo(`✅ Created purchase ${purchaseId} for AI ${aiId}`)

      return purchase
    } catch (error) {
      logError(error as Error, { context: 'Create purchase' })
      throw error
    }
  }

  // Complete purchase
  async completePurchase(purchaseId: string): Promise<boolean> {
    const purchase = this.purchases.get(purchaseId)
    if (!purchase) return false

    purchase.status = 'completed'
    purchase.completedAt = new Date()

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.purchase.update({
        where: { id: purchaseId },
        data: {
          status: 'completed',
          completedAt: purchase.completedAt
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Complete purchase in database' })
    }

    this.purchases.set(purchaseId, purchase)
    logInfo(`✅ Completed purchase ${purchaseId}`)

    return true
  }

  // Create review
  async createReview(
    aiId: string,
    userId: string,
    rating: number,
    title: string,
    content: string
  ): Promise<Review> {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5')
      }

      const reviewId = nanoid()
      const now = new Date()

      const review: Review = {
        id: reviewId,
        aiId,
        userId,
        rating,
        title,
        content,
        verified: false,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.review.create({
          data: {
            id: reviewId,
            aiId,
            userId,
            rating,
            title,
            content,
            verified: false
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create review in database' })
      }

      this.reviews.set(reviewId, review)
      logInfo(`✅ Created review ${reviewId} for AI ${aiId}`)

      return review
    } catch (error) {
      logError(error as Error, { context: 'Create review' })
      throw error
    }
  }

  // Get reviews for AI
  async getReviews(aiId: string): Promise<Review[]> {
    const aiReviews: Review[] = []
    for (const review of this.reviews.values()) {
      if (review.aiId === aiId) {
        aiReviews.push(review)
      }
    }
    return aiReviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Get average rating
  async getAverageRating(aiId: string): Promise<number> {
    const reviews = await this.getReviews(aiId)
    if (reviews.length === 0) return 0

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
    return sum / reviews.length
  }

  // Get purchases by user
  async getPurchasesByUserId(userId: string): Promise<Purchase[]> {
    const userPurchases: Purchase[] = []
    for (const purchase of this.purchases.values()) {
      if (purchase.userId === userId) {
        userPurchases.push(purchase)
      }
    }
    return userPurchases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
}

export const marketplaceManager = new MarketplaceManager()

