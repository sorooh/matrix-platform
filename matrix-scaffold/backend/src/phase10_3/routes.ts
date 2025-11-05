/**
 * Phase 10.3 - Routes
 * 
 * All API routes for Phase 10.3 features
 */

import { FastifyInstance } from 'fastify'
import { logger, logError } from '../../config/logger'
import { uiDesignSystem } from '../ui/uiDesignSystem'
import { documentationCenter } from '../documentation/documentationCenter'
import { communitySupportSystem } from '../community/communitySupport'
import { flexibleAPIsSystem } from '../api/flexibleAPIs'
import { customizationFeatures } from '../customization/customizationFeatures'
import { trainingWorkshopsSystem } from '../training/trainingWorkshops'
import { continuousImprovementSystem } from '../improvement/continuousImprovement'

export async function registerPhase10_3Routes(server: FastifyInstance) {
  // UI Design System
  server.post('/api/ui/themes', async (request, reply) => {
    try {
      const { name, colors, fonts, spacing, borderRadius, shadows, animations } = request.body as any
      const theme = await uiDesignSystem.createCustomTheme(name, colors, fonts, spacing, borderRadius, shadows, animations)
      return reply.send({ success: true, theme })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/ui/themes' })
      return reply.status(500).send({ error: 'Failed to create theme' })
    }
  })

  // Documentation Center
  server.post('/api/documentation', async (request, reply) => {
    try {
      const { type, title, content, language, category, tags, author, version } = request.body as any
      const doc = await documentationCenter.createDocumentation(type, title, content, language, category, tags, author, version)
      return reply.send({ success: true, doc })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/documentation' })
      return reply.status(500).send({ error: 'Failed to create documentation' })
    }
  })

  // Community Support
  server.post('/api/community/posts', async (request, reply) => {
    try {
      const { type, title, content, authorId, category, tags } = request.body as any
      const post = await communitySupportSystem.createForumPost(type, title, content, authorId, category, tags)
      return reply.send({ success: true, post })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/community/posts' })
      return reply.status(500).send({ error: 'Failed to create forum post' })
    }
  })

  // Flexible APIs
  server.post('/api/webhooks', async (request, reply) => {
    try {
      const { userId, url, events, secret } = request.body as any
      const webhook = await flexibleAPIsSystem.createWebhook(userId, url, events, secret)
      return reply.send({ success: true, webhook })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/webhooks' })
      return reply.status(500).send({ error: 'Failed to create webhook' })
    }
  })

  // Customization Features
  server.post('/api/dashboards', async (request, reply) => {
    try {
      const { userId, name, description, templateId } = request.body as any
      const dashboard = await customizationFeatures.createDashboard(userId, name, description, templateId)
      return reply.send({ success: true, dashboard })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/dashboards' })
      return reply.status(500).send({ error: 'Failed to create dashboard' })
    }
  })

  // Training & Workshops
  server.post('/api/training/courses', async (request, reply) => {
    try {
      const { title, description, level, modules, instructor, price, currency, prerequisites } = request.body as any
      const course = await trainingWorkshopsSystem.createCourse(title, description, level, modules, instructor, price, currency, prerequisites)
      return reply.send({ success: true, course })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/training/courses' })
      return reply.status(500).send({ error: 'Failed to create course' })
    }
  })

  // Continuous Improvement
  server.post('/api/feedback', async (request, reply) => {
    try {
      const { userId, type, title, description, category, priority, attachments } = request.body as any
      const feedback = await continuousImprovementSystem.submitFeedback(userId, type, title, description, category, priority, attachments)
      return reply.send({ success: true, feedback })
    } catch (error) {
      logError(error as Error, { context: 'POST /api/feedback' })
      return reply.status(500).send({ error: 'Failed to submit feedback' })
    }
  })
}

