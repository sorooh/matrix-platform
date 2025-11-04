/**
 * Nicholas System - Updated with Async Support
 * Global-Ready Architecture with database support
 */

import { db } from './storage'
import { eventBus } from './eventBus'
import { generateId, Job, JobSpec, Project } from './schema'
import { tasks, TaskType } from './tasks'
import { graph } from './graph'
import { runJob } from './runtime'
import { logger } from '../config/logger'

export const Nicholas = {
  async createProject(name: string, description?: string): Promise<Project> {
    try {
      const now = new Date().toISOString()
      const p: Project = {
        id: generateId('prj'),
        name,
        createdAt: now,
        updatedAt: now,
        description
      }
      await db.upsertProject(p)
      eventBus.publish('project.created', { id: p.id, name: p.name })
      logger.info(`Project created: ${p.id}`, { projectId: p.id, name })
      // plan baseline pipeline tasks for Bots v1
      await this.planPipeline(p.id)
      return p
    } catch (error) {
      logger.error('Failed to create project:', error)
      throw error
    }
  },

  async listProjects(): Promise<Project[]> {
    try {
      return await db.listProjects()
    } catch (error) {
      logger.error('Failed to list projects:', error)
      return []
    }
  },

  async scheduleJob(projectId: string, spec: JobSpec): Promise<Job> {
    const startTime = Date.now()
    try {
      const now = new Date().toISOString()
      const j: Job = {
        id: generateId('job'),
        projectId,
        status: 'pending',
        spec,
        createdAt: now,
        updatedAt: now
      }
      await db.upsertJob(j)
      eventBus.publish('job.created', { id: j.id, projectId, spec })
      logger.info(`Job scheduled: ${j.id}`, { jobId: j.id, projectId })
      try {
        await graph.link('Project', projectId, 'HAS_JOB', 'Job', j.id)
      } catch (error) {
        logger.warn('Failed to link job to graph:', error)
      }
      // fire-and-forget async run
      ;(async () => {
        try {
          await db.upsertJob({ ...j, status: 'running', updatedAt: new Date().toISOString() })
          eventBus.publish('job.status', { id: j.id, projectId, status: 'running' })
          const code = await runJob({ ...j, status: 'running' })
          if (code === 0) {
            await db.upsertJob({
              ...j,
              status: 'completed',
              updatedAt: new Date().toISOString(),
              result: { previewUrl: undefined }
            })
            eventBus.publish('job.completed', { id: j.id, projectId })
            logger.info(`Job completed: ${j.id}`, { jobId: j.id, projectId })
          } else {
            await db.upsertJob({
              ...j,
              status: 'failed',
              updatedAt: new Date().toISOString(),
              error: `exit ${code}`
            })
            eventBus.publish('job.failed', { id: j.id, projectId, error: `exit ${code}` })
            logger.warn(`Job failed: ${j.id}`, { jobId: j.id, projectId, error: `exit ${code}` })
          }
        } catch (e: any) {
          await db.upsertJob({
            ...j,
            status: 'failed',
            updatedAt: new Date().toISOString(),
            error: String(e)
          })
          eventBus.publish('job.failed', { id: j.id, projectId, error: String(e) })
          logger.error(`Job execution failed: ${j.id}`, { jobId: j.id, projectId, error: String(e) })
        }
      })()
      return j
    } catch (error) {
      logger.error('Failed to schedule job:', error)
      throw error
    }
  },

  async getJob(id: string): Promise<Job | undefined> {
    try {
      return await db.getJob(id)
    } catch (error) {
      logger.error('Failed to get job:', error)
      return undefined
    }
  },

  async planPipeline(projectId: string, include: TaskType[] = ['analysis', 'architecture', 'coding', 'testing', 'visual']) {
    for (const t of include) {
      try {
        const enq = tasks.enqueue(projectId, t)
        eventBus.publish('task.created', { id: enq.id, projectId, type: t })
        try {
          await graph.link('Project', projectId, 'HAS_TASK', 'Task', enq.id)
        } catch (error) {
          logger.warn('Failed to link task to graph:', error)
        }
      } catch (error) {
        logger.error(`Failed to enqueue task ${t}:`, error)
      }
    }
  }
}


