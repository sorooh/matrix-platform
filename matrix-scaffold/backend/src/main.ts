import Fastify from 'fastify'
import cors from 'fastify-cors'
import { readFileSync, readdirSync, existsSync, createReadStream } from 'fs'
import { join } from 'path'
import { nanoid } from 'nanoid'

const server = Fastify({ logger: true })
server.register(cors)

type Job = {
  id: string
  app: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: string
  result?: { previewUrl?: string }
}

const apps = JSON.parse(readFileSync(join(__dirname, 'apps.json'), 'utf8'))
const jobs = new Map<string, Job>()

// Simple SSE clients list
const sseClients: Array<{ id: string; res: any }> = []

function broadcastEvent(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const c of sseClients) {
    try {
      c.res.write(payload)
    } catch (err) {
      // ignore write errors
    }
  }
}

server.get('/api/apps', async () => apps)

server.post('/api/run', async (request, reply) => {
  const body = request.body as any
  const app = body?.app
  if (!app) return reply.status(400).send({ error: 'app required' })

  const id = nanoid()
  const job: Job = { id, app, status: 'pending', createdAt: new Date().toISOString() }
  jobs.set(id, job)

  // simulate runner
  broadcastEvent('job.created', { id, app })
  setTimeout(() => {
    const running = { ...job, status: 'running' } as Job
    jobs.set(id, running)
    broadcastEvent('job.running', { id, app })
    // after a short delay mark completed with preview URL
    setTimeout(() => {
      const previewUrl = `/apps/${app}`
      const completed: Job = { ...running, status: 'completed', result: { previewUrl } }
      jobs.set(id, completed)
      server.log.info({ msg: 'job completed', id })
      broadcastEvent('job.completed', { id, app, previewUrl })
    }, 1200)
  }, 400)

  return reply.status(202).send({ id, status: job.status })
})

server.get('/api/jobs/:id', async (request, reply) => {
  const id = (request.params as any).id
  const job = jobs.get(id)
  if (!job) return reply.status(404).send({ error: 'not found' })
  return job
})

import { enqueueSnapshot, getSnapshot } from './snapshots'

server.post('/api/snapshot/:app', async (request, reply) => {
  const app = (request.params as any).app
  if (!app) return reply.status(400).send({ error: 'app required' })
  try {
    const id = await enqueueSnapshot(app)
    return reply.status(202).send({ id })
  } catch (err) {
    return reply.status(500).send({ error: String(err) })
  }
})

server.get('/api/snapshots/:id', async (request, reply) => {
  const id = (request.params as any).id
  const meta = getSnapshot(id)
  if (!meta) return reply.status(404).send({ error: 'not found' })
  return meta
})

// list snapshots, optional query ?app=slug
server.get('/api/snapshots', async (request, reply) => {
  const app = (request.query as any)?.app
  const metaDir = join(__dirname, '..', '..', 'storage', 'meta')
  if (!existsSync(metaDir)) return []
  const files = readdirSync(metaDir).filter((f) => f.endsWith('.json'))
  const metas = files.map((f) => {
    try {
      const raw = readFileSync(join(metaDir, f), 'utf8')
      return JSON.parse(raw)
    } catch (e) {
      return null
    }
  }).filter(Boolean)
  if (app) return metas.filter((m: any) => m.app === app)
  return metas
})

// serve storage files (png/html)
server.get('/storage/:id/:filename', async (request, reply) => {
  const { id, filename } = request.params as any
  const S3_BUCKET = process.env.SNAPSHOT_S3_BUCKET || process.env.S3_BUCKET || ''
  // if S3 configured, return redirect to stored url in meta
  if (S3_BUCKET) {
    const meta = getSnapshot(id)
    if (!meta) return reply.status(404).send({ error: 'not found' })
    const lower = filename.toLowerCase()
    let url: string | undefined
    if (lower.endsWith('.html')) url = meta.htmlUrl
    else if (lower.includes('thumb')) url = meta.thumbUrl || meta.pngUrl
    else url = meta.pngUrl
    if (!url) return reply.status(404).send({ error: 'not available' })
    return reply.redirect(url)
  }

  const p = join(__dirname, '..', '..', 'storage', id, filename)
  if (!existsSync(p)) return reply.status(404).send({ error: 'not found' })
  const stream = createReadStream(p)
  const ext = (filename.split('.').pop() || '').toLowerCase()
  if (ext === 'png') reply.header('Content-Type', 'image/png')
  else if (ext === 'jpg' || ext === 'jpeg') reply.header('Content-Type', 'image/jpeg')
  else if (ext === 'html') reply.header('Content-Type', 'text/html; charset=utf-8')
  else reply.header('Content-Type', 'application/octet-stream')
  return reply.send(stream)
})

server.get('/apps/:slug', async (request, reply) => {
  const slug = (request.params as any).slug
  // simple HTML preview
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${slug} preview</title></head><body><h1>${slug} — Preview</h1><p>This is a simulated running app for <strong>${slug}</strong>.</p><button onclick="fetch('/api/poke/${slug}',{method:'POST'})">Poke</button></body></html>`
  reply.type('text/html').send(html)
})

server.post('/api/poke/:slug', async (request, reply) => {
  return { ok: true }
})

// Simulated agents chat endpoint
server.post('/api/agents/chat', async (request, reply) => {
  const body = request.body as any
  const msg = body?.message || ''
  // simple deterministic reply for simulation
  const replyText = `Simulated agent reply to: "${msg.substring(0, 200)}"`
  return { reply: replyText }
})

const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' })
    console.log('Backend listening on http://localhost:3000')
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
