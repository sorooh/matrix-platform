type CacheEntry = { value: any; expiresAt: number }

const store = new Map<string, CacheEntry>()

export function getCache<T = any>(key: string): T | undefined {
  const e = store.get(key)
  if (!e) return undefined
  if (Date.now() > e.expiresAt) { store.delete(key); return undefined }
  return e.value as T
}

export function setCache<T = any>(key: string, value: T, ttlMs: number) {
  store.set(key, { value, expiresAt: Date.now() + Math.max(1, ttlMs) })
}

export async function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = getCache<T>(key)
  if (hit !== undefined) return hit
  const v = await fn()
  setCache(key, v, ttlMs)
  return v
}


