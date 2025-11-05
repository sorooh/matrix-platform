/**
 * Phase 10.2 - Matrix Knowledge Federation
 * 
 * System to aggregate knowledge outputs from thousands of connected AIs
 * - Automatic classification and evaluation within Holographic Data Map
 * - Global Knowledge Graph connecting all concepts and results
 * - Live knowledge database that feeds Nicholas directly
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type KnowledgeCategory = 'concept' | 'algorithm' | 'pattern' | 'insight' | 'experience' | 'model' | 'data'
export type KnowledgeQuality = 'low' | 'medium' | 'high' | 'excellent'
export type KnowledgeStatus = 'pending' | 'verified' | 'rejected' | 'archived'

export interface KnowledgeEntity {
  id: string
  category: KnowledgeCategory
  title: string
  content: any
  quality: KnowledgeQuality
  qualityScore: number // 0-100
  status: KnowledgeStatus
  sourceNodeId: string
  tags: string[]
  relationships: string[] // IDs of related entities
  coordinates: {
    x: number
    y: number
    z: number
  }
  usageCount: number
  lastUsed: Date
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgeRelationship {
  id: string
  sourceEntityId: string
  targetEntityId: string
  relationshipType: 'dependency' | 'similarity' | 'opposite' | 'enhances' | 'conflicts' | 'requires'
  strength: number // 0-100
  createdAt: Date
}

export interface KnowledgeGraph {
  id: string
  name: string
  entities: string[] // Entity IDs
  relationships: string[] // Relationship IDs
  version: string
  lastUpdated: Date
}

export interface KnowledgeEvaluation {
  id: string
  entityId: string
  evaluatorNodeId: string
  qualityScore: number // 0-100
  factors: {
    accuracy: number
    relevance: number
    novelty: number
    usefulness: number
  }
  evaluatedAt: Date
}

class MatrixKnowledgeFederation {
  private entities: Map<string, KnowledgeEntity> = new Map()
  private relationships: Map<string, KnowledgeRelationship> = new Map()
  private graphs: Map<string, KnowledgeGraph> = new Map()
  private evaluations: Map<string, KnowledgeEvaluation> = new Map()

  async initialize() {
    logInfo('Initializing Matrix Knowledge Federation...')

    // Initialize global knowledge graph
    await this.initializeGlobalKnowledgeGraph()

    logInfo('✅ Matrix Knowledge Federation initialized')
  }

  // Initialize global knowledge graph
  private async initializeGlobalKnowledgeGraph(): Promise<void> {
    const graphId = nanoid()
    const now = new Date()

    const graph: KnowledgeGraph = {
      id: graphId,
      name: 'Global Knowledge Graph',
      entities: [],
      relationships: [],
      version: '1.0.0',
      lastUpdated: now
    }

    this.graphs.set(graphId, graph)

    logInfo('✅ Global Knowledge Graph initialized')
  }

  // Add knowledge entity
  async addKnowledgeEntity(
    category: KnowledgeCategory,
    title: string,
    content: any,
    sourceNodeId: string,
    tags: string[] = []
  ): Promise<KnowledgeEntity> {
    try {
      const entityId = nanoid()
      const now = new Date()

      // Evaluate quality
      const qualityEvaluation = await this.evaluateKnowledgeQuality(content, category)
      const quality: KnowledgeQuality = qualityEvaluation.quality
      const qualityScore = qualityEvaluation.score

      // Calculate coordinates in holographic space
      const coordinates = await this.calculateHolographicCoordinates(category, tags)

      const entity: KnowledgeEntity = {
        id: entityId,
        category,
        title,
        content,
        quality,
        qualityScore,
        status: 'pending',
        sourceNodeId,
        tags,
        relationships: [],
        coordinates,
        usageCount: 0,
        lastUsed: now,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.knowledgeEntity.create({
          data: {
            id: entityId,
            category,
            title,
            content,
            quality,
            qualityScore,
            status: 'pending',
            sourceNodeId,
            tags,
            relationships: [],
            coordinates,
            usageCount: 0,
            lastUsed: now,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Add knowledge entity in database' })
      }

      this.entities.set(entityId, entity)

      // Add to global knowledge graph
      const globalGraph = Array.from(this.graphs.values())[0]
      if (globalGraph) {
        globalGraph.entities.push(entityId)
        globalGraph.lastUpdated = now
        this.graphs.set(globalGraph.id, globalGraph)
      }

      // Find relationships with existing entities
      await this.findRelationships(entityId)

      logInfo(`✅ Added knowledge entity ${entityId}: ${title} (${category})`)

      return entity
    } catch (error) {
      logError(error as Error, { context: 'Add knowledge entity' })
      throw error
    }
  }

  // Evaluate knowledge quality
  private async evaluateKnowledgeQuality(
    content: any,
    category: KnowledgeCategory
  ): Promise<{ quality: KnowledgeQuality; score: number }> {
    // In production, use ML to evaluate quality
    // For now, simulate evaluation
    let score = Math.floor(Math.random() * 40) + 60 // 60-100

    // Adjust based on content
    const contentStr = JSON.stringify(content)
    if (contentStr.length > 1000) score += 5
    if (contentStr.length < 100) score -= 10

    const quality: KnowledgeQuality = score >= 90 ? 'excellent' : score >= 75 ? 'high' : score >= 60 ? 'medium' : 'low'

    return { quality, score }
  }

  // Calculate holographic coordinates
  private async calculateHolographicCoordinates(
    category: KnowledgeCategory,
    tags: string[]
  ): Promise<{ x: number; y: number; z: number }> {
    // In production, use ML to calculate optimal 3D coordinates
    // For now, use category and tags to determine position
    const categoryMap: Record<KnowledgeCategory, { x: number; y: number; z: number }> = {
      'concept': { x: 0, y: 0, z: 0 },
      'algorithm': { x: 1, y: 0, z: 0 },
      'pattern': { x: 0, y: 1, z: 0 },
      'insight': { x: 0, y: 0, z: 1 },
      'experience': { x: 1, y: 1, z: 0 },
      'model': { x: 1, y: 0, z: 1 },
      'data': { x: 0, y: 1, z: 1 }
    }

    const base = categoryMap[category] || { x: 0, y: 0, z: 0 }

    // Add variation based on tags
    const tagVariation = tags.length * 0.1

    return {
      x: base.x + (Math.random() - 0.5) * tagVariation,
      y: base.y + (Math.random() - 0.5) * tagVariation,
      z: base.z + (Math.random() - 0.5) * tagVariation
    }
  }

  // Find relationships
  private async findRelationships(entityId: string): Promise<void> {
    try {
      const entity = this.entities.get(entityId)
      if (!entity) return

      // Find similar entities
      for (const otherEntity of this.entities.values()) {
        if (otherEntity.id === entityId) continue

        // Check for similarity
        const similarity = await this.calculateSimilarity(entity, otherEntity)
        if (similarity > 0.7) {
          // Create relationship
          const relationshipId = nanoid()
          const relationship: KnowledgeRelationship = {
            id: relationshipId,
            sourceEntityId: entityId,
            targetEntityId: otherEntity.id,
            relationshipType: 'similarity',
            strength: Math.floor(similarity * 100),
            createdAt: new Date()
          }

          this.relationships.set(relationshipId, relationship)

          // Update entities
          entity.relationships.push(relationshipId)
          otherEntity.relationships.push(relationshipId)
          this.entities.set(entityId, entity)
          this.entities.set(otherEntity.id, otherEntity)
        }
      }
    } catch (error) {
      logError(error as Error, { context: 'Find relationships' })
    }
  }

  // Calculate similarity
  private async calculateSimilarity(
    entityA: KnowledgeEntity,
    entityB: KnowledgeEntity
  ): Promise<number> {
    // In production, use vector similarity
    // For now, use tag overlap
    const tagsA = new Set(entityA.tags)
    const tagsB = new Set(entityB.tags)

    const intersection = new Set([...tagsA].filter(t => tagsB.has(t)))
    const union = new Set([...tagsA, ...tagsB])

    return intersection.size / union.size
  }

  // Evaluate knowledge entity
  async evaluateKnowledgeEntity(
    entityId: string,
    evaluatorNodeId: string,
    factors: {
      accuracy: number
      relevance: number
      novelty: number
      usefulness: number
    }
  ): Promise<KnowledgeEvaluation> {
    try {
      const evaluationId = nanoid()
      const now = new Date()

      // Calculate quality score
      const qualityScore = (
        factors.accuracy * 0.3 +
        factors.relevance * 0.3 +
        factors.novelty * 0.2 +
        factors.usefulness * 0.2
      )

      const evaluation: KnowledgeEvaluation = {
        id: evaluationId,
        entityId,
        evaluatorNodeId,
        qualityScore,
        factors,
        evaluatedAt: now
      }

      // Update entity quality
      const entity = this.entities.get(entityId)
      if (entity) {
        // Aggregate evaluations
        const allEvaluations = Array.from(this.evaluations.values())
          .filter(e => e.entityId === entityId)

        const avgScore = allEvaluations.length > 0
          ? (allEvaluations.reduce((sum, e) => sum + e.qualityScore, 0) + qualityScore) / (allEvaluations.length + 1)
          : qualityScore

        entity.qualityScore = avgScore
        entity.quality = avgScore >= 90 ? 'excellent' : avgScore >= 75 ? 'high' : avgScore >= 60 ? 'medium' : 'low'
        entity.status = avgScore >= 70 ? 'verified' : 'pending'
        entity.updatedAt = now

        this.entities.set(entityId, entity)
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.knowledgeEvaluation.create({
          data: {
            id: evaluationId,
            entityId,
            evaluatorNodeId,
            qualityScore,
            factors,
            evaluatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Evaluate knowledge entity in database' })
      }

      this.evaluations.set(evaluationId, evaluation)

      logInfo(`✅ Evaluated knowledge entity ${entityId}: ${qualityScore}%`)

      return evaluation
    } catch (error) {
      logError(error as Error, { context: 'Evaluate knowledge entity' })
      throw error
    }
  }

  // Get knowledge entities
  async getKnowledgeEntities(
    category?: KnowledgeCategory,
    quality?: KnowledgeQuality,
    status?: KnowledgeStatus
  ): Promise<KnowledgeEntity[]> {
    const entities: KnowledgeEntity[] = []
    for (const entity of this.entities.values()) {
      if (category && entity.category !== category) continue
      if (quality && entity.quality !== quality) continue
      if (status && entity.status !== status) continue
      entities.push(entity)
    }
    return entities.sort((a, b) => b.qualityScore - a.qualityScore)
  }

  // Get knowledge graph
  async getKnowledgeGraph(graphId: string): Promise<KnowledgeGraph | null> {
    return this.graphs.get(graphId) || null
  }
}

export const matrixKnowledgeFederation = new MatrixKnowledgeFederation()

