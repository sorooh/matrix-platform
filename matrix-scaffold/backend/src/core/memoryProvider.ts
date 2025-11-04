import { db } from './storage'
import { tasks } from './tasks'
import { searchMemory, addMemoryUnique } from './memory'
import { getVectorProvider } from './vectorProvider'
import { Identifier, Job } from './schema'

type SummaryCounts = {
  tasks: { queued: number; in_progress: number; completed: number; failed: number }
  jobs: { pending: number; running: number; completed: number; failed: number }
  artifacts: number
  memory: number
}

export async function buildProjectSummary(projectId: Identifier): Promise<{
  counts: SummaryCounts
  lastJobs: Job[]
  text: string
}> {
  const jobList = await db.listJobs(projectId)
  const tList = tasks.list(projectId)
  const art = (await db.listArtifacts()).filter((a) => a.projectId === projectId)
  const mem = await db.listMemory(projectId)

  const counts: SummaryCounts = {
    tasks: {
      queued: tList.filter((t) => t.status === 'queued').length,
      in_progress: tList.filter((t) => t.status === 'in_progress').length,
      completed: tList.filter((t) => t.status === 'completed').length,
      failed: tList.filter((t) => t.status === 'failed').length
    },
    jobs: {
      pending: jobList.filter((j) => j.status === 'pending').length,
      running: jobList.filter((j) => j.status === 'running').length,
      completed: jobList.filter((j) => j.status === 'completed').length,
      failed: jobList.filter((j) => j.status === 'failed').length
    },
    artifacts: art.length,
    memory: mem.length
  }

  // pick last 5 jobs by updatedAt/createdAt
  const lastJobs = [...jobList].sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt)).slice(0, 5)

  // derive a compact textual summary (deterministic, no AI dependency)
  const lines: string[] = []
  lines.push(`Project ${projectId} — Summary`)
  lines.push(`Tasks: queued=${counts.tasks.queued}, in_progress=${counts.tasks.in_progress}, completed=${counts.tasks.completed}, failed=${counts.tasks.failed}`)
  lines.push(`Jobs: pending=${counts.jobs.pending}, running=${counts.jobs.running}, completed=${counts.jobs.completed}, failed=${counts.jobs.failed}`)
  lines.push(`Artifacts: ${counts.artifacts}, Memory: ${counts.memory}`)
  if (lastJobs.length > 0) {
    lines.push('Recent Jobs:')
    for (const j of lastJobs) {
      lines.push(`- ${j.id} [${j.status}]`)
    }
  }
  // include top-3 memory hits for "summary" or "runtime-log" categories
  const memHits = await searchMemory(projectId, 'summary runtime-log', 3)
  if (memHits.length > 0) {
    lines.push('Memory highlights:')
    for (const h of memHits) {
      const snippet = (h.record.text || '').slice(0, 140).replace(/\s+/g, ' ')
      lines.push(`- (${h.score.toFixed(3)}) ${snippet}`)
    }
  }
  const text = lines.join('\n')
  return { counts, lastJobs, text }
}

export async function storeProjectSummary(projectId: Identifier) {
  try {
    const s = await buildProjectSummary(projectId)
    try {
      await addMemoryUnique(projectId, s.text, { kind: 'summary', counts: s.counts })
    } catch (error) {
      logger.warn('Failed to add project summary to memory:', error)
    }
    return s
  } catch (error) {
    logger.error('Failed to store project summary:', error)
    throw error
  }
}

export function embed(text: string): number[] {
  const vp = getVectorProvider()
  const v = vp.embed(text)
  if (Array.isArray(v)) return v
  // if async provider provided, return empty vector (caller should handle sync)
  try { return (v as any) } catch { return [] }
}


