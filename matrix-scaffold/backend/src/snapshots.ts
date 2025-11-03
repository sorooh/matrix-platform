import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

type SnapshotMeta = {
  id: string
  app: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  pngPath?: string
  htmlPath?: string
  thumbPath?: string
  // optional URLs when artifacts are uploaded to S3 or remote storage
  pngUrl?: string
  htmlUrl?: string
  thumbUrl?: string
  error?: string
}

function baseStorageDir() {
  const dir = join(__dirname, '..', '..', 'storage')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function metaDir() {
  const d = join(baseStorageDir(), 'meta')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

function queueDir() {
  const d = join(baseStorageDir(), 'queue')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

export async function enqueueSnapshot(app: string) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
  const meta: SnapshotMeta = { id, app, status: 'pending', createdAt: new Date().toISOString() }
  const metaPath = join(metaDir(), `${id}.json`)
  writeFileSync(metaPath, JSON.stringify(meta), 'utf8')

  const qPath = join(queueDir(), `${id}.json`)
  writeFileSync(qPath, JSON.stringify({ id, app }), 'utf8')
  return id
}

export function getSnapshot(id: string): SnapshotMeta | null {
  const metaPath = join(metaDir(), `${id}.json`)
  if (!existsSync(metaPath)) return null
  const raw = readFileSync(metaPath, 'utf8')
  try {
    return JSON.parse(raw) as SnapshotMeta
  } catch (e) {
    return null
  }
}
