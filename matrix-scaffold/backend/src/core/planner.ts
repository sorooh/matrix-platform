import { tasks, TaskType } from './tasks'
import { eventBus } from './eventBus'
import { buildProjectSummary } from './memoryProvider'

export type Suggestion = { type: TaskType; reason: string }

export function suggestNext(projectId: string): Suggestion[] {
  const s = buildProjectSummary(projectId)
  const out: Suggestion[] = []
  if (s.counts.jobs.failed > 0) {
    out.push({ type: 'testing', reason: 'recover from failed jobs' })
    out.push({ type: 'coding', reason: 'apply fixes from failures' })
  } else if (s.counts.tasks.completed >= 5) {
    out.push({ type: 'visual', reason: 'produce fresh snapshot for UI review' })
    out.push({ type: 'analysis', reason: 'gather next iteration requirements' })
  } else {
    out.push({ type: 'analysis', reason: 'explore requirements' })
    out.push({ type: 'architecture', reason: 'refine design' })
  }
  return out
}

export function applySuggestions(projectId: string, suggestions?: Suggestion[]): Suggestion[] {
  const list = suggestions && suggestions.length > 0 ? suggestions : suggestNext(projectId)
  for (const s of list) {
    const t = tasks.enqueue(projectId, s.type)
    eventBus.publish('task.created', { id: t.id, projectId, type: t.type, reason: s.reason })
  }
  return list
}


