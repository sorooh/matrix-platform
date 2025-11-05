/**
 * Phase 8 - Private Instance Manager
 * 
 * Create and run dedicated AI instances for each customer
 * - Isolated resources (Memory / Storage / API Access)
 * - Manage custom instances via separate control panel per customer
 * - Monitor performance of each instance (Uptime / Requests / Usage)
 * - Auto-delete or freeze instance when subscription ends
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'
import { subscriptionManager } from '../billing/subscription'

export type InstanceStatus = 'active' | 'suspended' | 'expired' | 'deleted'
export type InstanceType = 'nicholas' | 'surooh' | 'lida' | 'bot' | 'model' | 'custom'

export interface PrivateInstance {
  id: string
  userId: string
  subscriptionId: string
  name: string
  type: InstanceType
  status: InstanceStatus
  resources: InstanceResources
  performance: InstancePerformance
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
}

export interface InstanceResources {
  memory: number // in bytes
  storage: number // in bytes
  apiAccess: boolean
  allowedEndpoints: string[]
  rateLimit?: {
    requestsPerMinute?: number
    requestsPerHour?: number
    requestsPerDay?: number
  }
}

export interface InstancePerformance {
  uptime: number // in seconds
  requests: number
  tokens: number
  cost: number
  lastRequestAt?: Date
  averageResponseTime?: number // in milliseconds
}

class PrivateInstanceManager {
  private instances: Map<string, PrivateInstance> = new Map()
  private instanceStartTimes: Map<string, Date> = new Map()

  async initialize() {
    logInfo('Initializing Private Instance Manager...')

    // Load instances from database
    try {
      const { prisma } = await import('../config/database')
      const instances = await prisma.privateInstance.findMany()
      for (const instance of instances) {
        this.instances.set(instance.id, {
          id: instance.id,
          userId: instance.userId,
          subscriptionId: instance.subscriptionId,
          name: instance.name,
          type: instance.type as InstanceType,
          status: instance.status as InstanceStatus,
          resources: instance.resources as InstanceResources,
          performance: instance.performance as InstancePerformance,
          metadata: instance.metadata as Record<string, any>,
          createdAt: instance.createdAt,
          updatedAt: instance.updatedAt,
          expiresAt: instance.expiresAt || undefined
        })
        if (instance.status === 'active') {
          this.instanceStartTimes.set(instance.id, instance.createdAt)
        }
      }
      logInfo(`✅ Loaded ${instances.length} private instances from database`)
    } catch (error) {
      logError(error as Error, { context: 'Private Instance initialization' })
    }

    // Start periodic checks
    setInterval(() => this.checkExpiredInstances(), 60 * 60 * 1000) // Every hour

    logInfo('✅ Private Instance Manager initialized')
  }

  // Create private instance
  async createInstance(
    userId: string,
    subscriptionId: string,
    name: string,
    type: InstanceType,
    resources?: Partial<InstanceResources>
  ): Promise<PrivateInstance> {
    try {
      // Check subscription
      const subscription = await subscriptionManager.getSubscription(subscriptionId)
      if (!subscription) {
        throw new Error('Subscription not found')
      }

      if (subscription.status !== 'active' && subscription.status !== 'trial') {
        throw new Error('Subscription is not active')
      }

      const instanceId = nanoid()
      const now = new Date()

      // Get subscription limits
      const limits = subscriptionManager.getTierLimits(subscription.tier)
      const expiresAt = subscription.currentPeriodEnd

      // Default resources
      const defaultResources: InstanceResources = {
        memory: limits.storage === -1 ? 10 * 1024 * 1024 * 1024 : Math.min(limits.storage, 10 * 1024 * 1024 * 1024), // 10 GB max
        storage: limits.storage === -1 ? 10 * 1024 * 1024 * 1024 : Math.min(limits.storage, 10 * 1024 * 1024 * 1024),
        apiAccess: true,
        allowedEndpoints: ['*'], // All endpoints by default
        rateLimit: {
          requestsPerMinute: limits.requests === -1 ? undefined : Math.floor(limits.requests / 1440),
          requestsPerHour: limits.requests === -1 ? undefined : Math.floor(limits.requests / 24),
          requestsPerDay: limits.requests === -1 ? undefined : limits.requests
        }
      }

      const instance: PrivateInstance = {
        id: instanceId,
        userId,
        subscriptionId,
        name,
        type,
        status: 'active',
        resources: { ...defaultResources, ...resources },
        performance: {
          uptime: 0,
          requests: 0,
          tokens: 0,
          cost: 0
        },
        metadata: {},
        createdAt: now,
        updatedAt: now,
        expiresAt
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.privateInstance.create({
          data: {
            id: instanceId,
            userId,
            subscriptionId,
            name,
            type,
            status: 'active',
            resources: instance.resources,
            performance: instance.performance,
            metadata: instance.metadata,
            expiresAt: expiresAt || null
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create instance in database' })
      }

      this.instances.set(instanceId, instance)
      this.instanceStartTimes.set(instanceId, now)
      logInfo(`✅ Created private instance ${instanceId} for user ${userId}`)

      return instance
    } catch (error) {
      logError(error as Error, { context: 'Create instance' })
      throw error
    }
  }

  // Get instance
  async getInstance(instanceId: string): Promise<PrivateInstance | null> {
    return this.instances.get(instanceId) || null
  }

  // Get instances by user
  async getInstancesByUserId(userId: string): Promise<PrivateInstance[]> {
    const userInstances: PrivateInstance[] = []
    for (const instance of this.instances.values()) {
      if (instance.userId === userId) {
        userInstances.push(instance)
      }
    }
    return userInstances.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Get instances by subscription
  async getInstancesBySubscription(subscriptionId: string): Promise<PrivateInstance[]> {
    const subscriptionInstances: PrivateInstance[] = []
    for (const instance of this.instances.values()) {
      if (instance.subscriptionId === subscriptionId) {
        subscriptionInstances.push(instance)
      }
    }
    return subscriptionInstances
  }

  // Update instance
  async updateInstance(
    instanceId: string,
    updates: Partial<PrivateInstance>
  ): Promise<PrivateInstance | null> {
    const instance = this.instances.get(instanceId)
    if (!instance) return null

    const updated = {
      ...instance,
      ...updates,
      updatedAt: new Date()
    }

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.privateInstance.update({
        where: { id: instanceId },
        data: {
          status: updated.status,
          resources: updated.resources,
          performance: updated.performance,
          metadata: updated.metadata,
          expiresAt: updated.expiresAt || null
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Update instance in database' })
    }

    this.instances.set(instanceId, updated)
    return updated
  }

  // Suspend instance
  async suspendInstance(instanceId: string): Promise<boolean> {
    const instance = this.instances.get(instanceId)
    if (!instance) return false

    await this.updateInstance(instanceId, { status: 'suspended' })
    this.instanceStartTimes.delete(instanceId)
    logInfo(`✅ Suspended instance ${instanceId}`)

    return true
  }

  // Resume instance
  async resumeInstance(instanceId: string): Promise<boolean> {
    const instance = this.instances.get(instanceId)
    if (!instance) return false

    await this.updateInstance(instanceId, { status: 'active' })
    this.instanceStartTimes.set(instanceId, new Date())
    logInfo(`✅ Resumed instance ${instanceId}`)

    return true
  }

  // Delete instance
  async deleteInstance(instanceId: string): Promise<boolean> {
    const instance = this.instances.get(instanceId)
    if (!instance) return false

    await this.updateInstance(instanceId, { status: 'deleted' })
    this.instanceStartTimes.delete(instanceId)

    // Delete from database
    try {
      const { prisma } = await import('../config/database')
      await prisma.privateInstance.delete({
        where: { id: instanceId }
      })
    } catch (error) {
      logError(error as Error, { context: 'Delete instance from database' })
    }

    this.instances.delete(instanceId)
    logInfo(`✅ Deleted instance ${instanceId}`)

    return true
  }

  // Track usage
  async trackUsage(
    instanceId: string,
    requests: number = 1,
    tokens: number = 0,
    cost: number = 0,
    responseTime?: number
  ): Promise<void> {
    const instance = this.instances.get(instanceId)
    if (!instance) return

    instance.performance.requests += requests
    instance.performance.tokens += tokens
    instance.performance.cost += cost
    instance.performance.lastRequestAt = new Date()

    if (responseTime !== undefined) {
      const currentAvg = instance.performance.averageResponseTime || 0
      const totalRequests = instance.performance.requests
      instance.performance.averageResponseTime = 
        (currentAvg * (totalRequests - 1) + responseTime) / totalRequests
    }

    // Update uptime
    const startTime = this.instanceStartTimes.get(instanceId)
    if (startTime) {
      instance.performance.uptime = Math.floor((Date.now() - startTime.getTime()) / 1000)
    }

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.privateInstance.update({
        where: { id: instanceId },
        data: {
          performance: instance.performance
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Track usage in database' })
    }

    this.instances.set(instanceId, instance)
  }

  // Check expired instances
  async checkExpiredInstances(): Promise<void> {
    const now = new Date()
    for (const instance of this.instances.values()) {
      if (instance.status === 'active' && instance.expiresAt && instance.expiresAt < now) {
        await this.suspendInstance(instance.id)
        logInfo(`✅ Auto-suspended expired instance ${instance.id}`)
      }
    }
  }

  // Get instance performance
  async getInstancePerformance(instanceId: string): Promise<InstancePerformance | null> {
    const instance = this.instances.get(instanceId)
    return instance?.performance || null
  }
}

export const privateInstanceManager = new PrivateInstanceManager()

