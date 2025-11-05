/**
 * Phase 8.1 - Support & Ticketing System
 * 
 * Client support tickets management
 * - Create, update, and track tickets
 * - Integration with admin dashboard
 * - Priority and status management
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketType = 'issue' | 'question' | 'feature_request' | 'billing' | 'technical'

export interface Ticket {
  id: string
  userId: string
  type: TicketType
  priority: TicketPriority
  status: TicketStatus
  subject: string
  description: string
  messages: TicketMessage[]
  assignedTo?: string
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  closedAt?: Date
}

export interface TicketMessage {
  id: string
  ticketId: string
  userId: string
  isAdmin: boolean
  content: string
  attachments?: string[]
  createdAt: Date
}

class TicketingManager {
  private tickets: Map<string, Ticket> = new Map()

  async initialize() {
    logInfo('Initializing Support & Ticketing System...')

    // Load tickets from database
    try {
      const { prisma } = await import('../config/database')
      const tickets = await prisma.ticket.findMany()
      for (const ticket of tickets) {
        this.tickets.set(ticket.id, {
          id: ticket.id,
          userId: ticket.userId,
          type: ticket.type as TicketType,
          priority: ticket.priority as TicketPriority,
          status: ticket.status as TicketStatus,
          subject: ticket.subject,
          description: ticket.description,
          messages: ticket.messages as TicketMessage[],
          assignedTo: ticket.assignedTo || undefined,
          metadata: ticket.metadata as Record<string, any>,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          resolvedAt: ticket.resolvedAt || undefined,
          closedAt: ticket.closedAt || undefined
        })
      }
      logInfo(`✅ Loaded ${tickets.length} tickets from database`)
    } catch (error) {
      logError(error as Error, { context: 'Ticketing initialization' })
    }

    logInfo('✅ Support & Ticketing System initialized')
  }

  // Create ticket
  async createTicket(
    userId: string,
    type: TicketType,
    priority: TicketPriority,
    subject: string,
    description: string
  ): Promise<Ticket> {
    try {
      const ticketId = nanoid()
      const now = new Date()

      const ticket: Ticket = {
        id: ticketId,
        userId,
        type,
        priority,
        status: 'open',
        subject,
        description,
        messages: [],
        metadata: {},
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.ticket.create({
          data: {
            id: ticketId,
            userId,
            type,
            priority,
            status: 'open',
            subject,
            description,
            messages: [],
            metadata: {}
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create ticket in database' })
      }

      this.tickets.set(ticketId, ticket)
      logInfo(`✅ Created ticket ${ticketId} for user ${userId}`)

      return ticket
    } catch (error) {
      logError(error as Error, { context: 'Create ticket' })
      throw error
    }
  }

  // Get ticket
  async getTicket(ticketId: string): Promise<Ticket | null> {
    return this.tickets.get(ticketId) || null
  }

  // Get tickets by user
  async getTicketsByUserId(userId: string): Promise<Ticket[]> {
    const userTickets: Ticket[] = []
    for (const ticket of this.tickets.values()) {
      if (ticket.userId === userId) {
        userTickets.push(ticket)
      }
    }
    return userTickets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Update ticket
  async updateTicket(
    ticketId: string,
    updates: Partial<Ticket>
  ): Promise<Ticket | null> {
    const ticket = this.tickets.get(ticketId)
    if (!ticket) return null

    const updated = {
      ...ticket,
      ...updates,
      updatedAt: new Date()
    }

    // Update resolved/closed dates
    if (updates.status === 'resolved' && !updated.resolvedAt) {
      updated.resolvedAt = new Date()
    }
    if (updates.status === 'closed' && !updated.closedAt) {
      updated.closedAt = new Date()
    }

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          type: updated.type,
          priority: updated.priority,
          status: updated.status,
          subject: updated.subject,
          description: updated.description,
          messages: updated.messages,
          assignedTo: updated.assignedTo || null,
          metadata: updated.metadata,
          resolvedAt: updated.resolvedAt || null,
          closedAt: updated.closedAt || null
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Update ticket in database' })
    }

    this.tickets.set(ticketId, updated)
    return updated
  }

  // Add message to ticket
  async addMessage(
    ticketId: string,
    userId: string,
    content: string,
    isAdmin: boolean = false,
    attachments?: string[]
  ): Promise<TicketMessage | null> {
    const ticket = this.tickets.get(ticketId)
    if (!ticket) return null

    const messageId = nanoid()
    const message: TicketMessage = {
      id: messageId,
      ticketId,
      userId,
      isAdmin,
      content,
      attachments,
      createdAt: new Date()
    }

    ticket.messages.push(message)
    ticket.updatedAt = new Date()

    // Update ticket status if client replies
    if (!isAdmin && ticket.status === 'resolved') {
      ticket.status = 'open'
    }

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          messages: ticket.messages,
          status: ticket.status,
          updatedAt: ticket.updatedAt
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Add message to ticket in database' })
    }

    this.tickets.set(ticketId, ticket)
    return message
  }

  // Assign ticket
  async assignTicket(ticketId: string, adminId: string): Promise<boolean> {
    const ticket = this.tickets.get(ticketId)
    if (!ticket) return false

    ticket.assignedTo = adminId
    ticket.status = 'in_progress'
    ticket.updatedAt = new Date()

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          assignedTo: adminId,
          status: 'in_progress',
          updatedAt: ticket.updatedAt
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Assign ticket in database' })
    }

    this.tickets.set(ticketId, ticket)
    return true
  }

  // Get all tickets (admin)
  async getAllTickets(status?: TicketStatus): Promise<Ticket[]> {
    const allTickets = Array.from(this.tickets.values())
    if (status) {
      return allTickets.filter(t => t.status === status)
    }
    return allTickets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
}

export const ticketingManager = new TicketingManager()

