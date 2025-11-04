/**
 * Advanced Notifications System
 * Phase 4: User Experience & Interaction
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { prisma } from '../config/database'
import { eventBus } from '../core/eventBus'

export interface Notification {
  id: string
  userId: string
  type: 'info' | 'warning' | 'error' | 'success' | 'system'
  title: string
  message: string
  read: boolean
  actionUrl?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  readAt?: Date
}

export interface NotificationSettings {
  userId: string
  email: boolean
  push: boolean
  inApp: boolean
  types: Record<string, boolean> // Notification type preferences
}

export class NotificationSystem {
  /**
   * Create notification
   */
  async createNotification(
    userId: string,
    notification: {
      type: 'info' | 'warning' | 'error' | 'success' | 'system'
      title: string
      message: string
      actionUrl?: string
      metadata?: Record<string, unknown>
    }
  ): Promise<{ success: boolean; notification?: Notification; error?: string }> {
    try {
      const notif = await prisma.notification.create({
        data: {
          userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          read: false,
          actionUrl: notification.actionUrl,
          metadata: notification.metadata || {},
        },
      })

      // Publish to event bus for real-time updates
      eventBus.publish('notification.created', {
        userId,
        notification: {
          id: notif.id,
          userId: notif.userId,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          read: notif.read,
          actionUrl: notif.actionUrl,
          metadata: notif.metadata as Record<string, unknown>,
          createdAt: notif.createdAt,
        },
      })

      logger.info(`Notification created: ${notif.id}`, { userId, type: notification.type })

      return {
        success: true,
        notification: {
          id: notif.id,
          userId: notif.userId,
          type: notif.type as any,
          title: notif.title,
          message: notif.message,
          read: notif.read,
          actionUrl: notif.actionUrl || undefined,
          metadata: notif.metadata as Record<string, unknown>,
          createdAt: notif.createdAt,
          readAt: notif.readAt || undefined,
        },
      }
    } catch (error: any) {
      logger.error('Create notification failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number; type?: string }
  ): Promise<Notification[]> {
    try {
      const where: any = { userId }
      if (options?.unreadOnly) {
        where.read = false
      }
      if (options?.type) {
        where.type = options.type
      }

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
      })

      return notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        type: n.type as any,
        title: n.title,
        message: n.message,
        read: n.read,
        actionUrl: n.actionUrl || undefined,
        metadata: n.metadata as Record<string, unknown>,
        createdAt: n.createdAt,
        readAt: n.readAt || undefined,
      }))
    } catch (error: any) {
      logger.error('Get user notifications failed:', error)
      return []
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      })

      if (!notification || notification.userId !== userId) {
        return { success: false, error: 'Notification not found or access denied' }
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          read: true,
          readAt: new Date(),
        },
      })

      // Publish to event bus
      eventBus.publish('notification.read', {
        userId,
        notificationId,
      })

      logger.info(`Notification marked as read: ${notificationId}`, { userId })

      return { success: true }
    } catch (error: any) {
      logger.error('Mark notification as read failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      })

      // Publish to event bus
      eventBus.publish('notification.allRead', {
        userId,
        count: result.count,
      })

      logger.info(`Marked all notifications as read: ${result.count}`, { userId })

      return { success: true, count: result.count }
    } catch (error: any) {
      logger.error('Mark all as read failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      })

      if (!notification || notification.userId !== userId) {
        return { success: false, error: 'Notification not found or access denied' }
      }

      await prisma.notification.delete({
        where: { id: notificationId },
      })

      logger.info(`Notification deleted: ${notificationId}`, { userId })

      return { success: true }
    } catch (error: any) {
      logger.error('Delete notification failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await prisma.notification.count({
        where: {
          userId,
          read: false,
        },
      })

      return count
    } catch (error: any) {
      logger.error('Get unread count failed:', error)
      return 0
    }
  }

  /**
   * Get notification stats
   */
  async getNotificationStats(userId: string): Promise<{
    total: number
    unread: number
    byType: Record<string, number>
  }> {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId },
      })

      const byType: Record<string, number> = {}
      for (const n of notifications) {
        byType[n.type] = (byType[n.type] || 0) + 1
      }

      return {
        total: notifications.length,
        unread: notifications.filter((n) => !n.read).length,
        byType,
      }
    } catch (error: any) {
      logger.error('Get notification stats failed:', error)
      return {
        total: 0,
        unread: 0,
        byType: {},
      }
    }
  }

  /**
   * Create system notification
   */
  async createSystemNotification(
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'warning' | 'error' | 'success' = 'info',
    actionUrl?: string
  ): Promise<void> {
    try {
      await this.createNotification(userId, {
        type: 'system',
        title,
        message,
        actionUrl,
        metadata: { systemType: type },
      })
    } catch (error: any) {
      logger.error('Create system notification failed:', error)
    }
  }

  /**
   * Bulk create notifications
   */
  async bulkCreateNotifications(
    userIds: string[],
    notification: {
      type: 'info' | 'warning' | 'error' | 'success' | 'system'
      title: string
      message: string
      actionUrl?: string
      metadata?: Record<string, unknown>
    }
  ): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const notifications = userIds.map((userId) => ({
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: false,
        actionUrl: notification.actionUrl,
        metadata: notification.metadata || {},
      }))

      const result = await prisma.notification.createMany({
        data: notifications,
      })

      // Publish to event bus
      for (const userId of userIds) {
        eventBus.publish('notification.created', {
          userId,
          bulk: true,
        })
      }

      logger.info(`Bulk notifications created: ${result.count}`, { userIds: userIds.length })

      return { success: true, count: result.count }
    } catch (error: any) {
      logger.error('Bulk create notifications failed:', error)
      return { success: false, error: error.message }
    }
  }
}

// Global Notification System
export const notificationSystem = new NotificationSystem()

