/**
 * Planner System - Updated with Async Support
 * Global-Ready Architecture
 */

import { tasks, TaskType } from './tasks'
import { eventBus } from './eventBus'
import { buildProjectSummary } from './memoryProvider'
import { logger } from '../config/logger'

export type Suggestion = { type: TaskType; reason: string }

export async function suggestNext(projectId: string): Promise<Suggestion[]> {
  try {
    const s = await buildProjectSummary(projectId)
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
  } catch (error) {
    logger.error('Failed to suggest next tasks:', error)
    return []
  }
}

export async function applySuggestions(projectId: string, suggestions?: Suggestion[]): Promise<Suggestion[]> {
  try {
    const list = suggestions && suggestions.length > 0 ? suggestions : await suggestNext(projectId)
    for (const s of list) {
      const t = tasks.enqueue(projectId, s.type)
      eventBus.publish('task.created', { id: t.id, projectId, type: t.type, reason: s.reason })
    }
    return list
  } catch (error) {
    logger.error('Failed to apply suggestions:', error)
    return []
  }
}


