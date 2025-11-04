/**
 * Org Memory System - Updated with Async Support
 * Global-Ready Architecture
 */

import { addMemory, addMemoryUnique, searchMemory } from './memory'
import { db } from './storage'
import { logger } from '../config/logger'

export const ORG_ID = '__org__'

export async function addOrgMemory(text: string, metadata?: Record<string, unknown>) {
  try {
    return await addMemoryUnique(ORG_ID, text, { scope: 'org', ...metadata })
  } catch (error) {
    logger.error('Failed to add org memory:', error)
    throw error
  }
}

export async function searchOrgMemory(query: string, topK = 5) {
  try {
    return await searchMemory(ORG_ID, query, topK)
  } catch (error) {
    logger.error('Failed to search org memory:', error)
    return []
  }
}

export async function compactOrgMemory(maxPerKind = 200, maxTotal = 2000) {
  try {
    const all = await db.listMemory(ORG_ID)
    const byKind: Record<string, any[]> = {}
    for (const m of all) {
      const kind = (m.metadata as any)?.kind || (m.metadata as any)?.source || 'generic'
      byKind[kind] = byKind[kind] || []
      byKind[kind].push(m)
    }
    const kept: any[] = []
    for (const k of Object.keys(byKind)) {
      const arr = byKind[k].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      const seen = new Set<string>()
      for (const m of arr) {
        const h = (m.metadata as any)?.hash || m.text
        if (seen.has(h)) continue
        seen.add(h)
        kept.push(m)
        if (kept.length >= maxTotal) break
        if (Array.from(seen).length >= maxPerKind) break
      }
      if (kept.length >= maxTotal) break
    }
    // Merge with non-kind items if any
    kept.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    // Replace table naively by writing only kept items for org + other project items untouched
    const restProjects = (await db.listMemory()).filter((m: any) => m.projectId !== ORG_ID)
    const merged = kept.concat(restProjects)
    try {
      await (db as any).replaceAllMemory(merged)
    } catch (error) {
      logger.warn('Failed to replace all memory:', error)
    }
    return { kept: kept.length }
  } catch (error) {
    logger.error('Failed to compact org memory:', error)
    return { kept: 0 }
  }
}


