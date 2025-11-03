import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import puppeteer from 'puppeteer'

type SnapshotMeta = {
  id: string
  app: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  pngPath?: string
  htmlPath?: string
  error?: string
}

const store = new Map<string, SnapshotMeta>()

function storageDir() {
  const dir = join(__dirname, '..', '..', 'storage')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export async function enqueueSnapshot(app: string) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
  const meta: SnapshotMeta = { id, app, status: 'pending', createdAt: new Date().toISOString() }
  store.set(id, meta)

  // process in background
  process.nextTick(() => processSnapshot(id).catch((e) => {
    const m = store.get(id)
    if (m) { m.status = 'failed'; m.error = String(e); store.set(id, m) }
  }))

  return id
}

export function getSnapshot(id: string) {
  return store.get(id)
}

async function processSnapshot(id: string) {
  const meta = store.get(id)
  if (!meta) throw new Error('not found')
  meta.status = 'processing'
  store.set(id, meta)

  const outDir = join(storageDir(), id)
  mkdirSync(outDir, { recursive: true })
  const pngPath = join(outDir, 'preview.png')
  const htmlPath = join(outDir, 'preview.html')

  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    const url = `http://localhost:3000/apps/${meta.app}`
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 })
    await page.screenshot({ path: pngPath, fullPage: true })
    const html = await page.content()
    writeFileSync(htmlPath, html, 'utf8')
    await browser.close()

    meta.status = 'completed'
    meta.pngPath = pngPath
    meta.htmlPath = htmlPath
    store.set(id, meta)
  } catch (err) {
    meta.status = 'failed'
    meta.error = String(err)
    store.set(id, meta)
    throw err
  }
}
