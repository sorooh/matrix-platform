import { tasks } from '../core/tasks'
import { eventBus } from '../core/eventBus'
import { db } from '../core/storage'
import { Nicholas } from '../core/nicholas'
import { enqueueSnapshot } from '../snapshots'
import { searchOrgMemory } from '../core/orgMemory'
import { logger } from '../config/logger'
import { agents } from '../ai/agents'
import { addMemory } from '../core/memory'

function loop(type: 'analysis'|'architecture'|'coding'|'testing'|'visual') {
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
  ;(async () => {
    for (;;) {
      const t = tasks.claim(type)
      if (!t) { await delay(400); continue }
      try {
        // fetch small org-level context
        try {
          const hints = await searchOrgMemory('summary runtime-log', 2)
          if (hints && hints.length > 0) {
            const hintText = hints.map((h) => (h.record?.text || '').slice(0, 120).replace(/\s+/g, ' ')).join(' | ')
            eventBus.publish('job.log', { id: t.id, stream: 'stdout', chunk: `[Context] ${hintText}\n` })
          }
        } catch (error) {
          logger.warn('Failed to fetch org context:', error)
        }
        eventBus.publish('bot.claimed', { taskId: t.id, type })
        // Real AI Agent work
        if (type === 'analysis') {
          try {
            eventBus.publish('job.log', { id: t.id, stream: 'stdout', chunk: `[Morpheus] analyzing project ${t.projectId}\n` })
            const project = await db.getProject(t.projectId)
            if (project) {
              const analysis = await agents.morpheus.analyzeProject(
                t.projectId,
                `Analyze project: ${project.name} - ${project.description || ''}`
              )
              eventBus.publish('job.log', { id: t.id, stream: 'stdout', chunk: `[Morpheus] Analysis: ${analysis}\n` })
              // Store analysis in memory
              await addMemory(t.projectId, analysis, { kind: 'analysis', source: 'morpheus', taskId: t.id })
            }
          } catch (error: any) {
            logger.error('Morpheus analysis failed:', error)
            eventBus.publish('job.log', { id: t.id, stream: 'stderr', chunk: `[Morpheus] Error: ${error.message}\n` })
          }
        } else if (type === 'architecture') {
          try {
            eventBus.publish('job.log', { id: t.id, stream: 'stdout', chunk: `[Architect] drafting architecture for ${t.projectId}\n` })
            const project = await db.getProject(t.projectId)
            if (project) {
              const architecture = await agents.architect.designArchitecture(
                t.projectId,
                `Design architecture for: ${project.name}`
              )
              eventBus.publish('job.log', { id: t.id, stream: 'stdout', chunk: `[Architect] Architecture: ${architecture}\n` })
              // Store architecture in memory
              await addMemory(t.projectId, architecture, { kind: 'architecture', source: 'architect', taskId: t.id })
            }
          } catch (error: any) {
            logger.error('Architect design failed:', error)
            eventBus.publish('job.log', { id: t.id, stream: 'stderr', chunk: `[Architect] Error: ${error.message}\n` })
          }
        } else if (type === 'coding') {
          try {
            eventBus.publish('job.log', { id: t.id, stream: 'stdout', chunk: `[SIDA] coding module for ${t.projectId}\n` })
            const project = await db.getProject(t.projectId)
            if (project) {
              const code = await agents.sida.generateCode(
                t.projectId,
                `Generate code for: ${project.name}`
              )
              eventBus.publish('job.log', { id: t.id, stream: 'stdout', chunk: `[SIDA] Code generated\n` })
              // Store code in memory
              await addMemory(t.projectId, code, { kind: 'code', source: 'sida', taskId: t.id })
              // schedule a demo script job via Nicholas
              await Nicholas.scheduleJob(t.projectId, { kind: 'script', image: 'node:18-bullseye-slim', command: ['node','-e','console.log("SIDA build step")'] })
            }
          } catch (error: any) {
            logger.error('SIDA code generation failed:', error)
            eventBus.publish('job.log', { id: t.id, stream: 'stderr', chunk: `[SIDA] Error: ${error.message}\n` })
          }
        } else if (type === 'testing') {
          try {
            eventBus.publish('job.log', { id: t.id, stream: 'stdout', chunk: `[Audit] running tests for ${t.projectId}\n` })
            const project = await db.getProject(t.projectId)
            if (project) {
              const tests = await agents.audit.generateTests(
                t.projectId,
                `Generate tests for: ${project.name}`
              )
              eventBus.publish('job.log', { id: t.id, stream: 'stdout', chunk: `[Audit] Tests generated\n` })
              // Store tests in memory
              await addMemory(t.projectId, tests, { kind: 'tests', source: 'audit', taskId: t.id })
            }
          } catch (error: any) {
            logger.error('Audit test generation failed:', error)
            eventBus.publish('job.log', { id: t.id, stream: 'stderr', chunk: `[Audit] Error: ${error.message}\n` })
          }
        } else if (type === 'visual') {
          eventBus.publish('job.log', { id: t.id, stream: 'stdout', chunk: `[Vision] capturing snapshot for ${t.projectId}\n` })
          try {
            await enqueueSnapshot('admin-dashboard')
          } catch (error: any) {
            logger.error('Snapshot enqueue failed:', error)
          }
        }
        tasks.complete(t.id)
        eventBus.publish('task.completed', { id: t.id, projectId: t.projectId, type })
      } catch (e: any) {
        tasks.fail(t.id, String(e))
        eventBus.publish('task.failed', { id: t.id, projectId: t.projectId, type, error: String(e) })
      }
      await delay(200)
    }
  })().catch(() => {})
}

export function registerBots() {
  loop('analysis')
  loop('architecture')
  loop('coding')
  loop('testing')
  loop('visual')
}


