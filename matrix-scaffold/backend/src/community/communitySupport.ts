/**
 * Phase 10.3 - Community Support System
 * 
 * Community forum, support groups, knowledge base
 * - Community forum
 * - Support groups
 * - Knowledge base
 * - Direct communication
 * - Feedback system
 * - User contributions
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type PostType = 'question' | 'answer' | 'discussion' | 'announcement' | 'tutorial'
export type PostStatus = 'open' | 'answered' | 'closed' | 'archived'
export type SupportChannel = 'forum' | 'chat' | 'email' | 'ticket' | 'video'

export interface ForumPost {
  id: string
  type: PostType
  title: string
  content: string
  authorId: string
  category: string
  tags: string[]
  status: PostStatus
  views: number
  upvotes: number
  downvotes: number
  answers: string[] // Post IDs
  acceptedAnswer?: string
  createdAt: Date
  updatedAt: Date
}

export interface SupportTicket {
  id: string
  userId: string
  title: string
  description: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assignedTo?: string
  messages: SupportMessage[]
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
}

export interface SupportMessage {
  id: string
  ticketId: string
  authorId: string
  content: string
  attachments: string[]
  isInternal: boolean
  createdAt: Date
}

export interface KnowledgeBaseArticle {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  authorId: string
  views: number
  helpful: number
  notHelpful: number
  status: 'draft' | 'published' | 'archived'
  createdAt: Date
  updatedAt: Date
}

export interface Feedback {
  id: string
  userId: string
  type: 'bug' | 'feature' | 'improvement' | 'general'
  title: string
  description: string
  category: string
  priority: 'low' | 'medium' | 'high'
  status: 'new' | 'reviewing' | 'planned' | 'in_progress' | 'completed' | 'rejected'
  votes: number
  createdAt: Date
  updatedAt: Date
}

class CommunitySupportSystem {
  private posts: Map<string, ForumPost> = new Map()
  private tickets: Map<string, SupportTicket> = new Map()
  private articles: Map<string, KnowledgeBaseArticle> = new Map()
  private feedbacks: Map<string, Feedback> = new Map()

  async initialize() {
    logInfo('Initializing Community Support System...')

    logInfo('✅ Community Support System initialized')
  }

  // Create forum post
  async createForumPost(
    type: PostType,
    title: string,
    content: string,
    authorId: string,
    category: string,
    tags: string[] = []
  ): Promise<ForumPost> {
    try {
      const postId = nanoid()
      const now = new Date()

      const post: ForumPost = {
        id: postId,
        type,
        title,
        content,
        authorId,
        category,
        tags,
        status: 'open',
        views: 0,
        upvotes: 0,
        downvotes: 0,
        answers: [],
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.forumPost.create({
          data: {
            id: postId,
            type,
            title,
            content,
            authorId,
            category,
            tags,
            status: 'open',
            views: 0,
            upvotes: 0,
            downvotes: 0,
            answers: [],
            acceptedAnswer: null,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create forum post in database' })
      }

      this.posts.set(postId, post)

      logInfo(`✅ Created forum post ${postId}: ${title}`)

      return post
    } catch (error) {
      logError(error as Error, { context: 'Create forum post' })
      throw error
    }
  }

  // Create support ticket
  async createSupportTicket(
    userId: string,
    title: string,
    description: string,
    category: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<SupportTicket> {
    try {
      const ticketId = nanoid()
      const now = new Date()

      const ticket: SupportTicket = {
        id: ticketId,
        userId,
        title,
        description,
        category,
        priority,
        status: 'open',
        messages: [],
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.supportTicket.create({
          data: {
            id: ticketId,
            userId,
            title,
            description,
            category,
            priority,
            status: 'open',
            assignedTo: null,
            resolvedAt: null,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create support ticket in database' })
      }

      this.tickets.set(ticketId, ticket)

      logInfo(`✅ Created support ticket ${ticketId}: ${title}`)

      return ticket
    } catch (error) {
      logError(error as Error, { context: 'Create support ticket' })
      throw error
    }
  }

  // Add message to ticket
  async addTicketMessage(
    ticketId: string,
    authorId: string,
    content: string,
    attachments: string[] = [],
    isInternal: boolean = false
  ): Promise<SupportMessage> {
    try {
      const ticket = this.tickets.get(ticketId)
      if (!ticket) throw new Error('Ticket not found')

      const messageId = nanoid()
      const now = new Date()

      const message: SupportMessage = {
        id: messageId,
        ticketId,
        authorId,
        content,
        attachments,
        isInternal,
        createdAt: now
      }

      ticket.messages.push(message)
      ticket.updatedAt = now

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.supportMessage.create({
          data: {
            id: messageId,
            ticketId,
            authorId,
            content,
            attachments,
            isInternal,
            createdAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Add ticket message in database' })
      }

      this.tickets.set(ticketId, ticket)

      logInfo(`✅ Added message ${messageId} to ticket ${ticketId}`)

      return message
    } catch (error) {
      logError(error as Error, { context: 'Add ticket message' })
      throw error
    }
  }

  // Create knowledge base article
  async createKnowledgeBaseArticle(
    title: string,
    content: string,
    category: string,
    tags: string[],
    authorId: string
  ): Promise<KnowledgeBaseArticle> {
    try {
      const articleId = nanoid()
      const now = new Date()

      const article: KnowledgeBaseArticle = {
        id: articleId,
        title,
        content,
        category,
        tags,
        authorId,
        views: 0,
        helpful: 0,
        notHelpful: 0,
        status: 'draft',
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.knowledgeBaseArticle.create({
          data: {
            id: articleId,
            title,
            content,
            category,
            tags,
            authorId,
            views: 0,
            helpful: 0,
            notHelpful: 0,
            status: 'draft',
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create knowledge base article in database' })
      }

      this.articles.set(articleId, article)

      logInfo(`✅ Created knowledge base article ${articleId}: ${title}`)

      return article
    } catch (error) {
      logError(error as Error, { context: 'Create knowledge base article' })
      throw error
    }
  }

  // Submit feedback
  async submitFeedback(
    userId: string,
    type: 'bug' | 'feature' | 'improvement' | 'general',
    title: string,
    description: string,
    category: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<Feedback> {
    try {
      const feedbackId = nanoid()
      const now = new Date()

      const feedback: Feedback = {
        id: feedbackId,
        userId,
        type,
        title,
        description,
        category,
        priority,
        status: 'new',
        votes: 0,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.feedback.create({
          data: {
            id: feedbackId,
            userId,
            type,
            title,
            description,
            category,
            priority,
            status: 'new',
            votes: 0,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Submit feedback in database' })
      }

      this.feedbacks.set(feedbackId, feedback)

      logInfo(`✅ Submitted feedback ${feedbackId}: ${title}`)

      return feedback
    } catch (error) {
      logError(error as Error, { context: 'Submit feedback' })
      throw error
    }
  }

  // Get forum posts
  async getForumPosts(
    type?: PostType,
    category?: string,
    status?: PostStatus
  ): Promise<ForumPost[]> {
    const posts: ForumPost[] = []
    for (const post of this.posts.values()) {
      if (type && post.type !== type) continue
      if (category && post.category !== category) continue
      if (status && post.status !== status) continue
      posts.push(post)
    }
    return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Get support tickets
  async getSupportTickets(
    userId?: string,
    status?: string
  ): Promise<SupportTicket[]> {
    const tickets: SupportTicket[] = []
    for (const ticket of this.tickets.values()) {
      if (userId && ticket.userId !== userId) continue
      if (status && ticket.status !== status) continue
      tickets.push(ticket)
    }
    return tickets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Get feedbacks
  async getFeedbacks(
    type?: string,
    status?: string
  ): Promise<Feedback[]> {
    const feedbacks: Feedback[] = []
    for (const feedback of this.feedbacks.values()) {
      if (type && feedback.type !== type) continue
      if (status && feedback.status !== status) continue
      feedbacks.push(feedback)
    }
    return feedbacks.sort((a, b) => b.votes - a.votes)
  }
}

export const communitySupportSystem = new CommunitySupportSystem()

