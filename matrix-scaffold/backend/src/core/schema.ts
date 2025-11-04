import { randomUUID } from 'crypto'

export type Identifier = string

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface Project {
  id: Identifier
  name: string
  createdAt: string
  updatedAt: string
  description?: string
}

export interface Bot {
  id: Identifier
  name: string
  role: 'morpheus' | 'architect' | 'sida' | 'vision' | 'audit' | string
  createdAt: string
}

export interface Artifact {
  id: Identifier
  jobId: Identifier
  projectId: Identifier
  type: 'png' | 'html' | 'thumb' | 'log' | 'generic'
  path?: string
  url?: string
  meta?: Record<string, unknown>
  createdAt: string
}

export interface JobSpec {
  kind: 'snapshot' | 'script' | 'build' | 'custom'
  app?: string
  image?: string
  command?: string[]
  env?: Record<string, string>
}

export interface Job {
  id: Identifier
  projectId: Identifier
  status: JobStatus
  spec: JobSpec
  createdAt: string
  updatedAt: string
  result?: { previewUrl?: string; artifacts?: Identifier[] }
  error?: string
}

export interface MemoryRecord {
  id: Identifier
  projectId: Identifier
  text: string
  vector: number[]
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface EventPayload<T = any> {
  type: string
  data: T
  ts: number
}

export function generateId(prefix: string = 'id'): Identifier {
  try {
    return randomUUID()
  } catch {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}


