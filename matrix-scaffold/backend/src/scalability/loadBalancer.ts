/**
 * Load Balancer System
 * Phase 3: Advanced Scalability
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'

export interface LoadBalancerConfig {
  algorithm: 'round-robin' | 'least-connections' | 'ip-hash' | 'weighted'
  healthCheckInterval: number
  healthCheckTimeout: number
  maxRetries: number
}

export interface Server {
  id: string
  url: string
  weight: number
  healthy: boolean
  connections: number
  lastHealthCheck: Date
  region?: string
}

export class LoadBalancer {
  private servers: Map<string, Server> = new Map()
  private config: LoadBalancerConfig = {
    algorithm: 'round-robin',
    healthCheckInterval: 30000, // 30 seconds
    healthCheckTimeout: 5000, // 5 seconds
    maxRetries: 3
  }
  private currentIndex: number = 0

  constructor(config?: Partial<LoadBalancerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  /**
   * Add server to load balancer
   */
  addServer(server: Server): void {
    try {
      this.servers.set(server.id, server)
      logger.info(`Server added to load balancer: ${server.id}`, {
        url: server.url,
        region: server.region
      })
    } catch (error: any) {
      logger.error('Failed to add server to load balancer:', error)
    }
  }

  /**
   * Remove server from load balancer
   */
  removeServer(serverId: string): void {
    try {
      this.servers.delete(serverId)
      logger.info(`Server removed from load balancer: ${serverId}`)
    } catch (error: any) {
      logger.error('Failed to remove server from load balancer:', error)
    }
  }

  /**
   * Get next server based on algorithm
   */
  getNextServer(): Server | null {
    try {
      const healthyServers = Array.from(this.servers.values()).filter((s) => s.healthy)

      if (healthyServers.length === 0) {
        logger.warn('No healthy servers available')
        return null
      }

      switch (this.config.algorithm) {
        case 'round-robin':
          return this.getRoundRobinServer(healthyServers)
        case 'least-connections':
          return this.getLeastConnectionsServer(healthyServers)
        case 'ip-hash':
          return this.getIPHashServer(healthyServers)
        case 'weighted':
          return this.getWeightedServer(healthyServers)
        default:
          return healthyServers[0]
      }
    } catch (error: any) {
      logger.error('Failed to get next server:', error)
      return null
    }
  }

  /**
   * Round-robin algorithm
   */
  private getRoundRobinServer(servers: Server[]): Server {
    const server = servers[this.currentIndex % servers.length]
    this.currentIndex++
    return server
  }

  /**
   * Least connections algorithm
   */
  private getLeastConnectionsServer(servers: Server[]): Server {
    return servers.reduce((min, server) =>
      server.connections < min.connections ? server : min
    )
  }

  /**
   * IP hash algorithm
   */
  private getIPHashServer(servers: Server[]): Server {
    // Simplified - in production, use actual IP
    const hash = Math.random()
    return servers[Math.floor(hash * servers.length)]
  }

  /**
   * Weighted algorithm
   */
  private getWeightedServer(servers: Server[]): Server {
    const totalWeight = servers.reduce((sum, s) => sum + s.weight, 0)
    let random = Math.random() * totalWeight

    for (const server of servers) {
      random -= server.weight
      if (random <= 0) {
        return server
      }
    }

    return servers[0]
  }

  /**
   * Health check for all servers
   */
  async healthCheck(): Promise<void> {
    try {
      for (const server of this.servers.values()) {
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), this.config.healthCheckTimeout)

          const response = await fetch(`${server.url}/health`, {
            method: 'GET',
            signal: controller.signal as any
          })

          clearTimeout(timeout)

          server.healthy = response.ok
          server.lastHealthCheck = new Date()

          if (!server.healthy) {
            logger.warn(`Server health check failed: ${server.id}`, {
              url: server.url,
              status: response.status
            })
          }
        } catch (error: any) {
          server.healthy = false
          server.lastHealthCheck = new Date()
          logger.warn(`Server health check error: ${server.id}`, {
            url: server.url,
            error: error.message
          })
        }
      }
    } catch (error: any) {
      logger.error('Health check failed:', error)
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(): void {
    setInterval(() => {
      this.healthCheck()
    }, this.config.healthCheckInterval)

    logger.info('Load balancer health checks started', {
      interval: this.config.healthCheckInterval
    })
  }

  /**
   * Get load balancer statistics
   */
  getStats(): {
    totalServers: number
    healthyServers: number
    unhealthyServers: number
    algorithm: string
    servers: Array<{
      id: string
      url: string
      healthy: boolean
      connections: number
      region?: string
    }>
  } {
    const servers = Array.from(this.servers.values())
    const healthy = servers.filter((s) => s.healthy).length

    return {
      totalServers: servers.length,
      healthyServers: healthy,
      unhealthyServers: servers.length - healthy,
      algorithm: this.config.algorithm,
      servers: servers.map((s) => ({
        id: s.id,
        url: s.url,
        healthy: s.healthy,
        connections: s.connections,
        region: s.region
      }))
    }
  }
}

// Global Load Balancer
export const loadBalancer = new LoadBalancer()

