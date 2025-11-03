import { tasks } from '../core/tasks'
import { eventBus } from '../core/eventBus'
import { db } from '../core/storage'
import { Nicholas } from '../core/nicholas'
import { enqueueSnapshot } from '../snapshots'

function loop(type: 'analysis'|'architecture'|'coding'|'testing'|'visual') {
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
  ;(async () => {
    for (;;) {
      const t = tasks.claim(type)
      if (!t) { await delay(400); continue }
      try {
        eventBus.publish('bot.claimed', { taskId: t.id, type })
        // Simulated work per bot
        if (type === 'analysis') {
          eventBus.publish('job.log', { id: t.id, stream: 'stdout', chunk: `[Morpheus] analyzing project ${t.projectId}\n` })
          await delay(500)
        } else if (type === 'architecture') {
          eventBus.publish('job.log', { id: t.id, stream: 'stdout', chunk: `[Architect] drafting architecture for ${t.projectId}\n` })
          await delay(500)
        } else if (type === 'coding') {
          eventBus.publish('job.log', { id: t.id, stream: 'stdout', chunk: `[SIDA] coding module for ${t.projectId}\n` })
          // schedule a demo script job via Nicholas
          await Nicholas.scheduleJob(t.projectId, { kind: 'script', image: 'node:18-bullseye-slim', command: ['node','-e','console.log("SIDA build step")'] })
        } else if (type === 'testing') {
          eventBus.publish('job.log', { id: t.id, stream: 'stdout', chunk: `[Audit] running tests for ${t.projectId}\n` })
          await delay(600)
        } else if (type === 'visual') {
          eventBus.publish('job.log', { id: t.id, stream: 'stdout', chunk: `[Vision] capturing snapshot for ${t.projectId}\n` })
          try { await enqueueSnapshot('admin-dashboard') } catch {}
        }
        tasks.complete(t.id)
        eventBus.publish('task.completed', { id: t.id, type })
      } catch (e: any) {
        tasks.fail(t.id, String(e))
        eventBus.publish('task.failed', { id: t.id, type, error: String(e) })
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


