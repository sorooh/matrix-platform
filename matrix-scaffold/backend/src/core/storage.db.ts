/**
 * New Storage Layer - PostgreSQL + Prisma
 * Global-Ready Architecture
 * Replaces file-based storage with database
 */

import { prisma } from '../config/database'
import { logger } from '../config/logger'
import { Project, Job, MemoryRecord, Artifact, Bot, Identifier } from './schema'

// Projects
export const dbProjects = {
  async upsertProject(project: Project): Promise<Project> {
    try {
      const result = await prisma.project.upsert({
        where: { id: project.id },
        update: {
          name: project.name,
          description: project.description || null,
          updatedAt: new Date()
        },
        create: {
          id: project.id,
          name: project.name,
          description: project.description || null,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt || project.createdAt)
        }
      })
      return result as Project
    } catch (error: any) {
      logger.error('Failed to upsert project:', error)
      throw error
    }
  },

  async listProjects(): Promise<Project[]> {
    try {
      return await prisma.project.findMany({
        orderBy: { createdAt: 'desc' }
      }) as Project[]
    } catch (error: any) {
      logger.error('Failed to list projects:', error)
      return []
    }
  },

  async getProject(id: Identifier): Promise<Project | undefined> {
    try {
      const result = await prisma.project.findUnique({
        where: { id }
      })
      return result as Project | undefined
    } catch (error: any) {
      logger.error('Failed to get project:', error)
      return undefined
    }
  }
}

// Jobs
export const dbJobs = {
  async upsertJob(job: Job): Promise<Job> {
    try {
      const result = await prisma.job.upsert({
        where: { id: job.id },
        update: {
          projectId: job.projectId,
          status: job.status,
          spec: job.spec as any,
          result: job.result as any || null,
          error: job.error || null,
          updatedAt: new Date()
        },
        create: {
          id: job.id,
          projectId: job.projectId,
          status: job.status,
          spec: job.spec as any,
          result: job.result as any || null,
          error: job.error || null,
          createdAt: new Date(job.createdAt),
          updatedAt: new Date(job.updatedAt || job.createdAt)
        }
      })
      return result as Job
    } catch (error: any) {
      logger.error('Failed to upsert job:', error)
      throw error
    }
  },

  async listJobs(projectId?: Identifier): Promise<Job[]> {
    try {
      const where = projectId ? { projectId } : {}
      return await prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      }) as Job[]
    } catch (error: any) {
      logger.error('Failed to list jobs:', error)
      return []
    }
  },

  async getJob(id: Identifier): Promise<Job | undefined> {
    try {
      const result = await prisma.job.findUnique({
        where: { id }
      })
      return result as Job | undefined
    } catch (error: any) {
      logger.error('Failed to get job:', error)
      return undefined
    }
  }
}

// Memory
export const dbMemory = {
  async addMemory(m: MemoryRecord): Promise<MemoryRecord> {
    try {
      // Note: vector needs to be stored as pgvector type
      // For now, store in metadata until pgvector migration is complete
      const result = await prisma.memory.create({
        data: {
          id: m.id,
          projectId: m.projectId,
          text: m.text,
          metadata: {
            ...(m.metadata || {}),
            vector: m.vector // Store vector in metadata temporarily
          },
          createdAt: new Date(m.createdAt)
        }
      })
      return {
        ...result,
        vector: (result.metadata as any)?.vector || []
      } as MemoryRecord
    } catch (error: any) {
      logger.error('Failed to add memory:', error)
      throw error
    }
  },

  async listMemory(projectId?: Identifier): Promise<MemoryRecord[]> {
    try {
      const where = projectId ? { projectId } : {}
      const results = await prisma.memory.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      })
      return results.map(r => ({
        ...r,
        vector: (r.metadata as any)?.vector || []
      })) as MemoryRecord[]
    } catch (error: any) {
      logger.error('Failed to list memory:', error)
      return []
    }
  }
}

// Artifacts
export const dbArtifacts = {
  async addArtifact(a: Artifact): Promise<Artifact> {
    try {
      const result = await prisma.artifact.create({
        data: {
          id: a.id,
          jobId: a.jobId,
          projectId: a.projectId,
          type: a.type,
          path: a.path || null,
          url: a.url || null,
          meta: a.meta || null,
          createdAt: new Date(a.createdAt)
        }
      })
      return result as Artifact
    } catch (error: any) {
      logger.error('Failed to add artifact:', error)
      throw error
    }
  },

  async listArtifacts(jobId?: Identifier): Promise<Artifact[]> {
    try {
      const where = jobId ? { jobId } : {}
      return await prisma.artifact.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      }) as Artifact[]
    } catch (error: any) {
      logger.error('Failed to list artifacts:', error)
      return []
    }
  }
}

// Backward compatibility - export as 'db' for existing code
export const db = {
  upsertProject: dbProjects.upsertProject,
  listProjects: dbProjects.listProjects,
  getProject: dbProjects.getProject,
  upsertJob: dbJobs.upsertJob,
  listJobs: dbJobs.listJobs,
  getJob: dbJobs.getJob,
  addMemory: dbMemory.addMemory,
  listMemory: dbMemory.listMemory,
  addArtifact: dbArtifacts.addArtifact,
  listArtifacts: dbArtifacts.listArtifacts
}

