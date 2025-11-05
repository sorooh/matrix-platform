/**
 * Phase 10.5 - Mobile App Support
 * 
 * Mobile app support (iOS, Android)
 * - Mobile API endpoints
 * - Push notifications
 * - Offline support
 * - Mobile authentication
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type MobilePlatform = 'ios' | 'android' | 'react-native' | 'flutter'
export type PushNotificationType = 'alert' | 'badge' | 'sound' | 'background'

export interface MobileDevice {
  id: string
  userId: string
  platform: MobilePlatform
  deviceId: string
  deviceToken: string
  appVersion: string
  osVersion: string
  isActive: boolean
  registeredAt: Date
  lastActive: Date
}

export interface PushNotification {
  id: string
  deviceId: string
  userId: string
  title: string
  body: string
  type: PushNotificationType
  data: Record<string, any>
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  status: 'pending' | 'sent' | 'delivered' | 'failed'
}

class MobileAppSupport {
  private devices: Map<string, MobileDevice> = new Map()
  private notifications: Map<string, PushNotification> = new Map()

  async initialize() {
    logInfo('Initializing Mobile App Support...')
    logInfo('✅ Mobile App Support initialized')
  }

  async registerDevice(
    userId: string,
    platform: MobilePlatform,
    deviceId: string,
    deviceToken: string,
    appVersion: string,
    osVersion: string
  ): Promise<MobileDevice> {
    const id = nanoid()
    const device: MobileDevice = {
      id,
      userId,
      platform,
      deviceId,
      deviceToken,
      appVersion,
      osVersion,
      isActive: true,
      registeredAt: new Date(),
      lastActive: new Date()
    }
    this.devices.set(id, device)
    logInfo(`✅ Device registered ${id}: ${platform}`)
    return device
  }

  async sendPushNotification(
    deviceId: string,
    userId: string,
    title: string,
    body: string,
    type: PushNotificationType = 'alert',
    data: Record<string, any> = {}
  ): Promise<PushNotification> {
    const id = nanoid()
    const notification: PushNotification = {
      id,
      deviceId,
      userId,
      title,
      body,
      type,
      data,
      status: 'pending'
    }
    this.notifications.set(id, notification)
    logInfo(`✅ Push notification queued ${id}: ${title}`)
    return notification
  }
}

export const mobileAppSupport = new MobileAppSupport()

