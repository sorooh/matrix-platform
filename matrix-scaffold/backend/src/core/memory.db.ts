/**
 * New Memory System - PostgreSQL + pgvector
 * Global-Ready Architecture with optimized vector search
 */

import { prisma, pgPool } from '../config/database'
import { MemoryRecord, Identifier } from './schema'
import { embed } from './memoryProvider'
import { logger } from '../config/logger'

// Vector search using pgvector (when available)
export async function searchMemoryVector(
  projectId: Identifier,
  query: string,
  topK: number = 5
): Promise<Array<{ score: number; record: MemoryRecord }>> {
  try {
    // Embed query
    const queryVector = embed(query)
    
    // Check if pgvector extension is available
    const vectorStr = `[${queryVector.join(',')}]`
    
    // Use pgvector for similarity search
    const result = await pgPool.query(
      `SELECT 
        id, "projectId", text, metadata, "createdAt",
        1 - (embedding <=> $1::vector) AS score
       FROM memory
       WHERE "projectId" = $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [vectorStr, projectId, topK]
    )
    
    return result.rows.map((row: any) => ({
      score: row.score || 0,
      record: {
        id: row.id,
        projectId: row.projectId,
        text: row.text,
        vector: [], // Will be loaded if needed
        metadata: row.metadata,
        createdAt: row.createdAt
      } as MemoryRecord
    }))
  } catch (error: any) {
    // Fallback to simple cosine similarity if pgvector fails
    logger.warn('pgvector search failed, falling back to cosine similarity:', error)
    return searchMemoryCosine(projectId, query, topK)
  }
}

// Fallback: Simple cosine similarity (for compatibility)
export async function searchMemoryCosine(
  projectId: Identifier,
  query: string,
  topK: number = 5
): Promise<Array<{ score: number; record: MemoryRecord }>> {
  try {
    const q = embed(query)
    const all = await prisma.memory.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    })
    
    // Calculate cosine similarity
    const scored = all.map((r) => {
      const vector = (r.metadata as any)?.vector || []
      const score = cosine(q, vector)
      return {
        score,
        record: {
          id: r.id,
          projectId: r.projectId,
          text: r.text,
          vector,
          metadata: r.metadata,
          createdAt: r.createdAt.toISOString()
        } as MemoryRecord
      }
    })
    
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, topK)
  } catch (error: any) {
    logger.error('Failed to search memory:', error)
    return []
  }
}

// Cosine similarity function
function cosine(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0
  let s = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    s += a[i] * b[i]
  }
  return s
}

// Add memory with vector embedding
export async function addMemoryWithVector(
  projectId: Identifier,
  text: string,
  metadata?: Record<string, unknown>
): Promise<MemoryRecord> {
  try {
    const vector = embed(text)
    const rec: MemoryRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectId,
      text,
      vector,
      metadata,
      createdAt: new Date().toISOString()
    }
    
    // Store in database
    // Note: When pgvector is fully set up, store vector directly
    // For now, store in metadata
    await prisma.memory.create({
      data: {
        id: rec.id,
        projectId: rec.projectId,
        text: rec.text,
        metadata: {
          ...(metadata || {}),
          vector: vector // Temporary storage in metadata
        },
        createdAt: new Date(rec.createdAt)
      }
    })
    
    logger.info(`Added memory record: ${rec.id}`)
    return rec
  } catch (error: any) {
    logger.error('Failed to add memory:', error)
    throw error
  }
}

// Export searchMemory with automatic vector search
export async function searchMemory(
  projectId: Identifier,
  query: string,
  topK: number = 5
): Promise<Array<{ score: number; record: MemoryRecord }>> {
  // Try pgvector first, fallback to cosine
  try {
    return await searchMemoryVector(projectId, query, topK)
  } catch (error) {
    return await searchMemoryCosine(projectId, query, topK)
  }
}

