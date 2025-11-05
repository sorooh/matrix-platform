declare const fetch: any

export interface VectorProvider {
  name: string
  embed(text: string): number[] | Promise<number[]>
}

// Default hashed bag-of-words provider (deterministic, no external deps)
function tokenize(t: string): string[] {
  return (t || '').toLowerCase().split(/[^a-z0-9_]+/i).filter(Boolean)
}

const DEFAULT_DIM = 256

function hashToken(token: string): number {
  let h = 2166136261
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i)
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)
  }
  return Math.abs(h) % DEFAULT_DIM
}

export const defaultVectorProvider: VectorProvider = {
  name: 'hashed-bow',
  embed(text: string): number[] {
    const vec = new Array<number>(DEFAULT_DIM).fill(0)
    const toks = tokenize(text)
    if (toks.length === 0) return vec
    for (const t of toks) {
      const idx = hashToken(t)
      vec[idx] += 1
    }
    let norm = 0
    for (let i = 0; i < DEFAULT_DIM; i++) norm += vec[i] * vec[i]
    norm = Math.sqrt(norm) || 1
    for (let i = 0; i < DEFAULT_DIM; i++) vec[i] /= norm
    return vec
  }
}

// Optional HTTP provider (POST { text } -> { vector: number[] })
function makeHttpProvider(url: string): VectorProvider {
  return {
    name: 'http',
    async embed(text: string): Promise<number[]> {
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) })
        const j = await r.json()
        if (Array.isArray(j?.vector)) return j.vector
      } catch {}
      return defaultVectorProvider.embed(text)
    }
  }
}

let currentProvider: VectorProvider = defaultVectorProvider

// Auto-select via env
try {
  const name = process.env.VECTOR_PROVIDER || ''
  if (name.toLowerCase() === 'http' && process.env.VECTOR_HTTP_URL) {
    currentProvider = makeHttpProvider(process.env.VECTOR_HTTP_URL)
  }
} catch {}

export function registerVectorProvider(vp: VectorProvider) {
  currentProvider = vp || defaultVectorProvider
}

export function getVectorProvider(): VectorProvider {
  return currentProvider
}


