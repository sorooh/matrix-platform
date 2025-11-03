import { MemoryRecord, Identifier } from './schema'
import { db } from './storage'

// Simple hashed-bag-of-words embedding for phase 0 (replace later with real embeddings)
const DIM = 256

function tokenize(t: string): string[] {
  return (t || '').toLowerCase().split(/[^a-z0-9_]+/i).filter(Boolean)
}

function hashToken(token: string): number {
  let h = 2166136261
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i)
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)
  }
  return Math.abs(h) % DIM
}

export function embed(text: string): number[] {
  const vec = new Array<number>(DIM).fill(0)
  const toks = tokenize(text)
  if (toks.length === 0) return vec
  for (const t of toks) {
    const idx = hashToken(t)
    vec[idx] += 1
  }
  // L2 normalize
  let norm = 0
  for (let i = 0; i < DIM; i++) norm += vec[i] * vec[i]
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < DIM; i++) vec[i] /= norm
  return vec
}

export function cosine(a: number[], b: number[]): number {
  let s = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) s += a[i] * b[i]
  return s
}

export function addMemory(projectId: Identifier, text: string, metadata?: Record<string, unknown>): MemoryRecord {
  const vector = embed(text)
  const rec: MemoryRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId,
    text,
    vector,
    metadata,
    createdAt: new Date().toISOString()
  }
  db.addMemory(rec)
  return rec
}

export function searchMemory(projectId: Identifier, query: string, topK = 5): Array<{ score: number; record: MemoryRecord }> {
  const q = embed(query)
  const all = db.listMemory(projectId)
  const scored = all.map((r) => ({ score: cosine(q, r.vector), record: r }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}


