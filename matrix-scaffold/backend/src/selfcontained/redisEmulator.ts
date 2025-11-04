/**
 * Integrated Redis & Queue Emulator
 * Phase 7.1: Global Auto-Integration & Self-Contained Platform
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'

export interface RedisCommand {
  command: string
  args: string[]
}

export interface QueueItem {
  id: string
  data: string
  priority: number
  timestamp: Date
}

export class RedisEmulator {
  private data: Map<string, string> = new Map()
  private sets: Map<string, Set<string>> = new Map()
  private lists: Map<string, string[]> = new Map()
  private sortedSets: Map<string, Map<string, number>> = new Map()
  private queues: Map<string, QueueItem[]> = new Map()
  private ttl: Map<string, number> = new Map() // Key -> expiration timestamp

  constructor() {
    // Start TTL cleanup
    this.startTTLCleanup()
  }

  /**
   * Start TTL cleanup
   */
  private startTTLCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      for (const [key, expiration] of this.ttl.entries()) {
        if (expiration < now) {
          this.data.delete(key)
          this.sets.delete(key)
          this.lists.delete(key)
          this.sortedSets.delete(key)
          this.ttl.delete(key)
        }
      }
    }, 1000) // Check every second
  }

  /**
   * Execute Redis command
   */
  async execute(command: string, ...args: string[]): Promise<any> {
    try {
      const cmd = command.toLowerCase()

      switch (cmd) {
        case 'get':
          return this.get(args[0])
        case 'set':
          return this.set(args[0], args[1])
        case 'setex':
          return this.setex(args[0], parseInt(args[1], 10), args[2])
        case 'del':
          return this.del(...args)
        case 'exists':
          return this.exists(args[0])
        case 'ping':
          return 'PONG'
        case 'sadd':
          return this.sadd(args[0], ...args.slice(1))
        case 'smembers':
          return this.smembers(args[0])
        case 'srem':
          return this.srem(args[0], ...args.slice(1))
        case 'lpush':
          return this.lpush(args[0], ...args.slice(1))
        case 'rpush':
          return this.rpush(args[0], ...args.slice(1))
        case 'lpop':
          return this.lpop(args[0])
        case 'rpop':
          return this.rpop(args[0])
        case 'llen':
          return this.llen(args[0])
        case 'zadd':
          return this.zadd(args[0], args[1], args[2])
        case 'zrange':
          return this.zrange(args[0], parseInt(args[1], 10), parseInt(args[2], 10), args[3])
        case 'zrem':
          return this.zrem(args[0], ...args.slice(1))
        default:
          logger.warn(`Unknown Redis command: ${command}`)
          return null
      }
    } catch (error: any) {
      logger.error('Execute Redis command failed:', error)
      throw error
    }
  }

  /**
   * GET command
   */
  private get(key: string): string | null {
    if (this.ttl.has(key) && this.ttl.get(key)! < Date.now()) {
      this.data.delete(key)
      this.ttl.delete(key)
      return null
    }
    return this.data.get(key) || null
  }

  /**
   * SET command
   */
  private set(key: string, value: string): 'OK' {
    this.data.set(key, value)
    return 'OK'
  }

  /**
   * SETEX command
   */
  private setex(key: string, seconds: number, value: string): 'OK' {
    this.data.set(key, value)
    this.ttl.set(key, Date.now() + seconds * 1000)
    return 'OK'
  }

  /**
   * DEL command
   */
  private del(...keys: string[]): number {
    let count = 0
    for (const key of keys) {
      if (this.data.delete(key)) count++
      if (this.sets.delete(key)) count++
      if (this.lists.delete(key)) count++
      if (this.sortedSets.delete(key)) count++
      this.ttl.delete(key)
    }
    return count
  }

  /**
   * EXISTS command
   */
  private exists(key: string): number {
    return this.data.has(key) || this.sets.has(key) || this.lists.has(key) || this.sortedSets.has(key) ? 1 : 0
  }

  /**
   * SADD command
   */
  private sadd(key: string, ...members: string[]): number {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set())
    }
    const set = this.sets.get(key)!
    let count = 0
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member)
        count++
      }
    }
    return count
  }

  /**
   * SMEMBERS command
   */
  private smembers(key: string): string[] {
    const set = this.sets.get(key)
    return set ? Array.from(set) : []
  }

  /**
   * SREM command
   */
  private srem(key: string, ...members: string[]): number {
    const set = this.sets.get(key)
    if (!set) return 0

    let count = 0
    for (const member of members) {
      if (set.delete(member)) count++
    }
    return count
  }

  /**
   * LPUSH command
   */
  private lpush(key: string, ...values: string[]): number {
    if (!this.lists.has(key)) {
      this.lists.set(key, [])
    }
    const list = this.lists.get(key)!
    list.unshift(...values)
    return list.length
  }

  /**
   * RPUSH command
   */
  private rpush(key: string, ...values: string[]): number {
    if (!this.lists.has(key)) {
      this.lists.set(key, [])
    }
    const list = this.lists.get(key)!
    list.push(...values)
    return list.length
  }

  /**
   * LPOP command
   */
  private lpop(key: string): string | null {
    const list = this.lists.get(key)
    if (!list || list.length === 0) return null
    return list.shift() || null
  }

  /**
   * RPOP command
   */
  private rpop(key: string): string | null {
    const list = this.lists.get(key)
    if (!list || list.length === 0) return null
    return list.pop() || null
  }

  /**
   * LLEN command
   */
  private llen(key: string): number {
    const list = this.lists.get(key)
    return list ? list.length : 0
  }

  /**
   * ZADD command
   */
  private zadd(key: string, score: string, member: string): number {
    if (!this.sortedSets.has(key)) {
      this.sortedSets.set(key, new Map())
    }
    const sortedSet = this.sortedSets.get(key)!
    const exists = sortedSet.has(member)
    sortedSet.set(member, parseFloat(score))
    return exists ? 0 : 1
  }

  /**
   * ZRANGE command
   */
  private zrange(key: string, start: number, stop: number, withScores?: string): string[] {
    const sortedSet = this.sortedSets.get(key)
    if (!sortedSet) return []

    const entries = Array.from(sortedSet.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by score descending
      .slice(start, stop + 1)

    if (withScores === 'withscores' || withScores === 'REV') {
      const result: string[] = []
      for (const [member, score] of entries) {
        result.push(member)
        result.push(score.toString())
      }
      return result
    }

    return entries.map(([member]) => member)
  }

  /**
   * ZREM command
   */
  private zrem(key: string, ...members: string[]): number {
    const sortedSet = this.sortedSets.get(key)
    if (!sortedSet) return 0

    let count = 0
    for (const member of members) {
      if (sortedSet.delete(member)) count++
    }
    return count
  }

  /**
   * Add to queue (for distributed crawling)
   */
  async addToQueue(queueName: string, data: string, priority: number = 0): Promise<void> {
    try {
      if (!this.queues.has(queueName)) {
        this.queues.set(queueName, [])
      }

      const queue = this.queues.get(queueName)!
      const item: QueueItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        data,
        priority,
        timestamp: new Date(),
      }

      queue.push(item)
      queue.sort((a, b) => b.priority - a.priority) // Sort by priority descending

      logger.debug('Item added to queue', {
        queueName,
        itemId: item.id,
        priority,
      })
    } catch (error: any) {
      logger.error('Add to queue failed:', error)
      throw error
    }
  }

  /**
   * Get from queue
   */
  async getFromQueue(queueName: string): Promise<string | null> {
    try {
      const queue = this.queues.get(queueName)
      if (!queue || queue.length === 0) {
        return null
      }

      const item = queue.shift()
      return item ? item.data : null
    } catch (error: any) {
      logger.error('Get from queue failed:', error)
      return null
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(queueName: string): number {
    const queue = this.queues.get(queueName)
    return queue ? queue.length : 0
  }

  /**
   * Get statistics
   */
  getStats(): {
    keys: number
    sets: number
    lists: number
    sortedSets: number
    queues: number
    memory: number
  } {
    return {
      keys: this.data.size,
      sets: this.sets.size,
      lists: this.lists.size,
      sortedSets: this.sortedSets.size,
      queues: this.queues.size,
      memory: this.estimateMemoryUsage(),
    }
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let size = 0

    for (const [key, value] of this.data.entries()) {
      size += key.length + value.length
    }

    for (const [key, set] of this.sets.entries()) {
      size += key.length
      for (const member of set) {
        size += member.length
      }
    }

    for (const [key, list] of this.lists.entries()) {
      size += key.length
      for (const item of list) {
        size += item.length
      }
    }

    return size
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.data.clear()
    this.sets.clear()
    this.lists.clear()
    this.sortedSets.clear()
    this.queues.clear()
    this.ttl.clear()

    logger.info('Redis emulator cleared')
  }
}

// Global Redis Emulator
export const redisEmulator = new RedisEmulator()

