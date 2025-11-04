/**
 * Integration Control Layer
 * Phase 7.3: Admin Dashboard & Integration Control
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { keysAndIntegrationsManager } from './keysManager'

export interface ConfigUpdate {
  id: string
  module: string
  config: Record<string, unknown>
  timestamp: Date
  applied: boolean
  error?: string
}

export interface IntegrationStatus {
  integrationId: string
  status: 'connected' | 'disconnected' | 'error'
  lastCheck: Date
  reconnectAttempts: number
  lastError?: string
}

export class IntegrationControlLayer {
  private configUpdates: Map<string, ConfigUpdate> = new Map()
  private integrationStatuses: Map<string, IntegrationStatus> = new Map()
  private reconnectIntervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Initialize Integration Control Layer
   */
  async initialize(): Promise<void> {
    try {
      // Start monitoring integrations
      this.startMonitoring()

      // Subscribe to events
      this.subscribeToEvents()

      logger.info('Integration Control Layer initialized')
    } catch (error: any) {
      logger.error('Integration Control Layer initialization failed:', error)
      throw error
    }
  }

  /**
   * Start monitoring integrations
   */
  private startMonitoring(): void {
    // Monitor integrations every 30 seconds
    setInterval(async () => {
      try {
        await this.checkIntegrationStatuses()
      } catch (error) {
        logger.error('Integration monitoring failed:', error)
      }
    }, 30000) // Every 30 seconds

    logger.info('Integration monitoring started')
  }

  /**
   * Subscribe to events
   */
  private subscribeToEvents(): void {
    // Subscribe to integration status changes
    eventBus.subscribe('admin.integration.tested', (data: any) => {
      const integration = data.integration
      const test = data.test

      if (test.status === 'success') {
        this.updateIntegrationStatus(integration.id, 'connected')
      } else {
        this.updateIntegrationStatus(integration.id, 'error', test.error)
      }
    })

    // Subscribe to config updates
    eventBus.subscribe('admin.config.update', (data: any) => {
      this.applyConfigUpdate(data.update)
    })
  }

  /**
   * Update configuration
   */
  async updateConfig(module: string, config: Record<string, unknown>): Promise<string> {
    try {
      const updateId = `config-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      logger.info('Updating configuration', {
        updateId,
        module,
      })

      const update: ConfigUpdate = {
        id: updateId,
        module,
        config,
        timestamp: new Date(),
        applied: false,
      }

      this.configUpdates.set(updateId, update)

      // Apply config update
      await this.applyConfigUpdate(update)

      logger.info('Configuration updated', {
        updateId,
        module,
        applied: update.applied,
      })

      eventBus.publish('admin.config.updated', {
        update,
      })

      return updateId
    } catch (error: any) {
      logger.error('Update configuration failed:', error)
      throw error
    }
  }

  /**
   * Apply config update
   */
  private async applyConfigUpdate(update: ConfigUpdate): Promise<void> {
    try {
      // In production, apply config to specific module
      // For now, broadcast to all modules via event bus
      eventBus.publish(`config.${update.module}.update`, {
        config: update.config,
      })

      update.applied = true
      this.configUpdates.set(update.id, update)

      logger.debug('Config update applied', {
        updateId: update.id,
        module: update.module,
      })
    } catch (error: any) {
      update.applied = false
      update.error = error.message
      this.configUpdates.set(update.id, update)

      logger.error('Apply config update failed:', {
        updateId: update.id,
        error: error.message,
      })
    }
  }

  /**
   * Check integration statuses
   */
  private async checkIntegrationStatuses(): Promise<void> {
    try {
      const integrations = keysAndIntegrationsManager.getAllIntegrations()

      for (const integration of integrations) {
        const status = this.integrationStatuses.get(integration.id)

        // Check if integration needs reconnection
        if (status && status.status === 'disconnected') {
          // Attempt reconnection
          await this.reconnectIntegration(integration.id)
        } else if (status && status.status === 'error') {
          // Check if error is resolved
          await this.checkIntegrationHealth(integration.id)
        }
      }
    } catch (error: any) {
      logger.error('Check integration statuses failed:', error)
    }
  }

  /**
   * Update integration status
   */
  updateIntegrationStatus(
    integrationId: string,
    status: 'connected' | 'disconnected' | 'error',
    error?: string
  ): void {
    try {
      const currentStatus = this.integrationStatuses.get(integrationId) || {
        integrationId,
        status: 'disconnected',
        lastCheck: new Date(),
        reconnectAttempts: 0,
      }

      currentStatus.status = status
      currentStatus.lastCheck = new Date()
      currentStatus.lastError = error

      if (status === 'disconnected' || status === 'error') {
        currentStatus.reconnectAttempts++
      } else {
        currentStatus.reconnectAttempts = 0
        // Clear reconnect interval if exists
        const interval = this.reconnectIntervals.get(integrationId)
        if (interval) {
          clearInterval(interval)
          this.reconnectIntervals.delete(integrationId)
        }
      }

      this.integrationStatuses.set(integrationId, currentStatus)

      logger.debug('Integration status updated', {
        integrationId,
        status,
        reconnectAttempts: currentStatus.reconnectAttempts,
      })

      eventBus.publish('admin.integration.status', {
        integrationId,
        status,
        error,
      })
    } catch (error: any) {
      logger.error('Update integration status failed:', error)
    }
  }

  /**
   * Reconnect integration
   */
  private async reconnectIntegration(integrationId: string): Promise<void> {
    try {
      const status = this.integrationStatuses.get(integrationId)
      if (!status || status.status === 'connected') {
        return
      }

      // Check if already attempting reconnection
      if (this.reconnectIntervals.has(integrationId)) {
        return
      }

      logger.info('Reconnecting integration', {
        integrationId,
        attempts: status.reconnectAttempts,
      })

      // Test connection
      const test = await keysAndIntegrationsManager.testConnection(integrationId)

      if (test.status === 'success') {
        this.updateIntegrationStatus(integrationId, 'connected')
      } else {
        // Schedule retry
        const retryDelay = Math.min(300000, 5000 * Math.pow(2, status.reconnectAttempts)) // Exponential backoff, max 5 minutes

        const interval = setTimeout(async () => {
          this.reconnectIntervals.delete(integrationId)
          await this.reconnectIntegration(integrationId)
        }, retryDelay)

        this.reconnectIntervals.set(integrationId, interval)

        logger.debug('Reconnection scheduled', {
          integrationId,
          retryDelay,
        })
      }
    } catch (error: any) {
      logger.error('Reconnect integration failed:', error)
    }
  }

  /**
   * Check integration health
   */
  private async checkIntegrationHealth(integrationId: string): Promise<void> {
    try {
      // Test connection
      const test = await keysAndIntegrationsManager.testConnection(integrationId)

      if (test.status === 'success') {
        this.updateIntegrationStatus(integrationId, 'connected')
      } else {
        this.updateIntegrationStatus(integrationId, 'error', test.error)
      }
    } catch (error: any) {
      logger.error('Check integration health failed:', error)
    }
  }

  /**
   * Get integration status
   */
  getIntegrationStatus(integrationId: string): IntegrationStatus | null {
    return this.integrationStatuses.get(integrationId) || null
  }

  /**
   * Get all integration statuses
   */
  getAllIntegrationStatuses(): IntegrationStatus[] {
    return Array.from(this.integrationStatuses.values())
  }

  /**
   * Get config update
   */
  getConfigUpdate(updateId: string): ConfigUpdate | null {
    return this.configUpdates.get(updateId) || null
  }

  /**
   * Get all config updates
   */
  getAllConfigUpdates(limit = 100): ConfigUpdate[] {
    return Array.from(this.configUpdates.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Sync config to module
   */
  async syncConfigToModule(module: string, config: Record<string, unknown>): Promise<void> {
    try {
      // Broadcast config update via WebSocket (in production)
      // For now, use event bus
      eventBus.publish(`config.${module}.sync`, {
        config,
        timestamp: new Date(),
      })

      logger.info('Config synced to module', {
        module,
      })
    } catch (error: any) {
      logger.error('Sync config to module failed:', error)
      throw error
    }
  }
}

// Global Integration Control Layer
export const integrationControlLayer = new IntegrationControlLayer()

