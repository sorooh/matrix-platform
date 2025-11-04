/**
 * Storage Layer - Backward Compatibility
 * Uses new PostgreSQL storage with fallback to JSON files
 * Global-Ready Architecture
 */

import { Artifact, Bot, Identifier, Job, MemoryRecord, Project } from './schema'
import { db as dbNew } from './storage.db'
import { logger } from '../config/logger'

// Check if database is available
let useDatabase = false
try {
  if (process.env.DATABASE_URL) {
    useDatabase = true
  }
} catch {
  useDatabase = false
}

// Fallback to JSON files if database not available
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

function baseDir() {
  const d = join(__dirname, '..', '..', 'storage', 'db')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

type TableName = 'projects' | 'jobs' | 'bots' | 'artifacts' | 'memory'

function tablePath(name: TableName) {
  return join(baseDir(), `${name}.json`)
}

function readTable<T>(name: TableName): T[] {
  const p = tablePath(name)
  if (!existsSync(p)) return []
  try {
    const raw = readFileSync(p, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? (data as T[]) : []
  } catch {
    return []
  }
}

function writeTable<T>(name: TableName, data: T[]) {
  const p = tablePath(name)
  writeFileSync(p, JSON.stringify(data), 'utf8')
}

// Export db with automatic database/JSON fallback
export const db = {
  async upsertProject(project: Project): Promise<Project> {
    if (useDatabase) {
      try {
        return await dbNew.upsertProject(project)
      } catch (error) {
        logger.warn('Database upsertProject failed, falling back to JSON:', error)
        useDatabase = false
      }
    }
    // Fallback to JSON
    const rows = readTable<Project>('projects')
    const idx = rows.findIndex((r) => r.id === project.id)
    if (idx >= 0) rows[idx] = project
    else rows.push(project)
    writeTable('projects', rows)
    return project
  },

  async listProjects(): Promise<Project[]> {
    if (useDatabase) {
      try {
        return await dbNew.listProjects()
      } catch (error) {
        logger.warn('Database listProjects failed, falling back to JSON:', error)
        useDatabase = false
      }
    }
    // Fallback to JSON
    return readTable<Project>('projects')
  },

  async getProject(id: Identifier): Promise<Project | undefined> {
    if (useDatabase) {
      try {
        return await dbNew.getProject(id)
      } catch (error) {
        logger.warn('Database getProject failed, falling back to JSON:', error)
        useDatabase = false
      }
    }
    // Fallback to JSON
    return readTable<Project>('projects').find((p) => p.id === id)
  },

  async upsertJob(job: Job): Promise<Job> {
    if (useDatabase) {
      try {
        return await dbNew.upsertJob(job)
      } catch (error) {
        logger.warn('Database upsertJob failed, falling back to JSON:', error)
        useDatabase = false
      }
    }
    // Fallback to JSON
    const rows = readTable<Job>('jobs')
    const idx = rows.findIndex((r) => r.id === job.id)
    if (idx >= 0) rows[idx] = job
    else rows.push(job)
    writeTable('jobs', rows)
    return job
  },

  async listJobs(projectId?: Identifier): Promise<Job[]> {
    if (useDatabase) {
      try {
        return await dbNew.listJobs(projectId)
      } catch (error) {
        logger.warn('Database listJobs failed, falling back to JSON:', error)
        useDatabase = false
      }
    }
    // Fallback to JSON
    const rows = readTable<Job>('jobs')
    return projectId ? rows.filter((j) => j.projectId === projectId) : rows
  },

  async getJob(id: Identifier): Promise<Job | undefined> {
    if (useDatabase) {
      try {
        return await dbNew.getJob(id)
      } catch (error) {
        logger.warn('Database getJob failed, falling back to JSON:', error)
        useDatabase = false
      }
    }
    // Fallback to JSON
    return readTable<Job>('jobs').find((j) => j.id === id)
  },

  async addArtifact(a: Artifact): Promise<Artifact> {
    if (useDatabase) {
      try {
        return await dbNew.addArtifact(a)
      } catch (error) {
        logger.warn('Database addArtifact failed, falling back to JSON:', error)
        useDatabase = false
      }
    }
    // Fallback to JSON
    const rows = readTable<Artifact>('artifacts')
    rows.push(a)
    writeTable('artifacts', rows)
    return a
  },

  async listArtifacts(jobId?: Identifier): Promise<Artifact[]> {
    if (useDatabase) {
      try {
        return await dbNew.listArtifacts(jobId)
      } catch (error) {
        logger.warn('Database listArtifacts failed, falling back to JSON:', error)
        useDatabase = false
      }
    }
    // Fallback to JSON
    const rows = readTable<Artifact>('artifacts')
    return jobId ? rows.filter((a) => a.jobId === jobId) : rows
  },

  async upsertBot(b: Bot): Promise<Bot> {
    // Fallback to JSON (bots not migrated yet)
    const rows = readTable<Bot>('bots')
    const idx = rows.findIndex((r) => r.id === b.id)
    if (idx >= 0) rows[idx] = b
    else rows.push(b)
    writeTable('bots', rows)
    return b
  },

  async listBots(): Promise<Bot[]> {
    // Fallback to JSON (bots not migrated yet)
    return readTable<Bot>('bots')
  },

  async addMemory(m: MemoryRecord): Promise<MemoryRecord> {
    if (useDatabase) {
      try {
        return await dbNew.addMemory(m)
      } catch (error) {
        logger.warn('Database addMemory failed, falling back to JSON:', error)
        useDatabase = false
      }
    }
    // Fallback to JSON
    const rows = readTable<MemoryRecord>('memory')
    rows.push(m)
    writeTable('memory', rows)
    return m
  },

  async listMemory(projectId?: Identifier): Promise<MemoryRecord[]> {
    if (useDatabase) {
      try {
        return await dbNew.listMemory(projectId)
      } catch (error) {
        logger.warn('Database listMemory failed, falling back to JSON:', error)
        useDatabase = false
      }
    }
    // Fallback to JSON
    const rows = readTable<MemoryRecord>('memory')
    return projectId ? rows.filter((m) => m.projectId === projectId) : rows
  },

  async replaceAllMemory(newRows: MemoryRecord[]): Promise<void> {
    // Fallback to JSON
    writeTable('memory', newRows)
  }
}


