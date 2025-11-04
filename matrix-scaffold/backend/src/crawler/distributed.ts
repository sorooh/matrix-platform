/**
 * Distributed Crawling System
 * Phase 6: Global Enhancement - Production-Ready Features
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { redis } from '../config/redis'

export interface DistributedNode {
  id: string
  host: string
  port: number
  status: 'active' | 'inactive' | 'busy'
  capacity: number
  currentLoad: number
  lastHeartbeat: Date
  metadata?: Record<string, unknown>
}

export interface CrawlTask {
  id: string
  url: string
  priority: number
  assignedTo?: string
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed'
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  result?: any
  error?: string
}

export class DistributedCrawler {
  private nodes: Map<string, DistributedNode> = new Map()
  private tasks: Map<string, CrawlTask> = new Map()
  private nodeId: string
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor(nodeId?: string) {
    this.nodeId = nodeId || `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  /**
   * Register node
   */
  async registerNode(node: Omit<DistributedNode, 'lastHeartbeat'>): Promise<void> {
    try {
      const fullNode: DistributedNode = {
        ...node,
        lastHeartbeat: new Date(),
      }

      this.nodes.set(node.id, fullNode)

      // Store in Redis for distributed access
      if (redis) {
        await redis.setex(`crawler:node:${node.id}`, 60, JSON.stringify(fullNode))
      }

      logger.info('Crawler node registered', {
        nodeId: node.id,
        host: node.host,
        capacity: node.capacity,
      })

      eventBus.publish('crawler.distributed.node.registered', {
        node,
      })
    } catch (error: any) {
      logger.error('Register node failed:', error)
      throw error
    }
  }

  /**
   * Start heartbeat
   */
  startHeartbeat(interval: number = 30000): void {
    if (this.heartbeatInterval) {
      return
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        const node = this.nodes.get(this.nodeId)
        if (node) {
          node.lastHeartbeat = new Date()
          node.currentLoad = this.getCurrentLoad()

          // Update in Redis
          if (redis) {
            await redis.setex(`crawler:node:${this.nodeId}`, 60, JSON.stringify(node))
          }
        }
      } catch (error) {
        logger.error('Heartbeat failed:', error)
      }
    }, interval)

    logger.info('Heartbeat started', {
      nodeId: this.nodeId,
      interval,
    })
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
      logger.info('Heartbeat stopped')
    }
  }

  /**
   * Get current load
   */
  private getCurrentLoad(): number {
    const runningTasks = Array.from(this.tasks.values()).filter(
      (t) => t.status === 'running' && t.assignedTo === this.nodeId
    ).length

    return runningTasks
  }

  /**
   * Queue crawl task
   */
  async queueTask(url: string, priority: number = 0): Promise<string> {
    try {
      const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      const task: CrawlTask = {
        id: taskId,
        url,
        priority,
        status: 'pending',
        createdAt: new Date(),
      }

      this.tasks.set(taskId, task)

      // Add to Redis queue
      if (redis) {
        await redis.zadd('crawler:tasks', priority, JSON.stringify(task))
      }

      logger.info('Crawl task queued', {
        taskId,
        url,
        priority,
      })

      eventBus.publish('crawler.distributed.task.queued', {
        task,
      })

      return taskId
    } catch (error: any) {
      logger.error('Queue task failed:', error)
      throw error
    }
  }

  /**
   * Get next task
   */
  async getNextTask(): Promise<CrawlTask | null> {
    try {
      // Get from Redis queue (highest priority first)
      if (redis) {
        const tasks = await redis.zrange('crawler:tasks', 0, 0, 'REV')
        if (tasks.length > 0) {
          const task: CrawlTask = JSON.parse(tasks[0])
          await redis.zrem('crawler:tasks', tasks[0])
          return task
        }
      }

      // Fallback to local queue
      const pendingTasks = Array.from(this.tasks.values())
        .filter((t) => t.status === 'pending')
        .sort((a, b) => b.priority - a.priority)

      if (pendingTasks.length > 0) {
        return pendingTasks[0]
      }

      return null
    } catch (error: any) {
      logger.error('Get next task failed:', error)
      return null
    }
  }

  /**
   * Assign task to node
   */
  async assignTask(taskId: string, nodeId: string): Promise<void> {
    try {
      const task = this.tasks.get(taskId)
      if (!task) {
        throw new Error(`Task ${taskId} not found`)
      }

      const node = this.nodes.get(nodeId)
      if (!node) {
        throw new Error(`Node ${nodeId} not found`)
      }

      if (node.currentLoad >= node.capacity) {
        throw new Error(`Node ${nodeId} is at capacity`)
      }

      task.assignedTo = nodeId
      task.status = 'assigned'
      node.currentLoad++

      logger.info('Task assigned to node', {
        taskId,
        nodeId,
        currentLoad: node.currentLoad,
      })

      eventBus.publish('crawler.distributed.task.assigned', {
        taskId,
        nodeId,
      })
    } catch (error: any) {
      logger.error('Assign task failed:', error)
      throw error
    }
  }

  /**
   * Get available nodes
   */
  getAvailableNodes(): DistributedNode[] {
    return Array.from(this.nodes.values())
      .filter((n) => n.status === 'active' && n.currentLoad < n.capacity)
      .sort((a, b) => a.currentLoad - b.currentLoad)
  }

  /**
   * Get node statistics
   */
  getNodeStats(): {
    totalNodes: number
    activeNodes: number
    totalCapacity: number
    currentLoad: number
    utilization: number
  } {
    const activeNodes = Array.from(this.nodes.values()).filter((n) => n.status === 'active')
    const totalCapacity = activeNodes.reduce((sum, n) => sum + n.capacity, 0)
    const currentLoad = activeNodes.reduce((sum, n) => sum + n.currentLoad, 0)
    const utilization = totalCapacity > 0 ? (currentLoad / totalCapacity) * 100 : 0

    return {
      totalNodes: this.nodes.size,
      activeNodes: activeNodes.length,
      totalCapacity,
      currentLoad,
      utilization,
    }
  }
}

// Global Distributed Crawler
export const distributedCrawler = new DistributedCrawler()

