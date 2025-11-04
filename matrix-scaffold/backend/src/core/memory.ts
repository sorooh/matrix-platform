/**
 * Memory System - Updated with Database Support
 * Uses new memory.db.ts with pgvector support
 * Falls back to cosine similarity if pgvector not available
 */

import { MemoryRecord, Identifier } from './schema'
import { db } from './storage'
import { createHash } from 'crypto'
import { graph } from './graph'
import { embed } from './memoryProvider'
import { searchMemory as searchMemoryDb, addMemoryWithVector } from './memory.db'
import { logger } from '../config/logger'

// Check if database with pgvector is available
let useDatabase = false
try {
  if (process.env.DATABASE_URL) {
    useDatabase = true
  }
} catch {
  useDatabase = false
}

export function cosine(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0
  let s = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) s += a[i] * b[i]
  return s
}

export async function addMemory(
  projectId: Identifier,
  text: string,
  metadata?: Record<string, unknown>
): Promise<MemoryRecord> {
  try {
    if (useDatabase) {
      try {
        const rec = await addMemoryWithVector(projectId, text, metadata)
        // Link to graph
        try {
          const isOrg = projectId === '__org__'
          await graph.link(isOrg ? 'Org' : 'Project', projectId, 'HAS_MEMORY', 'Memory', rec.id)
        } catch (error) {
          logger.warn('Failed to link memory to graph:', error)
        }
        return rec
      } catch (error) {
        logger.warn('Database addMemory failed, falling back to JSON:', error)
        useDatabase = false
      }
    }
    // Fallback to JSON
    const vector = embed(text)
    const rec: MemoryRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectId,
      text,
      vector,
      metadata,
      createdAt: new Date().toISOString()
    }
    await db.addMemory(rec)
    try {
      const isOrg = projectId === '__org__'
      await graph.link(isOrg ? 'Org' : 'Project', projectId, 'HAS_MEMORY', 'Memory', rec.id)
    } catch (error) {
      logger.warn('Failed to link memory to graph:', error)
    }
    return rec
  } catch (error) {
    logger.error('Failed to add memory:', error)
    throw error
  }
}

function hashText(text: string): string {
  try {
    return createHash('sha1').update(text || '').digest('hex')
  } catch {
    return ''
  }
}

export async function addMemoryUnique(
  projectId: Identifier,
  text: string,
  metadata?: Record<string, unknown>
): Promise<MemoryRecord> {
  const h = hashText(text)
  const all = await db.listMemory(projectId)
  const existing = all.find((m) => (m.metadata as any)?.hash === h || m.text === text)
  if (existing) return existing
  const meta = { ...(metadata || {}), hash: h }
  return await addMemory(projectId, text, meta)
}

export async function searchMemory(
  projectId: Identifier,
  query: string,
  topK: number = 5
): Promise<Array<{ score: number; record: MemoryRecord }>> {
  try {
    if (useDatabase) {
      try {
        return await searchMemoryDb(projectId, query, topK)
      } catch (error) {
        logger.warn('Database searchMemory failed, falling back to cosine:', error)
        useDatabase = false
      }
    }
    // Fallback to cosine similarity
    const q = embed(query)
    const all = await db.listMemory(projectId)
    const scored = all.map((r) => ({
      score: cosine(q, r.vector || []),
      record: r
    }))
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, topK)
  } catch (error) {
    logger.error('Failed to search memory:', error)
    return []
  }
}


