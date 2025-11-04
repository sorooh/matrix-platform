/**
 * Knowledge Graph Integration
 * Phase 6: AI Crawler & Simulation Environment
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { graph } from '../core/graph'
import { addMemory, searchMemory } from '../core/memory'
import { embed } from '../core/memoryProvider'
import { CrawlResult } from './engine'

export interface KnowledgeNode {
  id: string
  type: 'entity' | 'concept' | 'relationship' | 'document'
  label: string
  properties: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface KnowledgeEdge {
  id: string
  source: string
  target: string
  type: string
  properties?: Record<string, unknown>
  weight?: number
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  metadata?: Record<string, unknown>
}

export class KnowledgeGraphIntegration {
  /**
   * Process crawl result and integrate with knowledge graph
   */
  async processCrawlResult(result: CrawlResult): Promise<{
    nodes: KnowledgeNode[]
    edges: KnowledgeEdge[]
    memories: number
  }> {
    try {
      logger.info('Processing crawl result for knowledge graph', {
        url: result.url,
      })

      const nodes: KnowledgeNode[] = []
      const edges: KnowledgeEdge[] = []

      // Create document node
      const documentNode: KnowledgeNode = {
        id: `doc-${result.url.replace(/[^a-zA-Z0-9]/g, '-')}`,
        type: 'document',
        label: result.title || result.url,
        properties: {
          url: result.url,
          title: result.title,
          statusCode: result.statusCode,
          crawledAt: result.crawledAt,
        },
        metadata: result.metadata,
      }
      nodes.push(documentNode)

      // Extract entities from content
      const entities = this.extractEntities(result.content || '')
      for (const entity of entities) {
        const entityNode: KnowledgeNode = {
          id: `entity-${entity.id}`,
          type: 'entity',
          label: entity.label,
          properties: entity.properties,
        }
        nodes.push(entityNode)

        // Create relationship with document
        const edge: KnowledgeEdge = {
          id: `edge-${documentNode.id}-${entityNode.id}`,
          source: documentNode.id,
          target: entityNode.id,
          type: 'contains',
          weight: entity.confidence || 0.5,
        }
        edges.push(edge)
      }

      // Extract relationships
      const relationships = this.extractRelationships(result.content || '', entities)
      for (const rel of relationships) {
        const edge: KnowledgeEdge = {
          id: `edge-${rel.source}-${rel.target}`,
          source: rel.source,
          target: rel.target,
          type: rel.type,
          weight: rel.weight || 0.5,
          properties: rel.properties,
        }
        edges.push(edge)
      }

      // Store in graph
      for (const node of nodes) {
        await graph.link(node.id, node.type, node.label, node.properties)
      }

      // Store in memory
      let memories = 0
      if (result.content) {
        try {
          // Create memory entry
          const memoryText = `${result.title || result.url}: ${result.content.substring(0, 1000)}`
          await addMemory(memoryText, {
            url: result.url,
            title: result.title,
            type: 'crawl-result',
            metadata: result.metadata,
          })
          memories++
        } catch (error) {
          logger.warn('Failed to add memory for crawl result:', error)
        }
      }

      logger.info('Crawl result processed for knowledge graph', {
        url: result.url,
        nodes: nodes.length,
        edges: edges.length,
        memories,
      })

      eventBus.publish('crawler.knowledge.processed', {
        url: result.url,
        nodes: nodes.length,
        edges: edges.length,
        memories,
      })

      return {
        nodes,
        edges,
        memories,
      }
    } catch (error: any) {
      logger.error('Process crawl result failed:', error)
      throw error
    }
  }

  /**
   * Extract entities from content
   */
  private extractEntities(content: string): Array<{
    id: string
    label: string
    type: string
    properties: Record<string, unknown>
    confidence?: number
  }> {
    const entities: Array<{
      id: string
      label: string
      type: string
      properties: Record<string, unknown>
      confidence?: number
    }> = []

    // Simple entity extraction (in production, use NLP libraries like spaCy, NER, etc.)
    // Extract URLs
    const urlRegex = /https?:\/\/[^\s]+/g
    const urls = content.match(urlRegex) || []
    for (const url of urls) {
      entities.push({
        id: `url-${url.replace(/[^a-zA-Z0-9]/g, '-')}`,
        label: url,
        type: 'url',
        properties: { url },
        confidence: 0.9,
      })
    }

    // Extract email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    const emails = content.match(emailRegex) || []
    for (const email of emails) {
      entities.push({
        id: `email-${email.replace(/[^a-zA-Z0-9]/g, '-')}`,
        label: email,
        type: 'email',
        properties: { email },
        confidence: 0.9,
      })
    }

    // Extract potential organization names (capitalized words)
    const orgRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
    const orgs = content.match(orgRegex) || []
    for (const org of orgs.slice(0, 10)) {
      // Limit to first 10
      if (org.length > 2 && org.length < 50) {
        entities.push({
          id: `org-${org.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
          label: org,
          type: 'organization',
          properties: { name: org },
          confidence: 0.6,
        })
      }
    }

    return entities
  }

  /**
   * Extract relationships from content
   */
  private extractRelationships(
    content: string,
    entities: Array<{ id: string; label: string; type: string }>
  ): Array<{
    source: string
    target: string
    type: string
    weight?: number
    properties?: Record<string, unknown>
  }> {
    const relationships: Array<{
      source: string
      target: string
      type: string
      weight?: number
      properties?: Record<string, unknown>
    }> = []

    // Simple relationship extraction
    // Find co-occurrences (entities appearing near each other)
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i]
        const entity2 = entities[j]

        // Check if entities appear near each other in content
        const index1 = content.indexOf(entity1.label)
        const index2 = content.indexOf(entity2.label)

        if (index1 !== -1 && index2 !== -1) {
          const distance = Math.abs(index1 - index2)
          if (distance < 200) {
            // Within 200 characters
            relationships.push({
              source: entity1.id,
              target: entity2.id,
              type: 'related',
              weight: 1 - distance / 200, // Closer = higher weight
              properties: {
                distance,
                context: content.substring(Math.min(index1, index2), Math.min(index1, index2) + 100),
              },
            })
          }
        }
      }
    }

    return relationships
  }

  /**
   * Search knowledge graph
   */
  async searchKnowledgeGraph(
    query: string,
    options?: {
      type?: string
      limit?: number
      threshold?: number
    }
  ): Promise<KnowledgeGraphData> {
    try {
      // Search in memory
      const memoryResults = await searchMemory(query, {
        limit: options?.limit || 10,
        threshold: options?.threshold || 0.7,
      })

      const nodes: KnowledgeNode[] = []
      const edges: KnowledgeEdge[] = []

      // Create nodes from memory results
      for (const result of memoryResults) {
        const node: KnowledgeNode = {
          id: `memory-${result.id}`,
          type: 'document',
          label: result.text.substring(0, 100),
          properties: {
            text: result.text,
            similarity: result.similarity,
            metadata: result.metadata,
          },
        }
        nodes.push(node)
      }

      // Get related nodes from graph
      if (nodes.length > 0) {
        const firstNode = nodes[0]
        const neighbors = await graph.neighbors(firstNode.id, options?.limit || 10)

        for (const neighbor of neighbors) {
          const node: KnowledgeNode = {
            id: neighbor.id,
            type: neighbor.type as any,
            label: neighbor.label,
            properties: neighbor.properties,
          }
          nodes.push(node)

          // Create edge
          const edge: KnowledgeEdge = {
            id: `edge-${firstNode.id}-${neighbor.id}`,
            source: firstNode.id,
            target: neighbor.id,
            type: 'related',
            weight: 0.5,
          }
          edges.push(edge)
        }
      }

      logger.info('Knowledge graph search completed', {
        query,
        nodes: nodes.length,
        edges: edges.length,
      })

      return {
        nodes,
        edges,
        metadata: {
          query,
          timestamp: new Date(),
        },
      }
    } catch (error: any) {
      logger.error('Knowledge graph search failed:', error)
      throw error
    }
  }

  /**
   * Get knowledge graph statistics
   */
  async getStatistics(): Promise<{
    totalNodes: number
    totalEdges: number
    nodeTypes: Record<string, number>
    edgeTypes: Record<string, number>
  }> {
    try {
      const allNodes = await graph.all()
      const nodeTypes: Record<string, number> = {}
      const edgeTypes: Record<string, number> = {}

      for (const node of allNodes) {
        const type = node.type || 'unknown'
        nodeTypes[type] = (nodeTypes[type] || 0) + 1
      }

      // Get edges from graph summary
      const summary = await graph.summary()

      return {
        totalNodes: allNodes.length,
        totalEdges: summary.edges || 0,
        nodeTypes,
        edgeTypes: summary.edgeTypes || {},
      }
    } catch (error: any) {
      logger.error('Get knowledge graph statistics failed:', error)
      return {
        totalNodes: 0,
        totalEdges: 0,
        nodeTypes: {},
        edgeTypes: {},
      }
    }
  }

  /**
   * Link with Memory Core
   */
  async linkWithMemoryCore(content: string, metadata?: Record<string, unknown>): Promise<string> {
    try {
      // Add to memory
      const memoryId = await addMemory(content, metadata)

      // Create embedding and add to graph
      const embedding = await embed(content)
      if (embedding) {
        await graph.link(memoryId, 'memory', content.substring(0, 100), {
          embedding,
          ...metadata,
        })
      }

      logger.info('Content linked with Memory Core', {
        memoryId,
      })

      return memoryId
    } catch (error: any) {
      logger.error('Link with Memory Core failed:', error)
      throw error
    }
  }

  /**
   * Link with Nicholas Engine
   */
  async linkWithNicholasEngine(query: string, context?: string): Promise<{
    response: string
    nodes: KnowledgeNode[]
    edges: KnowledgeEdge[]
  }> {
    try {
      // Search knowledge graph
      const graphData = await this.searchKnowledgeGraph(query, { limit: 5 })

      // In production, use Nicholas Engine to generate response based on graph data
      // For now, simulate response
      const response = `Based on knowledge graph analysis: ${query} relates to ${graphData.nodes.length} entities and ${graphData.edges.length} relationships.`

      logger.info('Query linked with Nicholas Engine', {
        query,
        nodes: graphData.nodes.length,
        edges: graphData.edges.length,
      })

      return {
        response,
        nodes: graphData.nodes,
        edges: graphData.edges,
      }
    } catch (error: any) {
      logger.error('Link with Nicholas Engine failed:', error)
      throw error
    }
  }
}

// Global Knowledge Graph Integration
export const knowledgeGraphIntegration = new KnowledgeGraphIntegration()

