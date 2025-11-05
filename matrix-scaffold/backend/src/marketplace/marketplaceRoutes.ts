/**
 * Phase 8 - Marketplace API Routes
 * 
 * API endpoints for AI Marketplace
 */

import { FastifyInstance } from 'fastify'
import { marketplaceManager } from './marketplace'
import { logError, logInfo } from '../config/logger'

export async function registerMarketplaceRoutes(server: FastifyInstance) {
  logInfo('Registering Marketplace API routes...')

  // Listing endpoints
  server.get('/api/marketplace/listings', async (request, reply) => {
    try {
      const { type } = request.query as any
      const listings = await marketplaceManager.getAllListings(type)
      return { success: true, listings }
    } catch (error) {
      logError(error as Error, { context: 'Get listings' })
      return reply.status(500).send({ error: 'Failed to get listings' })
    }
  })

  server.get('/api/marketplace/listings/:listingId', async (request, reply) => {
    try {
      const { listingId } = request.params as any
      const listing = await marketplaceManager.getListing(listingId)
      if (!listing) {
        return reply.status(404).send({ error: 'Listing not found' })
      }
      
      // Get reviews and average rating
      const reviews = await marketplaceManager.getReviews(listingId)
      const averageRating = await marketplaceManager.getAverageRating(listingId)
      
      return {
        success: true,
        listing: {
          ...listing,
          reviews,
          averageRating
        }
      }
    } catch (error) {
      logError(error as Error, { context: 'Get listing' })
      return reply.status(500).send({ error: 'Failed to get listing' })
    }
  })

  server.post('/api/marketplace/listings', async (request, reply) => {
    try {
      const listing = request.body as any
      const created = await marketplaceManager.createListing(listing)
      return { success: true, listing: created }
    } catch (error) {
      logError(error as Error, { context: 'Create listing' })
      return reply.status(500).send({ error: 'Failed to create listing' })
    }
  })

  // Purchase endpoints
  server.post('/api/marketplace/purchases', async (request, reply) => {
    try {
      const { userId, aiId, pricingModel, subscriptionId, instanceId } = request.body as any
      const purchase = await marketplaceManager.createPurchase(
        userId,
        aiId,
        pricingModel,
        subscriptionId,
        instanceId
      )
      return { success: true, purchase }
    } catch (error) {
      logError(error as Error, { context: 'Create purchase' })
      return reply.status(500).send({ error: 'Failed to create purchase' })
    }
  })

  server.post('/api/marketplace/purchases/:purchaseId/complete', async (request, reply) => {
    try {
      const { purchaseId } = request.params as any
      const success = await marketplaceManager.completePurchase(purchaseId)
      return { success }
    } catch (error) {
      logError(error as Error, { context: 'Complete purchase' })
      return reply.status(500).send({ error: 'Failed to complete purchase' })
    }
  })

  server.get('/api/marketplace/purchases/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any
      const purchases = await marketplaceManager.getPurchasesByUserId(userId)
      return { success: true, purchases }
    } catch (error) {
      logError(error as Error, { context: 'Get purchases by user' })
      return reply.status(500).send({ error: 'Failed to get purchases' })
    }
  })

  // Review endpoints
  server.post('/api/marketplace/reviews', async (request, reply) => {
    try {
      const { aiId, userId, rating, title, content } = request.body as any
      const review = await marketplaceManager.createReview(
        aiId,
        userId,
        rating,
        title,
        content
      )
      return { success: true, review }
    } catch (error) {
      logError(error as Error, { context: 'Create review' })
      return reply.status(500).send({ error: 'Failed to create review' })
    }
  })

  server.get('/api/marketplace/reviews/:aiId', async (request, reply) => {
    try {
      const { aiId } = request.params as any
      const reviews = await marketplaceManager.getReviews(aiId)
      const averageRating = await marketplaceManager.getAverageRating(aiId)
      return { success: true, reviews, averageRating }
    } catch (error) {
      logError(error as Error, { context: 'Get reviews' })
      return reply.status(500).send({ error: 'Failed to get reviews' })
    }
  })

  logInfo('✅ Marketplace API routes registered')
}

