/**
 * Phase 8.6 - Real-time Features
 * 
 * WebSocket support for real-time updates
 * - Live dashboard updates
 * - Real-time notifications
 * - Streaming data
 * - AI-to-AI real-time communication
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'
import { Server as WebSocketServer } from 'ws'

export type WebSocketMessageType = 
  | 'dashboard_update'
  | 'notification'
  | 'usage_update'
  | 'invoice_update'
  | 'instance_update'
  | 'ai_communication'
  | 'contract_update'
  | 'reputation_update'

export interface WebSocketMessage {
  id: string
  type: WebSocketMessageType
  data: Record<string, any>
  timestamp: Date
}

export interface WebSocketClient {
  id: string
  userId?: string
  aiId?: string
  appId?: string
  subscriptions: string[] // Event types subscribed to
  connectedAt: Date
  lastActivity: Date
  ws: any
}

class WebSocketManager {
  private server: WebSocketServer | null = null
  private clients: Map<string, WebSocketClient> = new Map()

  async initialize(server: any) {
    logInfo('Initializing WebSocket Manager...')

    // Initialize WebSocket server
    this.server = new WebSocketServer({ server })

    this.server.on('connection', (ws, req) => {
      this.handleConnection(ws, req)
    })

    logInfo('✅ WebSocket Manager initialized')
  }

  // Handle new connection
  private handleConnection(ws: any, req: any): void {
    try {
      const clientId = nanoid()
      const now = new Date()

      const client: WebSocketClient = {
        id: clientId,
        subscriptions: [],
        connectedAt: now,
        lastActivity: now,
        ws
      }

      this.clients.set(clientId, client)

      // Send welcome message
      this.sendMessage(clientId, {
        id: nanoid(),
        type: 'dashboard_update',
        data: { message: 'Connected to Matrix Platform', clientId },
        timestamp: now
      })

      // Handle messages
      ws.on('message', (data: Buffer) => {
        this.handleMessage(clientId, data)
      })

      // Handle disconnect
      ws.on('close', () => {
        this.handleDisconnect(clientId)
      })

      // Handle errors
      ws.on('error', (error: Error) => {
        logError(error, { context: `WebSocket client ${clientId}` })
      })

      logInfo(`✅ WebSocket client ${clientId} connected`)
    } catch (error) {
      logError(error as Error, { context: 'Handle WebSocket connection' })
    }
  }

  // Handle message
  private handleMessage(clientId: string, data: Buffer): void {
    try {
      const client = this.clients.get(clientId)
      if (!client) return

      client.lastActivity = new Date()

      const message = JSON.parse(data.toString())

      // Handle subscription
      if (message.type === 'subscribe') {
        if (Array.isArray(message.events)) {
          client.subscriptions = [...new Set([...client.subscriptions, ...message.events])]
        }
      }

      // Handle unsubscribe
      if (message.type === 'unsubscribe') {
        if (Array.isArray(message.events)) {
          client.subscriptions = client.subscriptions.filter(
            e => !message.events.includes(e)
          )
        }
      }

      // Handle authentication
      if (message.type === 'auth') {
        client.userId = message.userId
        client.aiId = message.aiId
        client.appId = message.appId
      }

      this.clients.set(clientId, client)
    } catch (error) {
      logError(error as Error, { context: 'Handle WebSocket message' })
    }
  }

  // Handle disconnect
  private handleDisconnect(clientId: string): void {
    try {
      this.clients.delete(clientId)
      logInfo(`✅ WebSocket client ${clientId} disconnected`)
    } catch (error) {
      logError(error as Error, { context: 'Handle WebSocket disconnect' })
    }
  }

  // Broadcast message
  async broadcast(message: WebSocketMessage): Promise<void> {
    try {
      for (const client of this.clients.values()) {
        if (client.subscriptions.includes(message.type) || client.subscriptions.length === 0) {
          this.sendMessage(client.id, message)
        }
      }
    } catch (error) {
      logError(error as Error, { context: 'Broadcast WebSocket message' })
    }
  }

  // Send message to client
  sendMessage(clientId: string, message: WebSocketMessage): void {
    try {
      const client = this.clients.get(clientId)
      if (!client || !client.ws) return

      if (client.ws.readyState === 1) { // OPEN
        client.ws.send(JSON.stringify(message))
        client.lastActivity = new Date()
        this.clients.set(clientId, client)
      }
    } catch (error) {
      logError(error as Error, { context: 'Send WebSocket message' })
    }
  }

  // Send to user
  async sendToUser(userId: string, message: WebSocketMessage): Promise<void> {
    try {
      for (const client of this.clients.values()) {
        if (client.userId === userId) {
          this.sendMessage(client.id, message)
        }
      }
    } catch (error) {
      logError(error as Error, { context: 'Send to user' })
    }
  }

  // Send to AI
  async sendToAI(aiId: string, message: WebSocketMessage): Promise<void> {
    try {
      for (const client of this.clients.values()) {
        if (client.aiId === aiId) {
          this.sendMessage(client.id, message)
        }
      }
    } catch (error) {
      logError(error as Error, { context: 'Send to AI' })
    }
  }

  // Cleanup inactive clients
  cleanupInactiveClients(): void {
    const now = Date.now()
    const timeout = 5 * 60 * 1000 // 5 minutes

    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastActivity.getTime() > timeout) {
        try {
          client.ws.close()
        } catch (error) {
          // Ignore
        }
        this.clients.delete(clientId)
      }
    }
  }

  // Start cleanup interval
  startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupInactiveClients()
    }, 60000) // Every minute
  }
}

export const webSocketManager = new WebSocketManager()

