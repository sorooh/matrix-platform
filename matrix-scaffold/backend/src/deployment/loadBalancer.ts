/**
 * AI Load Balancer & Global Orchestrator
 * Phase 7: Autonomous Deployment & Global Orchestration
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { loadBalancer as existingLoadBalancer } from '../scalability/loadBalancer'
import { autoScaler } from '../scalability/autoScaler'

export interface Region {
  id: string
  name: string
  location: 'us' | 'eu' | 'asia'
  endpoint: string
  status: 'active' | 'inactive' | 'degraded'
  capacity: number
  currentLoad: number
  latency: number // in milliseconds
  healthScore: number // 0-100
  lastChecked: Date
}

export interface DeploymentInstance {
  id: string
  region: string
  version: string
  url: string
  status: 'running' | 'stopped' | 'degraded'
  cpu: number
  memory: number
  network: number
  uptime: number
  errorRate: number
  lastDeployed: Date
}

export interface LoadBalancerConfig {
  algorithm: 'round-robin' | 'least-connections' | 'latency-based' | 'ai-optimized'
  healthCheckInterval: number
  failoverThreshold: number
  autoScaleEnabled: boolean
  minInstances: number
  maxInstances: number
}

export class AILoadBalancerOrchestrator {
  private regions: Map<string, Region> = new Map()
  private instances: Map<string, DeploymentInstance> = new Map()
  private config: LoadBalancerConfig

  constructor() {
    this.config = {
      algorithm: 'ai-optimized',
      healthCheckInterval: 30000, // 30 seconds
      failoverThreshold: 3,
      autoScaleEnabled: true,
      minInstances: 1,
      maxInstances: 10,
    }
  }

  /**
   * Initialize AI Load Balancer
   */
  async initialize(): Promise<void> {
    try {
      // Register default regions
      await this.registerRegion({
        id: 'us-east',
        name: 'US East',
        location: 'us',
        endpoint: 'https://us-east.matrix-platform.com',
        status: 'active',
        capacity: 100,
        currentLoad: 0,
        latency: 0,
        healthScore: 100,
        lastChecked: new Date(),
      })

      await this.registerRegion({
        id: 'eu-west',
        name: 'EU West',
        location: 'eu',
        endpoint: 'https://eu-west.matrix-platform.com',
        status: 'active',
        capacity: 100,
        currentLoad: 0,
        latency: 0,
        healthScore: 100,
        lastChecked: new Date(),
      })

      await this.registerRegion({
        id: 'asia-southeast',
        name: 'Asia Southeast',
        location: 'asia',
        endpoint: 'https://asia-southeast.matrix-platform.com',
        status: 'active',
        capacity: 100,
        currentLoad: 0,
        latency: 0,
        healthScore: 100,
        lastChecked: new Date(),
      })

      // Start health checks
      this.startHealthChecks()

      // Start auto-scaling
      if (this.config.autoScaleEnabled) {
        this.startAutoScaling()
      }

      logger.info('AI Load Balancer & Global Orchestrator initialized')
    } catch (error: any) {
      logger.error('AI Load Balancer initialization failed:', error)
      throw error
    }
  }

  /**
   * Register region
   */
  async registerRegion(region: Region): Promise<void> {
    try {
      this.regions.set(region.id, region)

      logger.info('Region registered', {
        regionId: region.id,
        location: region.location,
      })

      eventBus.publish('deployment.loadbalancer.region.registered', {
        region,
      })
    } catch (error: any) {
      logger.error('Register region failed:', error)
      throw error
    }
  }

  /**
   * Select best region for deployment
   */
  async selectBestRegion(
    userLocation?: string,
    requirements?: {
      minLatency?: number
      preferredRegion?: 'us' | 'eu' | 'asia'
      minCapacity?: number
    }
  ): Promise<Region | null> {
    try {
      const availableRegions = Array.from(this.regions.values()).filter(
        (r) => r.status === 'active' && r.healthScore > 50
      )

      if (availableRegions.length === 0) {
        return null
      }

      // AI-optimized selection
      if (this.config.algorithm === 'ai-optimized') {
        return this.selectRegionAI(availableRegions, userLocation, requirements)
      }

      // Latency-based selection
      if (this.config.algorithm === 'latency-based') {
        return availableRegions.sort((a, b) => a.latency - b.latency)[0]
      }

      // Least connections
      if (this.config.algorithm === 'least-connections') {
        return availableRegions.sort(
          (a, b) => a.currentLoad / a.capacity - b.currentLoad / b.capacity
        )[0]
      }

      // Round-robin
      return availableRegions[Math.floor(Math.random() * availableRegions.length)]
    } catch (error: any) {
      logger.error('Select best region failed:', error)
      return null
    }
  }

  /**
   * AI-optimized region selection
   */
  private selectRegionAI(
    regions: Region[],
    userLocation?: string,
    requirements?: {
      minLatency?: number
      preferredRegion?: 'us' | 'eu' | 'asia'
      minCapacity?: number
    }
  ): Region {
    // Score each region
    const scoredRegions = regions.map((region) => {
      let score = region.healthScore

      // Prefer region with lower load
      score += (1 - region.currentLoad / region.capacity) * 20

      // Prefer region with lower latency
      score += Math.max(0, 100 - region.latency) * 0.5

      // Prefer preferred region if specified
      if (requirements?.preferredRegion && region.location === requirements.preferredRegion) {
        score += 30
      }

      // Penalize if capacity is insufficient
      if (requirements?.minCapacity && region.capacity < requirements.minCapacity) {
        score -= 50
      }

      // Penalize if latency is too high
      if (requirements?.minLatency && region.latency > requirements.minLatency) {
        score -= 50
      }

      return { region, score }
    })

    // Select region with highest score
    return scoredRegions.sort((a, b) => b.score - a.score)[0].region
  }

  /**
   * Register deployment instance
   */
  async registerInstance(instance: DeploymentInstance): Promise<void> {
    try {
      this.instances.set(instance.id, instance)

      // Update region load
      const region = this.regions.get(instance.region)
      if (region) {
        region.currentLoad++
      }

      logger.info('Deployment instance registered', {
        instanceId: instance.id,
        region: instance.region,
        version: instance.version,
      })

      eventBus.publish('deployment.loadbalancer.instance.registered', {
        instance,
      })
    } catch (error: any) {
      logger.error('Register instance failed:', error)
      throw error
    }
  }

  /**
   * Route request to best instance
   */
  async routeRequest(
    userLocation?: string,
    requirements?: {
      minLatency?: number
      preferredRegion?: 'us' | 'eu' | 'asia'
    }
  ): Promise<DeploymentInstance | null> {
    try {
      // Select best region
      const region = await this.selectBestRegion(userLocation, requirements)
      if (!region) {
        return null
      }

      // Get instances in selected region
      const regionInstances = Array.from(this.instances.values()).filter(
        (i) => i.region === region.id && i.status === 'running'
      )

      if (regionInstances.length === 0) {
        return null
      }

      // Select best instance (least load)
      const instance = regionInstances.sort(
        (a, b) => (a.cpu + a.memory) / 2 - (b.cpu + b.memory) / 2
      )[0]

      return instance
    } catch (error: any) {
      logger.error('Route request failed:', error)
      return null
    }
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    setInterval(async () => {
      try {
        await this.performHealthChecks()
      } catch (error) {
        logger.error('Health check failed:', error)
      }
    }, this.config.healthCheckInterval)
  }

  /**
   * Perform health checks
   */
  private async performHealthChecks(): Promise<void> {
    try {
      for (const [regionId, region] of this.regions.entries()) {
        try {
          const startTime = Date.now()
          const response = await fetch(region.endpoint + '/health', {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
          })

          const latency = Date.now() - startTime
          const healthScore = response.ok ? 100 - Math.min(latency / 10, 50) : 0

          region.latency = latency
          region.healthScore = healthScore
          region.status = healthScore > 50 ? 'active' : healthScore > 20 ? 'degraded' : 'inactive'
          region.lastChecked = new Date()

          // Update load
          const regionInstances = Array.from(this.instances.values()).filter(
            (i) => i.region === regionId && i.status === 'running'
          )
          region.currentLoad = regionInstances.length

          logger.debug('Region health check completed', {
            regionId,
            healthScore,
            latency,
            status: region.status,
          })
        } catch (error: any) {
          region.status = 'inactive'
          region.healthScore = 0
          region.lastChecked = new Date()

          logger.warn('Region health check failed', {
            regionId,
            error: error.message,
          })
        }
      }
    } catch (error: any) {
      logger.error('Perform health checks failed:', error)
    }
  }

  /**
   * Start auto-scaling
   */
  private startAutoScaling(): void {
    setInterval(async () => {
      try {
        await this.evaluateAutoScaling()
      } catch (error) {
        logger.error('Auto-scaling evaluation failed:', error)
      }
    }, 60000) // Every minute
  }

  /**
   * Evaluate auto-scaling
   */
  private async evaluateAutoScaling(): Promise<void> {
    try {
      for (const [regionId, region] of this.regions.entries()) {
        const regionInstances = Array.from(this.instances.values()).filter(
          (i) => i.region === regionId && i.status === 'running'
        )

        const currentCount = regionInstances.length
        const utilization = region.currentLoad / region.capacity

        // Scale up if utilization is high
        if (utilization > 0.8 && currentCount < this.config.maxInstances) {
          logger.info('Auto-scaling: Scaling up', {
            regionId,
            currentCount,
            utilization,
          })

          // Trigger scale up (in production, deploy new instance)
          eventBus.publish('deployment.loadbalancer.scale.up', {
            regionId,
            currentCount,
            targetCount: currentCount + 1,
          })
        }

        // Scale down if utilization is low
        if (utilization < 0.3 && currentCount > this.config.minInstances) {
          logger.info('Auto-scaling: Scaling down', {
            regionId,
            currentCount,
            utilization,
          })

          // Trigger scale down (in production, remove instance)
          eventBus.publish('deployment.loadbalancer.scale.down', {
            regionId,
            currentCount,
            targetCount: currentCount - 1,
          })
        }
      }
    } catch (error: any) {
      logger.error('Evaluate auto-scaling failed:', error)
    }
  }

  /**
   * Get region statistics
   */
  getRegionStats(): {
    totalRegions: number
    activeRegions: number
    totalCapacity: number
    currentLoad: number
    utilization: number
    regions: Region[]
  } {
    const regions = Array.from(this.regions.values())
    const activeRegions = regions.filter((r) => r.status === 'active')
    const totalCapacity = regions.reduce((sum, r) => sum + r.capacity, 0)
    const currentLoad = regions.reduce((sum, r) => sum + r.currentLoad, 0)
    const utilization = totalCapacity > 0 ? (currentLoad / totalCapacity) * 100 : 0

    return {
      totalRegions: regions.length,
      activeRegions: activeRegions.length,
      totalCapacity,
      currentLoad,
      utilization,
      regions,
    }
  }

  /**
   * Get instance statistics
   */
  getInstanceStats(): {
    totalInstances: number
    runningInstances: number
    stoppedInstances: number
    degradedInstances: number
    instances: DeploymentInstance[]
  } {
    const instances = Array.from(this.instances.values())

    return {
      totalInstances: instances.length,
      runningInstances: instances.filter((i) => i.status === 'running').length,
      stoppedInstances: instances.filter((i) => i.status === 'stopped').length,
      degradedInstances: instances.filter((i) => i.status === 'degraded').length,
      instances,
    }
  }
}

// Global AI Load Balancer & Global Orchestrator
export const aiLoadBalancerOrchestrator = new AILoadBalancerOrchestrator()

