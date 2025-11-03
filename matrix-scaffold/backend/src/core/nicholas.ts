import { db } from './storage'
import { eventBus } from './eventBus'
import { generateId, Job, JobSpec, Project } from './schema'
import { runJob } from './runtime'

export const Nicholas = {
  createProject(name: string, description?: string): Project {
    const now = new Date().toISOString()
    const p: Project = { id: generateId('prj'), name, createdAt: now, updatedAt: now, description }
    db.upsertProject(p)
    eventBus.publish('project.created', { id: p.id, name: p.name })
    return p
  },

  listProjects(): Project[] {
    return db.listProjects()
  },

  async scheduleJob(projectId: string, spec: JobSpec): Promise<Job> {
    const now = new Date().toISOString()
    const j: Job = { id: generateId('job'), projectId, status: 'pending', spec, createdAt: now, updatedAt: now }
    db.upsertJob(j)
    eventBus.publish('job.created', { id: j.id, projectId, spec })
    // fire-and-forget async run
    ;(async () => {
      try {
        db.upsertJob({ ...j, status: 'running', updatedAt: new Date().toISOString() })
        eventBus.publish('job.status', { id: j.id, status: 'running' })
        const code = await runJob({ ...j, status: 'running' })
        if (code === 0) {
          db.upsertJob({ ...j, status: 'completed', updatedAt: new Date().toISOString(), result: { previewUrl: undefined } })
          eventBus.publish('job.completed', { id: j.id })
        } else {
          db.upsertJob({ ...j, status: 'failed', updatedAt: new Date().toISOString(), error: `exit ${code}` })
          eventBus.publish('job.failed', { id: j.id, error: `exit ${code}` })
        }
      } catch (e: any) {
        db.upsertJob({ ...j, status: 'failed', updatedAt: new Date().toISOString(), error: String(e) })
        eventBus.publish('job.failed', { id: j.id, error: String(e) })
      }
    })()
    return j
  },

  getJob(id: string): Job | undefined {
    return db.getJob(id)
  }
}


