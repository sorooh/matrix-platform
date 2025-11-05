/**
 * Phase 9 - CDN & Edge Distribution Layer
 * 
 * Global content distribution
 * - Edge nodes distribution
 * - Latency optimization
 * - Performance monitoring
 * - Cache optimization
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type EdgeNodeStatus = 'active' | 'inactive' | 'maintenance' | 'overloaded'
export type CacheStrategy = 'cache_all' | 'cache_static' | 'cache_dynamic' | 'no_cache'

export interface EdgeNode {
  id: string
  region: string
  provider: string // cloudflare | fastly | aws | gcp
  status: EdgeNodeStatus
  location: {
    city: string
    country: string
    latitude: number
    longitude: number
  }
  performance: {
    latency: number // milliseconds
    throughput: number // requests per second
    errorRate: number // percentage
    uptime: number // percentage
  }
  lastChecked: Date
}

export interface CDNConfig {
  id: string
  domainId: string
  cacheStrategy: CacheStrategy
  cacheTTL: number // seconds
  compression: boolean
  minification: boolean
  edgeNodes: string[] // Edge node IDs
  routingRules: RoutingRule[]
  createdAt: Date
  updatedAt: Date
}

export interface RoutingRule {
  id: string
  pattern: string
  targetNode: string
  priority: number
  conditions: Record<string, any>
}

export interface CacheHit {
  id: string
  nodeId: string
  url: string
  hit: boolean
  latency: number
  timestamp: Date
}

class EdgeDistributionLayer {
  private edgeNodes: Map<string, EdgeNode> = new Map()
  private cdnConfigs: Map<string, CDNConfig> = new Map()
  private cacheHits: Map<string, CacheHit[]> = new Map()

  async initialize() {
    logInfo('Initializing CDN & Edge Distribution Layer...')

    // Initialize edge nodes
    await this.initializeEdgeNodes()

    // Start performance monitoring
    this.startPerformanceMonitoring()

    logInfo('✅ CDN & Edge Distribution Layer initialized')
  }

  // Initialize edge nodes
  private async initializeEdgeNodes(): Promise<void> {
    const defaultNodes: Omit<EdgeNode, 'id' | 'lastChecked'>[] = [
      {
        region: 'EU',
        provider: 'cloudflare',
        status: 'active',
        location: { city: 'London', country: 'UK', latitude: 51.5074, longitude: -0.1278 },
        performance: { latency: 10, throughput: 10000, errorRate: 0.1, uptime: 99.9 }
      },
      {
        region: 'US',
        provider: 'cloudflare',
        status: 'active',
        location: { city: 'New York', country: 'USA', latitude: 40.7128, longitude: -74.0060 },
        performance: { latency: 15, throughput: 10000, errorRate: 0.1, uptime: 99.9 }
      },
      {
        region: 'ASIA',
        provider: 'cloudflare',
        status: 'active',
        location: { city: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503 },
        performance: { latency: 20, throughput: 10000, errorRate: 0.1, uptime: 99.9 }
      }
    ]

    for (const node of defaultNodes) {
      const nodeId = nanoid()
      const now = new Date()

      const edgeNode: EdgeNode = {
        id: nodeId,
        ...node,
        lastChecked: now
      }

      this.edgeNodes.set(nodeId, edgeNode)
    }
  }

  // Configure CDN
  async configureCDN(
    domainId: string,
    cacheStrategy: CacheStrategy,
    cacheTTL: number = 3600,
    compression: boolean = true,
    minification: boolean = true
  ): Promise<CDNConfig> {
    try {
      const configId = nanoid()
      const now = new Date()

      // Select best edge nodes
      const selectedNodes = this.selectBestEdgeNodes()

      const cdnConfig: CDNConfig = {
        id: configId,
        domainId,
        cacheStrategy,
        cacheTTL,
        compression,
        minification,
        edgeNodes: selectedNodes.map(n => n.id),
        routingRules: [],
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.cDNConfig.create({
          data: {
            id: configId,
            domainId,
            cacheStrategy,
            cacheTTL,
            compression,
            minification,
            edgeNodes: cdnConfig.edgeNodes,
            routingRules: []
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Configure CDN in database' })
      }

      this.cdnConfigs.set(configId, cdnConfig)

      logInfo(`✅ Configured CDN ${configId} for domain ${domainId}`)

      return cdnConfig
    } catch (error) {
      logError(error as Error, { context: 'Configure CDN' })
      throw error
    }
  }

  // Select best edge nodes
  private selectBestEdgeNodes(): EdgeNode[] {
    const nodes: EdgeNode[] = []
    for (const node of this.edgeNodes.values()) {
      if (node.status === 'active' && node.performance.uptime > 99) {
        nodes.push(node)
      }
    }
    // Sort by latency
    return nodes.sort((a, b) => a.performance.latency - b.performance.latency).slice(0, 3)
  }

  // Route request to best edge node
  async routeRequest(
    url: string,
    userLocation?: { latitude: number; longitude: number }
  ): Promise<string> {
    try {
      // Find best edge node based on user location or latency
      let bestNode: EdgeNode | null = null

      if (userLocation) {
        // Find closest node by distance
        let minDistance = Infinity
        for (const node of this.edgeNodes.values()) {
          if (node.status !== 'active') continue

          const distance = this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            node.location.latitude,
            node.location.longitude
          )

          if (distance < minDistance) {
            minDistance = distance
            bestNode = node
          }
        }
      } else {
        // Find node with lowest latency
        bestNode = Array.from(this.edgeNodes.values())
          .filter(n => n.status === 'active')
          .sort((a, b) => a.performance.latency - b.performance.latency)[0] || null
      }

      if (!bestNode) {
        throw new Error('No available edge node')
      }

      // Check cache
      const cacheHit = await this.checkCache(bestNode.id, url)

      // Record cache hit
      const hitId = nanoid()
      const now = new Date()
      const cacheHitRecord: CacheHit = {
        id: hitId,
        nodeId: bestNode.id,
        url,
        hit: cacheHit,
        latency: bestNode.performance.latency,
        timestamp: now
      }

      const hits = this.cacheHits.get(bestNode.id) || []
      hits.push(cacheHitRecord)
      if (hits.length > 1000) hits.shift()
      this.cacheHits.set(bestNode.id, hits)

      return bestNode.id
    } catch (error) {
      logError(error as Error, { context: 'Route request' })
      throw error
    }
  }

  // Check cache
  private async checkCache(nodeId: string, url: string): Promise<boolean> {
    // In production, check actual cache
    // For now, simulate cache check
    return Math.random() > 0.3 // 70% cache hit rate
  }

  // Calculate distance between two coordinates
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Convert degrees to radians
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  // Start performance monitoring
  private startPerformanceMonitoring(): void {
    // Monitor edge nodes every 5 minutes
    setInterval(async () => {
      try {
        for (const node of this.edgeNodes.values()) {
          // Update performance metrics
          // In production, ping actual edge nodes
          node.performance.latency = 10 + Math.random() * 20
          node.performance.throughput = 8000 + Math.random() * 4000
          node.performance.errorRate = Math.random() * 0.5
          node.performance.uptime = 99 + Math.random()

          // Update status based on performance
          if (node.performance.errorRate > 5 || node.performance.uptime < 95) {
            node.status = 'overloaded'
          } else if (node.status === 'overloaded' && node.performance.errorRate < 1) {
            node.status = 'active'
          }

          node.lastChecked = new Date()
          this.edgeNodes.set(node.id, node)
        }
      } catch (error) {
        logError(error as Error, { context: 'Performance monitoring' })
      }
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  // Get edge node
  async getEdgeNode(nodeId: string): Promise<EdgeNode | null> {
    return this.edgeNodes.get(nodeId) || null
  }

  // Get cache statistics
  async getCacheStatistics(nodeId: string): Promise<{ hits: number; misses: number; hitRate: number }> {
    const hits = this.cacheHits.get(nodeId) || []
    const total = hits.length
    const hitCount = hits.filter(h => h.hit).length
    const missCount = total - hitCount
    const hitRate = total > 0 ? (hitCount / total) * 100 : 0

    return { hits: hitCount, misses: missCount, hitRate }
  }
}

export const edgeDistributionLayer = new EdgeDistributionLayer()

