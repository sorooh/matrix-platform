/**
 * WebSocket Real-Time Integration
 * Phase 7.3.1: Professional Enhancements
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'

export interface WebSocketClient {
  id: string
  userId?: string
  role?: string
  rooms: Set<string>
  connectedAt: Date
  lastActivity: Date
}

export interface WebSocketMessage {
  type: string
  data: unknown
  timestamp: Date
}

export class WebSocketServer {
  private io: SocketIOServer | null = null
  private clients: Map<string, WebSocketClient> = new Map()
  private rooms: Map<string, Set<string>> = new Map()

  /**
   * Initialize WebSocket Server
   */
  async initialize(httpServer: HTTPServer): Promise<void> {
    try {
      // Initialize Socket.io
      this.io = new SocketIOServer(httpServer, {
        cors: {
          origin: '*', // In production, configure allowed origins
          methods: ['GET', 'POST'],
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
      })

      // Handle connections
      this.io.on('connection', (socket) => {
        this.handleConnection(socket)
      })

      // Subscribe to events
      this.subscribeToEvents()

      logger.info('WebSocket Server initialized')
    } catch (error: any) {
      logger.error('WebSocket Server initialization failed:', error)
      throw error
    }
  }

  /**
   * Handle new connection
   */
  private handleConnection(socket: any): void {
    try {
      const clientId = socket.id

      logger.info('WebSocket client connected', {
        clientId,
      })

      // Create client record
      const client: WebSocketClient = {
        id: clientId,
        rooms: new Set(),
        connectedAt: new Date(),
        lastActivity: new Date(),
      }

      this.clients.set(clientId, client)

      // Handle authentication
      socket.on('authenticate', (data: { userId?: string; role?: string; token?: string }) => {
        try {
          // In production, verify JWT token
          if (data.token) {
            // Verify token and extract user info
            client.userId = data.userId
            client.role = data.role
            this.clients.set(clientId, client)

            logger.info('WebSocket client authenticated', {
              clientId,
              userId: client.userId,
              role: client.role,
            })

            socket.emit('authenticated', {
              success: true,
              userId: client.userId,
              role: client.role,
            })
          }
        } catch (error: any) {
          logger.error('WebSocket authentication failed:', error)
          socket.emit('authenticated', {
            success: false,
            error: error.message,
          })
        }
      })

      // Handle room subscription
      socket.on('subscribe', (room: string) => {
        try {
          this.subscribeToRoom(clientId, room)
          socket.emit('subscribed', {
            room,
            success: true,
          })

          logger.debug('WebSocket client subscribed to room', {
            clientId,
            room,
          })
        } catch (error: any) {
          logger.error('WebSocket subscription failed:', error)
          socket.emit('subscribed', {
            room,
            success: false,
            error: error.message,
          })
        }
      })

      // Handle room unsubscription
      socket.on('unsubscribe', (room: string) => {
        try {
          this.unsubscribeFromRoom(clientId, room)
          socket.emit('unsubscribed', {
            room,
            success: true,
          })

          logger.debug('WebSocket client unsubscribed from room', {
            clientId,
            room,
          })
        } catch (error: any) {
          logger.error('WebSocket unsubscription failed:', error)
          socket.emit('unsubscribed', {
            room,
            success: false,
            error: error.message,
          })
        }
      })

      // Handle ping
      socket.on('ping', () => {
        try {
          client.lastActivity = new Date()
          this.clients.set(clientId, client)
          socket.emit('pong', {
            timestamp: new Date(),
          })
        } catch (error: any) {
          logger.error('WebSocket ping failed:', error)
        }
      })

      // Handle disconnection
      socket.on('disconnect', () => {
        try {
          this.handleDisconnection(clientId)
          logger.info('WebSocket client disconnected', {
            clientId,
          })
        } catch (error: any) {
          logger.error('WebSocket disconnection handling failed:', error)
        }
      })
    } catch (error: any) {
      logger.error('WebSocket connection handling failed:', error)
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(clientId: string): void {
    try {
      const client = this.clients.get(clientId)
      if (!client) {
        return
      }

      // Unsubscribe from all rooms
      for (const room of client.rooms) {
        this.unsubscribeFromRoom(clientId, room)
      }

      // Remove client
      this.clients.delete(clientId)

      logger.debug('WebSocket client disconnected', {
        clientId,
      })
    } catch (error: any) {
      logger.error('Handle disconnection failed:', error)
    }
  }

  /**
   * Subscribe to room
   */
  private subscribeToRoom(clientId: string, room: string): void {
    try {
      const client = this.clients.get(clientId)
      if (!client) {
        throw new Error(`Client ${clientId} not found`)
      }

      // Add client to room
      client.rooms.add(room)

      // Add room to rooms map
      if (!this.rooms.has(room)) {
        this.rooms.set(room, new Set())
      }
      this.rooms.get(room)!.add(clientId)

      // Join Socket.io room
      if (this.io) {
        const socket = this.io.sockets.sockets.get(clientId)
        if (socket) {
          socket.join(room)
        }
      }

      this.clients.set(clientId, client)

      logger.debug('Client subscribed to room', {
        clientId,
        room,
      })
    } catch (error: any) {
      logger.error('Subscribe to room failed:', error)
      throw error
    }
  }

  /**
   * Unsubscribe from room
   */
  private unsubscribeFromRoom(clientId: string, room: string): void {
    try {
      const client = this.clients.get(clientId)
      if (!client) {
        return
      }

      // Remove client from room
      client.rooms.delete(room)

      // Remove room from rooms map
      const roomClients = this.rooms.get(room)
      if (roomClients) {
        roomClients.delete(clientId)
        if (roomClients.size === 0) {
          this.rooms.delete(room)
        }
      }

      // Leave Socket.io room
      if (this.io) {
        const socket = this.io.sockets.sockets.get(clientId)
        if (socket) {
          socket.leave(room)
        }
      }

      this.clients.set(clientId, client)

      logger.debug('Client unsubscribed from room', {
        clientId,
        room,
      })
    } catch (error: any) {
      logger.error('Unsubscribe from room failed:', error)
    }
  }

  /**
   * Subscribe to events
   */
  private subscribeToEvents(): void {
    // Dashboard events
    eventBus.subscribe('admin.dashboard.notification', (data: any) => {
      this.broadcastToRoom('dashboard', 'notification', data)
    })

    // Integration events
    eventBus.subscribe('admin.integration.created', (data: any) => {
      this.broadcastToRoom('integrations', 'integration.created', data)
    })

    eventBus.subscribe('admin.integration.updated', (data: any) => {
      this.broadcastToRoom('integrations', 'integration.updated', data)
    })

    eventBus.subscribe('admin.integration.deleted', (data: any) => {
      this.broadcastToRoom('integrations', 'integration.deleted', data)
    })

    eventBus.subscribe('admin.integration.tested', (data: any) => {
      this.broadcastToRoom('integrations', 'integration.tested', data)
    })

    eventBus.subscribe('admin.integration.status', (data: any) => {
      this.broadcastToRoom('integrations', 'integration.status', data)
    })

    // Config events
    eventBus.subscribe('admin.config.updated', (data: any) => {
      this.broadcastToRoom('config', 'config.updated', data)
    })

    // Performance events
    eventBus.subscribe('admin.analytics.report.generated', (data: any) => {
      this.broadcastToRoom('analytics', 'report.generated', data)
    })

    // User events
    eventBus.subscribe('admin.user.created', (data: any) => {
      this.broadcastToRoom('users', 'user.created', data)
    })

    eventBus.subscribe('admin.user.updated', (data: any) => {
      this.broadcastToRoom('users', 'user.updated', data)
    })

    eventBus.subscribe('admin.user.deleted', (data: any) => {
      this.broadcastToRoom('users', 'user.deleted', data)
    })

    logger.debug('WebSocket event subscriptions initialized')
  }

  /**
   * Broadcast to room
   */
  broadcastToRoom(room: string, event: string, data: unknown): void {
    try {
      if (!this.io) {
        return
      }

      const message: WebSocketMessage = {
        type: event,
        data,
        timestamp: new Date(),
      }

      this.io.to(room).emit(event, message)

      logger.debug('Broadcast to room', {
        room,
        event,
        clients: this.rooms.get(room)?.size || 0,
      })
    } catch (error: any) {
      logger.error('Broadcast to room failed:', error)
    }
  }

  /**
   * Broadcast to all clients
   */
  broadcastToAll(event: string, data: unknown): void {
    try {
      if (!this.io) {
        return
      }

      const message: WebSocketMessage = {
        type: event,
        data,
        timestamp: new Date(),
      }

      this.io.emit(event, message)

      logger.debug('Broadcast to all clients', {
        event,
        clients: this.clients.size,
      })
    } catch (error: any) {
      logger.error('Broadcast to all failed:', error)
    }
  }

  /**
   * Send to client
   */
  sendToClient(clientId: string, event: string, data: unknown): void {
    try {
      if (!this.io) {
        return
      }

      const message: WebSocketMessage = {
        type: event,
        data,
        timestamp: new Date(),
      }

      this.io.to(clientId).emit(event, message)

      logger.debug('Send to client', {
        clientId,
        event,
      })
    } catch (error: any) {
      logger.error('Send to client failed:', error)
    }
  }

  /**
   * Get connected clients
   */
  getConnectedClients(): WebSocketClient[] {
    return Array.from(this.clients.values())
  }

  /**
   * Get clients in room
   */
  getClientsInRoom(room: string): WebSocketClient[] {
    const roomClients = this.rooms.get(room)
    if (!roomClients) {
      return []
    }

    return Array.from(roomClients)
      .map((clientId) => this.clients.get(clientId))
      .filter((client): client is WebSocketClient => client !== undefined)
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalClients: number
    totalRooms: number
    clientsByRoom: Record<string, number>
    clientsByRole: Record<string, number>
  } {
    const clients = Array.from(this.clients.values())
    const rooms = Array.from(this.rooms.keys())
    const clientsByRoom: Record<string, number> = {}
    const clientsByRole: Record<string, number> = {}

    for (const room of rooms) {
      clientsByRoom[room] = this.rooms.get(room)?.size || 0
    }

    for (const client of clients) {
      const role = client.role || 'anonymous'
      clientsByRole[role] = (clientsByRole[role] || 0) + 1
    }

    return {
      totalClients: clients.length,
      totalRooms: rooms.length,
      clientsByRoom,
      clientsByRole,
    }
  }
}

// Global WebSocket Server
export const webSocketServer = new WebSocketServer()

