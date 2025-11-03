import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { generateId, Identifier } from './schema'

export type TaskType = 'analysis' | 'architecture' | 'coding' | 'testing' | 'visual'
export type TaskStatus = 'queued' | 'in_progress' | 'completed' | 'failed'

export interface Task {
  id: Identifier
  projectId: Identifier
  type: TaskType
  payload?: Record<string, unknown>
  status: TaskStatus
  createdAt: string
  updatedAt: string
  error?: string
}

function dbDir() {
  const d = join(__dirname, '..', '..', 'storage', 'db')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

function tasksPath() {
  return join(dbDir(), 'tasks.json')
}

function readTasks(): Task[] {
  const p = tasksPath()
  if (!existsSync(p)) return []
  try {
    const raw = readFileSync(p, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? (data as Task[]) : []
  } catch {
    return []
  }
}

function writeTasks(list: Task[]) {
  writeFileSync(tasksPath(), JSON.stringify(list), 'utf8')
}

export const tasks = {
  enqueue(projectId: Identifier, type: TaskType, payload?: Record<string, unknown>): Task {
    const now = new Date().toISOString()
    const t: Task = { id: generateId('tsk'), projectId, type, payload, status: 'queued', createdAt: now, updatedAt: now }
    const all = readTasks()
    all.push(t)
    writeTasks(all)
    return t
  },
  claim(type: TaskType): Task | null {
    const all = readTasks()
    const idx = all.findIndex((t) => t.status === 'queued' && t.type === type)
    if (idx < 0) return null
    const t = { ...all[idx], status: 'in_progress', updatedAt: new Date().toISOString() }
    all[idx] = t
    writeTasks(all)
    return t
  },
  complete(id: Identifier) {
    const all = readTasks()
    const idx = all.findIndex((t) => t.id === id)
    if (idx >= 0) {
      all[idx] = { ...all[idx], status: 'completed', updatedAt: new Date().toISOString() }
      writeTasks(all)
    }
  },
  fail(id: Identifier, error: string) {
    const all = readTasks()
    const idx = all.findIndex((t) => t.id === id)
    if (idx >= 0) {
      all[idx] = { ...all[idx], status: 'failed', error, updatedAt: new Date().toISOString() }
      writeTasks(all)
    }
  },
  list(projectId?: Identifier): Task[] {
    const all = readTasks()
    return projectId ? all.filter((t) => t.projectId === projectId) : all
  }
}


