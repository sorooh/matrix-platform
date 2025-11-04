/**
 * SUIG System - Updated with Async Support
 * Global-Ready Architecture
 */

import { db } from './storage'
import { searchMemory, embed } from './memory'
import { searchOrgMemory, ORG_ID } from './orgMemory'
import { graph } from './graph'
import { logger } from '../config/logger'

export async function unifiedQuery(params: {
  q: string
  scope?: 'org' | 'project' | 'all'
  projectId?: string
  topK?: number
}) {
  try {
    const q = params.q || ''
    const topK = params.topK || 8
    const scope = params.scope || 'all'
    const out: any = { q, scope }
    if (scope === 'org' || scope === 'all') {
      out.org = await searchOrgMemory(q, topK)
    }
    if (scope === 'project' || scope === 'all') {
      const pid = params.projectId
      if (pid) out.project = await searchMemory(pid, q, topK)
    }
    // simple graph neighbor lookup for query terms mapped to ids if provided
    if (params.projectId) {
      try {
        out.graph = { projectNeighbors: await graph.neighbors('Project', params.projectId) }
      } catch (error) {
        logger.warn('Failed to get graph neighbors:', error)
      }
    }
    return out
  } catch (error) {
    logger.error('Failed to unified query:', error)
    return { q: params.q, scope: params.scope, error: 'Query failed' }
  }
}

function averageVector(vectors: number[][]): number[] {
  if (!vectors || vectors.length === 0) return []
  const dim = Math.max(...vectors.map(v => v.length))
  const out = new Array(dim).fill(0)
  for (const v of vectors) {
    for (let i = 0; i < v.length; i++) out[i] += v[i]
  }
  for (let i = 0; i < dim; i++) out[i] /= vectors.length
  return out
}

export async function recommendForProject(projectId: string, topK = 5) {
  try {
    // naive cross-project recommendation: find projects whose memory vectors are closest to this project's memory centroid
    const allProjects = (await db.listProjects()).map((p) => p.id).filter((id) => id !== projectId)
    const thisMem = await db.listMemory(projectId)
    const thisVecs = thisMem.map((m) => m.vector || [])
    const centroid = averageVector(thisVecs)
    function cosine(a: number[], b: number[]) {
      const n = Math.min(a.length, b.length)
      let s = 0
      for (let i = 0; i < n; i++) s += a[i] * b[i]
      return s
    }
    const scored: Array<{ projectId: string; score: number }> = []
    for (const pid of allProjects) {
      const mem = await db.listMemory(pid)
      if (mem.length === 0) continue
      const vec = averageVector(mem.map((m) => m.vector || []))
      const score = cosine(centroid, vec)
      scored.push({ projectId: pid, score })
    }
    scored.sort((a, b) => b.score - a.score)
    const picks = scored.slice(0, topK)
    // attach brief highlights from org memory
    const highlights = await searchOrgMemory('summary', 3)
    return { similarProjects: picks, highlights }
  } catch (error) {
    logger.error('Failed to recommend for project:', error)
    return { similarProjects: [], highlights: [] }
  }
}

export async function kpis() {
  try {
    const projects = await db.listProjects()
    const jobsAll = await db.listJobs()
    const tasksAll = (require('./tasks') as any).tasks.list()
    const memCount = (await db.listMemory()).length
    const g = await graph.summary()
    const jobCompleted = jobsAll.filter((j: any) => j.status === 'completed').length
    const jobFailed = jobsAll.filter((j: any) => j.status === 'failed').length
    const jobSuccessRate = (jobCompleted + jobFailed) > 0 ? jobCompleted / (jobCompleted + jobFailed) : 1
    return {
      projects: projects.length,
      jobs: { total: jobsAll.length, completed: jobCompleted, failed: jobFailed, successRate: jobSuccessRate },
      tasks: { total: tasksAll.length, completed: tasksAll.filter((t: any) => t.status === 'completed').length },
      memory: { total: memCount },
      graph: g
    }
  } catch (error) {
    logger.error('Failed to get KPIs:', error)
    return {
      projects: 0,
      jobs: { total: 0, completed: 0, failed: 0, successRate: 0 },
      tasks: { total: 0, completed: 0 },
      memory: { total: 0 },
      graph: { totalEdges: 0, byRelation: {}, nodesByType: {} }
    }
  }
}




