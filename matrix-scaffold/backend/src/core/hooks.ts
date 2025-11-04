import { eventBus } from './eventBus'
import { appendLog, flushLogs } from './logs'
import { db } from './storage'
import { uploadText } from '../integrations/s3'
import { postSlack } from '../integrations/slack'
import { createIssueComment } from '../integrations/github'
import { graph } from './graph'
import { addMemory, addMemoryUnique } from './memory'
import { storeProjectSummary } from './memoryProvider'
import { addOrgMemory } from './orgMemory'

type JobEventData = { id: string; projectId?: string; status?: string; error?: string }

export function registerLifecycleHooks() {
  // collect logs
  eventBus.on((e) => {
    if (e.type === 'job.log') {
      try {
        const d = e.data as any
        const chunk: string = typeof d?.chunk === 'string' ? d.chunk : String(d?.chunk ?? '')
        appendLog(String(d?.id ?? ''), chunk)
      } catch {}
    }
  })

  // notify status changes for jobs and tasks
  eventBus.on(async (e) => {
    const d = e.data as JobEventData
    const prNum = process.env.GITHUB_PR_NUMBER ? parseInt(process.env.GITHUB_PR_NUMBER, 10) : NaN
    const owner = process.env.GITHUB_OWNER
    const repo = process.env.GITHUB_REPO

    if (e.type === 'job.created') {
      await postSlack(`Job created: ${d.id}`)
    }

    if (e.type === 'job.status') {
      await postSlack(`Job ${d.id} status: ${d.status}`)
    }

    if (e.type === 'job.completed' || e.type === 'job.failed' || e.type === 'task.completed' || e.type === 'task.failed') {
      try {
        const { path, text } = flushLogs(d.id)
        // persist artifact in db (local path)
        await db.addArtifact({ id: `${d.id}-log`, jobId: d.id, projectId: d.projectId || 'unknown', type: 'log', path, createdAt: new Date().toISOString() })
        try {
          await graph.link('Job', d.id, 'HAS_ARTIFACT', 'Artifact', `${d.id}-log`)
        } catch (error) {
          logger.warn('Failed to link artifact to graph:', error)
        }
        // upload to S3 if configured
        const bucket = process.env.S3_BUCKET || process.env.SNAPSHOT_S3_BUCKET
        if (bucket) {
          const key = `logs/${d.id}.log`
          await uploadText(key, text, 'text/plain')
        }
        // ingest a compact memory from logs (head portion) for semantic recall
        try {
          const preview = text.substring(0, Math.min(4096, text.length))
          if (d.projectId) await addMemory(d.projectId, preview, { source: 'runtime-log', ref: `${d.id}-log` })
        } catch (error) {
          logger.warn('Failed to add memory from logs:', error)
        }
      } catch {}

      let msg = ''
      if (e.type === 'job.completed') msg = `✅ Job completed: ${d.id}`
      else if (e.type === 'job.failed') msg = `❌ Job failed: ${d.id} (${d.error || ''})`
      else if (e.type === 'task.completed') msg = `✅ Task completed: ${d.id}`
      else if (e.type === 'task.failed') msg = `❌ Task failed: ${d.id} (${d.error || ''})`
      await postSlack(msg)
      if (owner && repo && Number.isFinite(prNum)) {
        try { await createIssueComment({ owner, repo, issueNumber: prNum, body: msg }) } catch {}
      }

      // store a memory snippet for the project timeline
      try {
        const pid = d.projectId || 'unknown'
        const snippet = `${msg} at ${new Date().toISOString()}`
        await addMemoryUnique(pid, snippet, { event: e.type, id: d.id })
        if (d.projectId) {
          try {
            await storeProjectSummary(d.projectId)
          } catch (error) {
            logger.warn('Failed to store project summary:', error)
          }
          try {
            await addOrgMemory(snippet, { projectId: d.projectId })
          } catch (error) {
            logger.warn('Failed to add org memory:', error)
          }
        }
      } catch (error) {
        logger.warn('Failed to store memory snippet:', error)
      }
    }
  })
}


