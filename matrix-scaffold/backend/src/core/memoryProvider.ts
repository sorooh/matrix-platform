import { db } from './storage'
import { tasks } from './tasks'
import { searchMemory, addMemory } from './memory'
import { Identifier, Job } from './schema'

type SummaryCounts = {
  tasks: { queued: number; in_progress: number; completed: number; failed: number }
  jobs: { pending: number; running: number; completed: number; failed: number }
  artifacts: number
  memory: number
}

export function buildProjectSummary(projectId: Identifier): { counts: SummaryCounts; lastJobs: Job[]; text: string } {
  const jobList = db.listJobs(projectId)
  const tList = tasks.list(projectId)
  const art = db.listArtifacts().filter((a) => a.projectId === projectId)
  const mem = db.listMemory(projectId)

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
  lines.push(`Project ${projectId} â€” Summary`)
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
  const memHits = searchMemory(projectId, 'summary runtime-log', 3)
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

export function storeProjectSummary(projectId: Identifier) {
  const s = buildProjectSummary(projectId)
  try {
    addMemory(projectId, s.text, { kind: 'summary', counts: s.counts })
  } catch {}
  return s
}

// Phase 0 memory provider with a pluggable interface.
// Default provider: hashed bag-of-words embedding (fast, offline).

const DIM = 256

function tokenize(text: string): string[] {
  return (text || '').toLowerCase().split(/[^a-z0-9_]+/i).filter(Boolean)
}

function hashToken(token: string): number {
  let h = 2166136261
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i)
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)
  }
  return Math.abs(h) % DIM
}

function embedHash(text: string): number[] {
  const vec = new Array<number>(DIM).fill(0)
  const toks = tokenize(text)
  if (toks.length === 0) return vec
  for (const t of toks) vec[hashToken(t)] += 1
  // L2 normalize
  let norm = 0
  for (let i = 0; i < DIM; i++) norm += vec[i] * vec[i]
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < DIM; i++) vec[i] /= norm
  return vec
}

export function embed(text: string): number[] {
  // Future: switch based on process.env.EMBED_PROVIDER (e.g., 'openai')
  // For phase 0, always use hash-based embedding (offline and deterministic)
  return embedHash(text)
}


