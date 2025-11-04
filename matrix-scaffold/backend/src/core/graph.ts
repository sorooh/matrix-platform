/**
 * Graph System - Backward Compatibility
 * Uses PostgreSQL with fallback to JSON files
 * Global-Ready Architecture
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { graphDb } from './graph.db'
import { logger } from '../config/logger'

export type NodeType = 'Org' | 'Project' | 'Task' | 'Job' | 'Artifact' | 'Memory'

export interface Edge {
  id: string
  from: { type: NodeType; id: string }
  to: { type: NodeType; id: string }
  rel: string
  createdAt: string
}

// Check if database is available
let useDatabase = false
try {
  if (process.env.DATABASE_URL) {
    useDatabase = true
  }
} catch {
  useDatabase = false
}

// Fallback to JSON files
function dbDir() {
  const d = join(__dirname, '..', '..', 'storage', 'db')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

function graphPath() {
  return join(dbDir(), 'graph.json')
}

function readEdges(): Edge[] {
  const p = graphPath()
  if (!existsSync(p)) return []
  try {
    const raw = readFileSync(p, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? (data as Edge[]) : []
  } catch {
    return []
  }
}

function writeEdges(list: Edge[]) {
  writeFileSync(graphPath(), JSON.stringify(list), 'utf8')
}

export const graph = {
  async link(
    fromType: NodeType,
    fromId: string,
    rel: string,
    toType: NodeType,
    toId: string
  ): Promise<Edge> {
    if (useDatabase) {
      try {
        return await graphDb.link(fromType, fromId, rel, toType, toId)
      } catch (error) {
        logger.warn('Database graph.link failed, falling back to JSON:', error)
        useDatabase = false
      }
    }
    // Fallback to JSON
    const now = new Date().toISOString()
    const e: Edge = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: { type: fromType, id: fromId },
      to: { type: toType, id: toId },
      rel,
      createdAt: now
    }
    const all = readEdges()
    all.push(e)
    writeEdges(all)
    return e
  },

  async neighbors(type: NodeType, id: string): Promise<Edge[]> {
    if (useDatabase) {
      try {
        return await graphDb.neighbors(type, id)
      } catch (error) {
        logger.warn('Database graph.neighbors failed, falling back to JSON:', error)
        useDatabase = false
      }
    }
    // Fallback to JSON
    const all = readEdges()
    return all.filter(
      (e) => (e.from.type === type && e.from.id === id) || (e.to.type === type && e.to.id === id)
    )
  },

  async all(): Promise<Edge[]> {
    if (useDatabase) {
      try {
        return await graphDb.all()
      } catch (error) {
        logger.warn('Database graph.all failed, falling back to JSON:', error)
        useDatabase = false
      }
    }
    // Fallback to JSON
    return readEdges()
  },

  async summary(): Promise<{
    totalEdges: number
    byRelation: Record<string, number>
    nodesByType: Record<string, number>
  }> {
    if (useDatabase) {
      try {
        return await graphDb.summary()
      } catch (error) {
        logger.warn('Database graph.summary failed, falling back to JSON:', error)
        useDatabase = false
      }
    }
    // Fallback to JSON
    const all = readEdges()
    const byRelation: Record<string, number> = {}
    const nodesByType: Record<string, number> = {}
    const seenNodes = new Set<string>()
    for (const e of all) {
      byRelation[e.rel] = (byRelation[e.rel] || 0) + 1
      const fk = `${e.from.type}:${e.from.id}`
      const tk = `${e.to.type}:${e.to.id}`
      if (!seenNodes.has(fk)) {
        seenNodes.add(fk)
        nodesByType[e.from.type] = (nodesByType[e.from.type] || 0) + 1
      }
      if (!seenNodes.has(tk)) {
        seenNodes.add(tk)
        nodesByType[e.to.type] = (nodesByType[e.to.type] || 0) + 1
      }
    }
    return { totalEdges: all.length, byRelation, nodesByType }
  }
}


