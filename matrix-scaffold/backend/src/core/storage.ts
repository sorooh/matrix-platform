import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { Artifact, Bot, Identifier, Job, MemoryRecord, Project } from './schema'

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

export const db = {
  upsertProject(project: Project) {
    const rows = readTable<Project>('projects')
    const idx = rows.findIndex((r) => r.id === project.id)
    if (idx >= 0) rows[idx] = project
    else rows.push(project)
    writeTable('projects', rows)
  },
  listProjects(): Project[] {
    return readTable<Project>('projects')
  },
  getProject(id: Identifier): Project | undefined {
    return readTable<Project>('projects').find((p) => p.id === id)
  },

  upsertJob(job: Job) {
    const rows = readTable<Job>('jobs')
    const idx = rows.findIndex((r) => r.id === job.id)
    if (idx >= 0) rows[idx] = job
    else rows.push(job)
    writeTable('jobs', rows)
  },
  listJobs(projectId?: Identifier): Job[] {
    const rows = readTable<Job>('jobs')
    return projectId ? rows.filter((j) => j.projectId === projectId) : rows
  },
  getJob(id: Identifier): Job | undefined {
    return readTable<Job>('jobs').find((j) => j.id === id)
  },

  addArtifact(a: Artifact) {
    const rows = readTable<Artifact>('artifacts')
    rows.push(a)
    writeTable('artifacts', rows)
  },
  listArtifacts(jobId?: Identifier): Artifact[] {
    const rows = readTable<Artifact>('artifacts')
    return jobId ? rows.filter((a) => a.jobId === jobId) : rows
  },

  upsertBot(b: Bot) {
    const rows = readTable<Bot>('bots')
    const idx = rows.findIndex((r) => r.id === b.id)
    if (idx >= 0) rows[idx] = b
    else rows.push(b)
    writeTable('bots', rows)
  },
  listBots(): Bot[] {
    return readTable<Bot>('bots')
  },

  addMemory(m: MemoryRecord) {
    const rows = readTable<MemoryRecord>('memory')
    rows.push(m)
    writeTable('memory', rows)
  },
  listMemory(projectId?: Identifier): MemoryRecord[] {
    const rows = readTable<MemoryRecord>('memory')
    return projectId ? rows.filter((m) => m.projectId === projectId) : rows
  }
}


