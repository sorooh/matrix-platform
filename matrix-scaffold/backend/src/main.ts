import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { readFileSync, readdirSync, existsSync, createReadStream } from 'fs'
import { join } from 'path'
import { nanoid } from 'nanoid'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Import authentication modules
import { 
  authenticateToken, 
  requireRole, 
  optionalAuth, 
  rateLimitByUser, 
  securityHeaders,
  UserRole
} from './auth/middleware.js'
import { registerAuthRoutes } from './auth/routes.js'

const server = Fastify({ 
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV !== 'production'
  }
})

// Register plugins
await server.register(cors, {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173'],
  credentials: true
})

await server.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'matrix-platform-cookie-secret',
  parseOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
})

await server.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
})

await server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: function (request, context) {
    return {
      code: 429,
      error: 'Rate limit exceeded',
      message: `Too many requests, retry after ${Math.round(context.ttl / 1000)} seconds`
    }
  }
})

// Add authentication decorators
server.decorate('authenticate', authenticateToken)
server.decorate('requireRole', requireRole)
server.decorate('optionalAuth', optionalAuth)
server.decorate('rateLimitByUser', rateLimitByUser)

// Add security headers to all routes
server.addHook('onRequest', securityHeaders)

// Add user info to request logs
server.addHook('onRequest', async (request) => {
  if (request.user) {
    request.log = request.log.child({
      userId: request.user.userId,
      userRole: request.user.role
    })
  }
})

// Register authentication routes
await registerAuthRoutes(server)

type Job = {
  id: string
  app: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: string
  result?: { previewUrl?: string }
  userId?: string
}

const apps = JSON.parse(readFileSync(join(__dirname, 'apps.json'), 'utf8'))
const jobs = new Map<string, Job>()

// Simple SSE clients list
const sseClients: Array<{ id: string; res: any; userId?: string }> = []

function broadcastEvent(event: string, data: any, targetUserId?: string) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  
  for (const client of sseClients) {
    // If targetUserId specified, only send to that user
    if (targetUserId && client.userId !== targetUserId) continue
    
    try {
      client.res.write(payload)
    } catch (err) {
      // Remove failed client
      const index = sseClients.indexOf(client)
      if (index > -1) sseClients.splice(index, 1)
    }
  }
}

// Protected apps endpoint - requires authentication
server.get('/api/apps', {
  preHandler: [server.authenticate]
}, async (request) => {
  request.log.info('User fetched apps list')
  return apps
})

// Public apps endpoint (limited info)
server.get('/api/apps/public', async () => {
  return apps.map((app: any) => ({
    id: app.id,
    name: app.name,
    description: app.description,
    category: app.category
  }))
})

// Protected run endpoint
server.post('/api/run', {
  preHandler: [server.authenticate, server.rateLimitByUser(10, 5)] // 10 runs per 5 minutes
}, async (request, reply) => {
  const body = request.body as any
  const app = body?.app
  const userId = request.user!.userId
  
  if (!app) return reply.status(400).send({ error: 'app required' })

  const id = nanoid()
  const job: Job = { 
    id, 
    app, 
    status: 'pending', 
    createdAt: new Date().toISOString(),
    userId 
  }
  jobs.set(id, job)

  request.log.info({ app, jobId: id }, 'User started job')

  // Simulate runner
  broadcastEvent('job.created', { id, app }, userId)
  
  setTimeout(() => {
    const running = { ...job, status: 'running' } as Job
    jobs.set(id, running)
    broadcastEvent('job.running', { id, app }, userId)
    
    setTimeout(() => {
      const previewUrl = `/apps/${app}`
      const completed: Job = { ...running, status: 'completed', result: { previewUrl } }
      jobs.set(id, completed)
      request.log.info({ jobId: id }, 'Job completed')
      broadcastEvent('job.completed', { id, app, previewUrl }, userId)
    }, 1200)
  }, 400)

  return reply.status(202).send({ id, status: job.status })
})

// Job status endpoint - users can only see their own jobs
server.get('/api/jobs/:id', {
  preHandler: [server.authenticate]
}, async (request, reply) => {
  const id = (request.params as any).id
  const job = jobs.get(id)
  const userId = request.user!.userId
  
  if (!job) return reply.status(404).send({ error: 'Job not found' })
  
  // Users can only see their own jobs (except admins)
  if (job.userId !== userId && request.user!.role !== UserRole.ADMIN && request.user!.role !== UserRole.SUPER_ADMIN) {
    return reply.status(403).send({ error: 'Access denied' })
  }
  
  return job
})

// Admin endpoint to view all jobs
server.get('/api/admin/jobs', {
  preHandler: [server.authenticate, server.requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN])]
}, async () => {
  return Array.from(jobs.values())
})

import { enqueueSnapshot, getSnapshot } from './snapshots'

// Protected snapshot endpoints
server.post('/api/snapshot/:app', {
  preHandler: [server.authenticate, server.rateLimitByUser(5, 10)] // 5 snapshots per 10 minutes
}, async (request, reply) => {
  const app = (request.params as any).app
  const userId = request.user!.userId
  
  if (!app) return reply.status(400).send({ error: 'app required' })
  
  try {
    const id = await enqueueSnapshot(app)
    request.log.info({ app, snapshotId: id }, 'User created snapshot')
    return reply.status(202).send({ id })
  } catch (err) {
    request.log.error({ app, error: err }, 'Snapshot creation failed')
    return reply.status(500).send({ error: String(err) })
  }
})

server.get('/api/snapshots/:id', {
  preHandler: [server.authenticate]
}, async (request, reply) => {
  const id = (request.params as any).id
  const meta = getSnapshot(id)
  if (!meta) return reply.status(404).send({ error: 'Snapshot not found' })
  return meta
})

// List snapshots with optional app filter
server.get('/api/snapshots', {
  preHandler: [server.authenticate]
}, async (request, reply) => {
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

// Health check (public)
server.get('/health', async () => {
  return { 
    status: 'ok', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0'
  }
})

// Protected metrics endpoint
server.get('/metrics', {
  preHandler: [server.authenticate, server.requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN])]
}, async (request, reply) => {
  try {
    const metaDir = join(__dirname, '..', '..', 'storage', 'meta')
    let snapshotsCount = 0
    if (existsSync(metaDir)) {
      const files = readdirSync(metaDir).filter((f) => f.endsWith('.json'))
      snapshotsCount = files.length
    }
    
    const jobCount = jobs.size
    const activeConnections = sseClients.length
    
    return { 
      uptime: process.uptime(),
      jobs: jobCount,
      snapshots: snapshotsCount,
      activeConnections,
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage()
    }
  } catch (e) {
    reply.code(500)
    return { error: String(e) }
  }
})

// Storage files endpoint with authentication
server.get('/storage/:id/:filename', {
  preHandler: [server.authenticate]
}, async (request, reply) => {
  const { id, filename } = request.params as any
  const S3_BUCKET = process.env.SNAPSHOT_S3_BUCKET || process.env.S3_BUCKET || ''
  
  // If S3 configured, return redirect to stored url in meta
  if (S3_BUCKET) {
    const meta = getSnapshot(id)
    if (!meta) return reply.status(404).send({ error: 'File not found' })
    
    const lower = filename.toLowerCase()
    let url: string | undefined
    if (lower.endsWith('.html')) url = meta.htmlUrl
    else if (lower.includes('thumb')) url = meta.thumbUrl || meta.pngUrl
    else url = meta.pngUrl
    
    if (!url) return reply.status(404).send({ error: 'File not available' })
    return reply.redirect(url)
  }

  const p = join(__dirname, '..', '..', 'storage', id, filename)
  if (!existsSync(p)) return reply.status(404).send({ error: 'File not found' })
  
  const stream = createReadStream(p)
  const ext = (filename.split('.').pop() || '').toLowerCase()
  
  if (ext === 'png') reply.header('Content-Type', 'image/png')
  else if (ext === 'jpg' || ext === 'jpeg') reply.header('Content-Type', 'image/jpeg')
  else if (ext === 'html') reply.header('Content-Type', 'text/html; charset=utf-8')
  else reply.header('Content-Type', 'application/octet-stream')
  
  return reply.send(stream)
})

// App preview endpoint (public but with optional user context)
server.get('/apps/:slug', {
  preHandler: [server.optionalAuth]
}, async (request, reply) => {
  const slug = (request.params as any).slug
  const userInfo = request.user ? `Hello ${request.user.email}` : 'Guest user'
  
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${slug} preview</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
    .user-info { background: #f5f5f5; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
    button { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
    button:hover { background: #0056b3; }
  </style>
</head>
<body>
  <div class="user-info">${userInfo}</div>
  <h1>${slug} — Preview</h1>
  <p>This is a simulated running app for <strong>${slug}</strong>.</p>
  <button onclick="fetch('/api/poke/${slug}',{method:'POST'})">Poke</button>
</body>
</html>`
  
  reply.type('text/html').send(html)
})

server.post('/api/poke/:slug', {
  preHandler: [server.optionalAuth]
}, async (request, reply) => {
  const userContext = request.user ? request.user.email : 'anonymous'
  request.log.info({ slug: (request.params as any).slug, user: userContext }, 'App poked')
  return { ok: true, user: userContext }
})

// Protected agents chat endpoint
server.post('/api/agents/chat', {
  preHandler: [server.authenticate, server.rateLimitByUser(20, 5)] // 20 messages per 5 minutes
}, async (request, reply) => {
  const body = request.body as any
  const msg = body?.message || ''
  const userId = request.user!.userId
  
  request.log.info({ messageLength: msg.length }, 'User sent chat message')
  
  // Enhanced simulated reply with user context
  const replyText = `Hello ${request.user!.email}! Simulated agent reply to: "${msg.substring(0, 200)}${msg.length > 200 ? '...' : ''}"`
  
  return { 
    reply: replyText,
    timestamp: new Date().toISOString(),
    userId 
  }
})

// SSE endpoint for real-time updates (authenticated)
server.get('/api/events', {
  preHandler: [server.authenticate]
}, async (request, reply) => {
  const clientId = nanoid()
  const userId = request.user!.userId
  
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  })

  const client = { id: clientId, res: reply.raw, userId }
  sseClients.push(client)

  // Send initial connection event
  reply.raw.write(`event: connected\ndata: ${JSON.stringify({ clientId, userId })}\n\n`)

  // Cleanup on disconnect
  request.socket.on('close', () => {
    const index = sseClients.indexOf(client)
    if (index > -1) sseClients.splice(index, 1)
    request.log.info({ clientId }, 'SSE client disconnected')
  })

  request.log.info({ clientId, userId }, 'SSE client connected')
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully')
  await server.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully')
  await server.close()
  process.exit(0)
})

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000')
    const host = process.env.HOST || '0.0.0.0'
    
    await server.listen({ port, host })
    console.log(`🚀 Matrix Platform Backend running on http://${host}:${port}`)
    console.log(`📚 API Documentation: http://${host}:${port}/docs`)
    console.log(`🔐 Default Admin: admin@matrix-platform.com / admin123!`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()

// Export for testing
export default server