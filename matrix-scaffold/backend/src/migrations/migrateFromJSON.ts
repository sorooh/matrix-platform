/**
 * Migration Script: JSON Files → PostgreSQL
 * Migrates existing JSON-based storage to PostgreSQL
 */

import { prisma } from '../config/database'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { logger } from '../config/logger'

interface JSONData {
  projects?: any[]
  jobs?: any[]
  memory?: any[]
  artifacts?: any[]
  bots?: any[]
  tasks?: any[]
}

async function migrateFromJSON() {
  logger.info('🚀 Starting migration from JSON to PostgreSQL...')

  const dbDir = join(__dirname, '..', '..', 'storage', 'db')
  
  try {
    // Migrate Projects
    const projectsPath = join(dbDir, 'projects.json')
    if (existsSync(projectsPath)) {
      const projects = JSON.parse(readFileSync(projectsPath, 'utf8'))
      if (Array.isArray(projects) && projects.length > 0) {
        for (const project of projects) {
          await prisma.project.upsert({
            where: { id: project.id },
            update: {
              name: project.name,
              description: project.description || null,
              updatedAt: new Date(project.updatedAt || project.createdAt)
            },
            create: {
              id: project.id,
              name: project.name,
              description: project.description || null,
              createdAt: new Date(project.createdAt),
              updatedAt: new Date(project.updatedAt || project.createdAt)
            }
          })
        }
        logger.info(`✅ Migrated ${projects.length} projects`)
      }
    }

    // Migrate Jobs
    const jobsPath = join(dbDir, 'jobs.json')
    if (existsSync(jobsPath)) {
      const jobs = JSON.parse(readFileSync(jobsPath, 'utf8'))
      if (Array.isArray(jobs) && jobs.length > 0) {
        for (const job of jobs) {
          await prisma.job.upsert({
            where: { id: job.id },
            update: {
              projectId: job.projectId,
              status: job.status || 'pending',
              spec: job.spec || {},
              result: job.result || null,
              error: job.error || null,
              updatedAt: new Date(job.updatedAt || job.createdAt)
            },
            create: {
              id: job.id,
              projectId: job.projectId,
              status: job.status || 'pending',
              spec: job.spec || {},
              result: job.result || null,
              error: job.error || null,
              createdAt: new Date(job.createdAt),
              updatedAt: new Date(job.updatedAt || job.createdAt)
            }
          })
        }
        logger.info(`✅ Migrated ${jobs.length} jobs`)
      }
    }

    // Migrate Tasks
    const tasksPath = join(dbDir, 'tasks.json')
    if (existsSync(tasksPath)) {
      const tasks = JSON.parse(readFileSync(tasksPath, 'utf8'))
      if (Array.isArray(tasks) && tasks.length > 0) {
        for (const task of tasks) {
          await prisma.task.upsert({
            where: { id: task.id },
            update: {
              projectId: task.projectId,
              type: task.type,
              status: task.status || 'queued',
              payload: task.payload || null,
              error: task.error || null,
              updatedAt: new Date(task.updatedAt || task.createdAt)
            },
            create: {
              id: task.id,
              projectId: task.projectId,
              type: task.type,
              status: task.status || 'queued',
              payload: task.payload || null,
              error: task.error || null,
              createdAt: new Date(task.createdAt),
              updatedAt: new Date(task.updatedAt || task.createdAt)
            }
          })
        }
        logger.info(`✅ Migrated ${tasks.length} tasks`)
      }
    }

    // Migrate Memory (without vectors - will be regenerated)
    const memoryPath = join(dbDir, 'memory.json')
    if (existsSync(memoryPath)) {
      const memories = JSON.parse(readFileSync(memoryPath, 'utf8'))
      if (Array.isArray(memories) && memories.length > 0) {
        // Note: Vectors will need to be regenerated using embed() function
        logger.info(`⚠️ Found ${memories.length} memory records - vectors will need regeneration`)
        for (const memory of memories) {
          await prisma.memory.upsert({
            where: { id: memory.id },
            update: {
              projectId: memory.projectId,
              text: memory.text,
              metadata: memory.metadata || null,
              // vector: will be set later via embed()
            },
            create: {
              id: memory.id,
              projectId: memory.projectId,
              text: memory.text,
              metadata: memory.metadata || null,
              createdAt: new Date(memory.createdAt)
              // vector: will be set later via embed()
            }
          })
        }
        logger.info(`✅ Migrated ${memories.length} memory records (vectors need regeneration)`)
      }
    }

    // Migrate Artifacts
    const artifactsPath = join(dbDir, 'artifacts.json')
    if (existsSync(artifactsPath)) {
      const artifacts = JSON.parse(readFileSync(artifactsPath, 'utf8'))
      if (Array.isArray(artifacts) && artifacts.length > 0) {
        for (const artifact of artifacts) {
          await prisma.artifact.upsert({
            where: { id: artifact.id },
            update: {
              jobId: artifact.jobId,
              projectId: artifact.projectId,
              type: artifact.type,
              path: artifact.path || null,
              url: artifact.url || null,
              meta: artifact.meta || null
            },
            create: {
              id: artifact.id,
              jobId: artifact.jobId,
              projectId: artifact.projectId,
              type: artifact.type,
              path: artifact.path || null,
              url: artifact.url || null,
              meta: artifact.meta || null,
              createdAt: new Date(artifact.createdAt)
            }
          })
        }
        logger.info(`✅ Migrated ${artifacts.length} artifacts`)
      }
    }

    // Migrate Graph Edges
    const graphPath = join(dbDir, 'graph.json')
    if (existsSync(graphPath)) {
      const edges = JSON.parse(readFileSync(graphPath, 'utf8'))
      if (Array.isArray(edges) && edges.length > 0) {
        for (const edge of edges) {
          await prisma.graphEdge.upsert({
            where: { id: edge.id },
            update: {
              fromType: edge.from.type,
              fromId: edge.from.id,
              toType: edge.to.type,
              toId: edge.to.id,
              rel: edge.rel
            },
            create: {
              id: edge.id,
              fromType: edge.from.type,
              fromId: edge.from.id,
              toType: edge.to.type,
              toId: edge.to.id,
              rel: edge.rel,
              createdAt: new Date(edge.createdAt)
            }
          })
        }
        logger.info(`✅ Migrated ${edges.length} graph edges`)
      }
    }

    logger.info('✅ Migration completed successfully!')
  } catch (error: any) {
    logger.error('❌ Migration failed:', error)
    throw error
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateFromJSON()
    .then(() => {
      console.log('✅ Migration completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    })
}

export { migrateFromJSON }

