import Fastify from 'fastify'
import cors from '@fastify/cors'
import { readFileSync, readdirSync, existsSync, createReadStream, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { nanoid } from 'nanoid'
import { eventBus } from './core/eventBus'
import { Nicholas } from './core/nicholas'
import { db } from './core/storage'
import { addMemory, searchMemory } from './core/memory'
import { registerLifecycleHooks } from './core/hooks'
import { registerBots } from './bots'
import { tasks } from './core/tasks'
import { graph } from './core/graph'
import { storeProjectSummary } from './core/memoryProvider'
import { searchOrgMemory, compactOrgMemory } from './core/orgMemory'
import { applySuggestions, suggestNext } from './core/planner'
import { syncOrgFromProjects } from './core/orgSync'
import { unifiedQuery, recommendForProject, kpis } from './core/suig'
import { addOrgMemory } from './core/orgMemory'
import { withCache } from './core/cache'
import { MemoryRecord } from './core/schema'
import { db as coreDb } from './core/storage'
import { captureKpisSnapshot, listKpis } from './core/metrics'
import { getHealthStatus } from './core/health'
import { securitySystem } from './enterprise/security'
import { recordHTTPRequest, recordAgentExecution, recordJob, updateMemoryUsage, updateCacheHitRate, updateActiveConnections } from './monitoring/prometheus'
import { advancedCache } from './performance/cache'
import { performanceOptimizer } from './performance/optimizer'
import { loadBalancer } from './scalability/loadBalancer'
import { autoScaler } from './scalability/autoScaler'
import { webhookSystem } from './integrations/webhooks'

// Global-Ready Configuration
import { prisma, enablePgVector, checkDatabaseHealth, disconnectDatabase } from './config/database'
import { redis, checkRedisHealth, disconnectRedis } from './config/redis'
import { logger, logError, logInfo } from './config/logger'
import { captureException, Sentry } from './config/sentry'

// Initialize server with logging
const server = Fastify({
  logger: false, // Use Winston instead
  requestIdLogLabel: 'requestId',
  requestIdHeader: 'x-request-id'
})

// CORS configuration from environment
server.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
})

// Error handler with Sentry
server.setErrorHandler(async (error, request, reply) => {
  logError(error, {
    url: request.url,
    method: request.method,
    requestId: request.id
  })
  captureException(error, {
    url: request.url,
    method: request.method,
    requestId: request.id
  })
  return reply.status(error.statusCode || 500).send({
    error: error.message || 'Internal Server Error',
    requestId: request.id
  })
})

type Job = {
  id: string
  app: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: string
  result?: { previewUrl?: string }
}

const apps = JSON.parse(readFileSync(join(__dirname, 'apps.json'), 'utf8'))
const jobs = new Map<string, Job>()

// Simple SSE clients list (legacy for scaffold). Phase 0 adds centralized eventBus.
const sseClients: Array<{ id: string; res: any }> = []

function broadcastEvent(event: string, data: any) {
  // Publish to centralized bus for new SSE consumers
  eventBus.publish(event, data)
  // Keep legacy direct-writes for existing scaffold clients
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const c of sseClients) {
    try { c.res.write(payload) } catch {}
  }
}

// Phase 0 SSE endpoint
server.get('/events', async (request, reply) => {
  reply.raw.setHeader('Content-Type', 'text/event-stream')
  reply.raw.setHeader('Cache-Control', 'no-cache')
  reply.raw.setHeader('Connection', 'keep-alive')
  reply.raw.flushHeaders?.()
  const client = { id: nanoid(), write: (chunk: string) => reply.raw.write(chunk), close: () => reply.raw.end() }
  const detach = eventBus.attachClient(client)
  request.raw.on('close', () => detach())
})

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
  try {
    const id = (request.params as any).id
    const job = jobs.get(id)
    if (job) return job
    const nj = await db.getJob(id)
    if (nj) return nj
    return reply.status(404).send({ error: 'not found' })
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/jobs/:id' })
    return reply.status(500).send({ error: 'Failed to get job' })
  }
})

// Artifacts API
server.get('/api/artifacts', async (request, reply) => {
  try {
    const jobId = (request.query as any)?.jobId
    return await db.listArtifacts(jobId)
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/artifacts' })
    return reply.status(500).send({ error: 'Failed to list artifacts' })
  }
})

// Phase 0: Projects + Jobs (Nicholas)
server.get('/api/projects', async () => {
  try {
    return await Nicholas.listProjects()
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/projects' })
    return reply.status(500).send({ error: 'Failed to list projects' })
  }
})

server.post('/api/projects', async (request, reply) => {
  try {
    const body = request.body as any
    const name = body?.name
    if (!name) return reply.status(400).send({ error: 'name required' })
    const p = await Nicholas.createProject(name, body?.description)
    return p
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/projects' })
    return reply.status(500).send({ error: 'Failed to create project' })
  }
})

server.post('/api/projects/:id/jobs', async (request, reply) => {
  try {
    const projectId = (request.params as any).id
    const spec = (request.body as any)?.spec
    if (!spec || typeof spec !== 'object') return reply.status(400).send({ error: 'spec required' })
    const j = await Nicholas.scheduleJob(projectId, spec)
    return reply.status(202).send({ id: j.id, status: j.status })
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/projects/:id/jobs' })
    return reply.status(500).send({ error: 'Failed to schedule job' })
  }
})

// Trigger bots pipeline planning manually
server.post('/api/projects/:id/pipeline', async (request, reply) => {
  try {
    const projectId = (request.params as any).id
    await Nicholas.planPipeline(projectId)
    return { ok: true }
  } catch (e: any) {
    logError(e as Error, { context: 'POST /api/projects/:id/pipeline' })
    return reply.status(500).send({ error: String(e) })
  }
})

// Phase 0: Memory
server.post('/api/memory/:projectId', async (request, reply) => {
  try {
    const projectId = (request.params as any).projectId
    const body = request.body as any
    const text = body?.text
    if (!text) return reply.status(400).send({ error: 'text required' })
    const rec = await addMemory(projectId, text, body?.metadata)
    return rec
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/memory/:projectId' })
    return reply.status(500).send({ error: 'Failed to add memory' })
  }
})

server.get('/api/memory/:projectId/search', async (request, reply) => {
  try {
    const projectId = (request.params as any).projectId
    const q = (request.query as any)?.q || ''
    const results = await searchMemory(projectId, q, 5)
    return results
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/memory/:projectId/search' })
    return reply.status(500).send({ error: 'Failed to search memory' })
  }
})

// Tasks API (for monitoring Bots v1 progress)
server.get('/api/tasks', async (request, reply) => {
  const projectId = (request.query as any)?.projectId
  return tasks.list(projectId)
})

// Graph API (neighbors of a node)
server.get('/api/graph/neighbors', async (request, reply) => {
  try {
    const q = (request.query as any)
    const type = q?.type
    const id = q?.id
    if (!type || !id) return reply.status(400).send({ error: 'type and id required' })
    return await graph.neighbors(type, id)
  } catch (e: any) {
    logError(e as Error, { context: 'GET /api/graph/neighbors' })
    return reply.status(500).send({ error: String(e) })
  }
})

// Org graph summary and edges export
server.get('/api/org/graph/summary', async () => {
  try {
    return await graph.summary()
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/org/graph/summary' })
    return { totalEdges: 0, byRelation: {}, nodesByType: {} }
  }
})

server.get('/api/org/graph/edges', async () => {
  try {
    return await graph.all()
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/org/graph/edges' })
    return []
  }
})

// Project summary API
server.get('/api/summary', async (request, reply) => {
  try {
    const q = (request.query as any)
    let projectId = q?.projectId
    if (!projectId) {
      const ps = await db.listProjects()
      if (!ps || ps.length === 0) return []
      ps.sort((a: any, b: any) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      projectId = ps[0].id
    }
    try {
      const summary = await storeProjectSummary(projectId)
      // attach SUIG recs for practical consumption
      try {
        const recs = await recommendForProject(projectId, 3)
        ;(summary as any).recs = recs
        // add a brief note into org memory
        const lines = (recs.similarProjects || []).map((r: any) => `${r.projectId}:${(r.score || 0).toFixed(3)}`).join(', ')
        if (lines) await addOrgMemory(`SUIG recs for ${projectId}: ${lines}`, { kind: 'suig-recs' })
      } catch (error) {
        logger.warn('Failed to get recommendations:', error)
      }
      return summary
    } catch (e: any) {
      logError(e as Error, { context: 'GET /api/summary' })
      return reply.status(500).send({ error: String(e) })
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/summary' })
    return reply.status(500).send({ error: 'Failed to get summary' })
  }
})

// Org memory search
server.get('/api/org/memory/search', async (request, reply) => {
  try {
    const q = (request.query as any)
    const query = q?.q || ''
    const kind = q?.kind
    const results = await searchOrgMemory(query, 8)
    if (!kind) return results
    return results.filter((r: any) => (r.record?.metadata?.kind === kind || r.record?.metadata?.source === kind))
  } catch (e: any) {
    logError(e as Error, { context: 'GET /api/org/memory/search' })
    return reply.status(500).send({ error: String(e) })
  }
})

// Org summary (simple counts + top hits)
server.get('/api/org/summary', async (request, reply) => {
  try {
    const top = await searchOrgMemory('summary runtime-log', 5)
    return { top }
  } catch (e: any) {
    logError(e as Error, { context: 'GET /api/org/summary' })
    return reply.status(500).send({ error: String(e) })
  }
})

// Org full sync (Graph + Vector)
server.post('/api/org/sync', async (request, reply) => {
  try {
    const res = await syncOrgFromProjects()
    return res
  } catch (e: any) {
    logError(e as Error, { context: 'POST /api/org/sync' })
    return reply.status(500).send({ error: String(e) })
  }
})

// Org compact (dedupe + cap)
server.post('/api/org/compact', async (request, reply) => {
  try {
    const res = await compactOrgMemory()
    return res
  } catch (e: any) {
    logError(e as Error, { context: 'POST /api/org/compact' })
    return reply.status(500).send({ error: String(e) })
  }
})

// SUIG endpoints
server.get('/api/suig/query', async (request, reply) => {
  try {
    const q = (request.query as any)?.q || ''
    const scope = (request.query as any)?.scope
    const projectId = (request.query as any)?.projectId
    const topK = Number((request.query as any)?.topK || 8)
    const key = `suig.query:${q}:${scope || ''}:${projectId || ''}:${topK}`
    return await withCache(key, 5000, async () => unifiedQuery({ q, scope, projectId, topK }))
  } catch (e: any) {
    logError(e as Error, { context: 'GET /api/suig/query' })
    return reply.status(500).send({ error: String(e) })
  }
})

server.get('/api/suig/recs', async (request, reply) => {
  try {
    const projectId = (request.query as any)?.projectId
    const topK = Number((request.query as any)?.topK || 5)
    if (!projectId) return reply.status(400).send({ error: 'projectId required' })
    const key = `suig.recs:${projectId}:${topK}`
    return await withCache(key, 10000, async () => recommendForProject(projectId, topK))
  } catch (e: any) {
    logError(e as Error, { context: 'GET /api/suig/recs' })
    return reply.status(500).send({ error: String(e) })
  }
})

server.get('/api/suig/kpis', async (request, reply) => {
  try {
    return await withCache('suig.kpis', 5000, async () => await kpis())
  } catch (e: any) {
    logError(e as Error, { context: 'GET /api/suig/kpis' })
    return reply.status(500).send({ error: String(e) })
  }
})

// Self-Evolving System API
import { selfEvolvingSystem } from './core/selfEvolving'

server.get('/api/self-evolving/insights', async (request, reply) => {
  try {
    const insights = selfEvolvingSystem.getInsights()
    const lastAnalysis = selfEvolvingSystem.getLastAnalysis()

    return {
      insights,
      lastAnalysis: lastAnalysis?.toISOString() || null,
      count: insights.length
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/self-evolving/insights' })
    return reply.status(500).send({ error: 'Failed to get insights' })
  }
})

server.post('/api/self-evolving/analyze', async (request, reply) => {
  try {
    const insights = await selfEvolvingSystem.analyze()
    return {
      success: true,
      insights,
      count: insights.length
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/self-evolving/analyze' })
    return reply.status(500).send({ error: 'Failed to analyze' })
  }
})

server.post('/api/self-evolving/improve', async (request, reply) => {
  try {
    const { autoImprovement } = await import('./core/selfEvolving')
    const result = await autoImprovement.improve()
    return {
      success: true,
      result
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/self-evolving/improve' })
    return reply.status(500).send({ error: 'Failed to improve' })
  }
})

// Metrics series for Nicholas dashboard
server.get('/api/metrics/series', async (request, reply) => {
  try {
    const limit = Number((request.query as any)?.limit || 100)
    return await listKpis(limit)
  } catch (e: any) {
    logError(e as Error, { context: 'GET /api/metrics/series' })
    return reply.status(500).send({ error: String(e) })
  }
})

// Nicholas endpoints
server.get('/api/nicholas/plan', async (request, reply) => {
  try {
    const q = (request.query as any)
    const projectId = q?.projectId
    if (!projectId) return reply.status(400).send({ error: 'projectId required' })
    const s = await storeProjectSummary(projectId)
    const next = await suggestNext(projectId)
    return { summary: s, suggested: next }
  } catch (e: any) {
    logError(e as Error, { context: 'GET /api/nicholas/plan' })
    return reply.status(500).send({ error: String(e) })
  }
})

server.post('/api/nicholas/bootstrap', async (request, reply) => {
  try {
    const body = request.body as any
    const name = body?.name
    if (!name) return reply.status(400).send({ error: 'name required' })
    const p = await Nicholas.createProject(name)
    // seed context from org memory
    const hits = await searchOrgMemory('summary runtime-log', 5)
    for (const h of hits) {
      try {
        await addMemory(p.id, h.record.text, { seed: true, score: h.score })
      } catch (error) {
        logger.warn('Failed to seed memory:', error)
      }
    }
    // plan initial pipeline
    await Nicholas.planPipeline(p.id)
    return p
  } catch (e: any) {
    logError(e as Error, { context: 'POST /api/nicholas/bootstrap' })
    return reply.status(500).send({ error: String(e) })
  }
})

server.post('/api/nicholas/apply', async (request, reply) => {
  try {
    const body = request.body as any
    const projectId = body?.projectId
    const suggested = body?.suggested as Array<{ type: string; reason?: string }> | undefined
    if (!projectId) return reply.status(400).send({ error: 'projectId required' })
    const list = await applySuggestions(projectId, suggested as any)
    return { enqueued: list }
  } catch (e: any) {
    logError(e as Error, { context: 'POST /api/nicholas/apply' })
    return reply.status(500).send({ error: String(e) })
  }
})

// Project summary API (jobs + tasks + recent memory)
server.get('/api/summary/:projectId', async (request, reply) => {
  try {
    const projectId = (request.params as any).projectId
    const jobsArr = await coreDb.listJobs(projectId)
    const tasksArr = tasks.list(projectId)
    const mem = (await coreDb.listMemory(projectId)) as MemoryRecord[]
    const recentMem = mem.slice(-20).reverse()
    return {
      projectId,
      jobs: jobsArr.slice(-20).reverse(),
      tasks: tasksArr.slice(-50).reverse(),
      memory: recentMem
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/summary/:projectId' })
    return reply.status(500).send({ error: 'Failed to get project summary' })
  }
})

import { enqueueSnapshot, getSnapshot } from './snapshots'
import { readdirSync, existsSync, readFileSync } from 'fs'

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

// Health check
server.get('/health', async () => {
  try {
    return await getHealthStatus()
  } catch (error: any) {
    logError(error as Error, { context: 'GET /health' })
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: { database: false, redis: false, api: false },
      uptime: process.uptime(),
      region: process.env.REGION || 'us-east-1',
      version: process.env.VERSION || '0.1.0'
    }
  }
})

// Simple metrics endpoint (JSON) - deprecated, use /metrics for Prometheus
server.get('/metrics-json', async (request, reply) => {
  try {
    const metaDir = join(__dirname, '..', '..', 'storage', 'meta')
    let snapshotsCount = 0
    if (existsSync(metaDir)) {
      const files = readdirSync(metaDir).filter((f) => f.endsWith('.json'))
      snapshotsCount = files.length
    }
    const jobCount = jobs.size
    return { uptime: process.uptime(), jobs: jobCount, snapshots: snapshotsCount }
  } catch (e) {
    reply.code(500)
    return { error: String(e) }
  }
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

// Real AI Agents API
import { agents, initializeAgents } from './ai/agents'
import { getAIProvider } from './ai/providers'
import { orchestrator } from './ai/orchestrator'
import { agentMemory } from './ai/agentMemory'
import { agentEvaluator } from './ai/evaluator'
import { AgentType } from './ai/agents'

// Initialize AI agents on startup
initializeAgents()

// Agents chat endpoint
server.post('/api/agents/chat', async (request, reply) => {
  try {
    const body = request.body as any
    const msg = body?.message || ''
    const agentName = body?.agent || 'morpheus'
    const projectId = body?.projectId

    if (!msg) {
      return reply.status(400).send({ error: 'message required' })
    }

    const agent = (agents as any)[agentName]
    if (!agent) {
      return reply.status(400).send({ error: `Agent ${agentName} not found` })
    }

    const messages = [
      {
        role: 'user' as const,
        content: msg
      }
    ]

    if (projectId) {
      // Add project context
      try {
        const project = await db.getProject(projectId)
        if (project) {
          messages.unshift({
            role: 'system' as const,
            content: `Project context: ${project.name} - ${project.description || ''}`
          })
        }
      } catch (error) {
        logger.warn('Failed to load project context:', error)
      }
    }

    const response = await agent.chat(messages)
    
    return {
      reply: response.content,
      agent: agentName,
      toolCalls: response.toolCalls
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/agents/chat' })
    return reply.status(500).send({ error: 'Failed to get agent response' })
  }
})

// Agent-specific endpoints
server.post('/api/agents/:agent/analyze', async (request, reply) => {
  try {
    const agentName = (request.params as any).agent
    const body = request.body as any
    const projectId = body?.projectId
    const query = body?.query || ''

    if (!projectId) {
      return reply.status(400).send({ error: 'projectId required' })
    }

    const agent = (agents as any)[agentName]
    if (!agent) {
      return reply.status(400).send({ error: `Agent ${agentName} not found` })
    }

    let result: string
    if (agentName === 'morpheus' && agent.analyzeProject) {
      result = await agent.analyzeProject(projectId, query)
    } else if (agentName === 'architect' && agent.designArchitecture) {
      result = await agent.designArchitecture(projectId, body.requirements || '')
    } else if (agentName === 'sida' && agent.generateCode) {
      result = await agent.generateCode(projectId, body.specification || '')
    } else if (agentName === 'audit' && agent.reviewCode) {
      result = await agent.reviewCode(projectId, body.code || '')
    } else {
      return reply.status(400).send({ error: `Agent ${agentName} does not support this operation` })
    }

    return {
      agent: agentName,
      projectId,
      result
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/agents/:agent/analyze' })
    return reply.status(500).send({ error: 'Failed to execute agent operation' })
  }
})

// Agent Orchestration API
server.post('/api/agents/orchestrate', async (request, reply) => {
  try {
    const body = request.body as any
    const projectId = body?.projectId || ''
    const goal = body?.goal || ''

    if (!projectId) {
      return reply.status(400).send({ error: 'projectId required' })
    }

    if (!goal) {
      return reply.status(400).send({ error: 'goal required' })
    }

    // Create orchestration plan
    const plan = await orchestrator.createPlan(projectId, goal)

    // Execute orchestration
    const context = { projectId }
    const result = await orchestrator.orchestrate(plan, context)

    return {
      success: true,
      result: {
        executions: result.executions.length,
        toolsUsed: result.toolsUsed.length,
        errors: result.errors.length,
        duration: result.duration
      }
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/agents/orchestrate' })
    return reply.status(500).send({ error: 'Failed to orchestrate agents' })
  }
})

// Agent Memory API
server.get('/api/agents/memory', async (request, reply) => {
  try {
    const query = request.query as any
    const projectId = query?.projectId || '__org__'
    const agentType = query?.agentType as AgentType | undefined
    const searchQuery = query?.query || ''
    const limit = Number(query?.limit || 10)

    const memories = await agentMemory.retrieveMemory({
      projectId,
      agentType,
      query: searchQuery,
      limit
    })

    return {
      success: true,
      memories,
      count: memories.length
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/agents/memory' })
    return reply.status(500).send({ error: 'Failed to retrieve agent memory' })
  }
})

server.get('/api/agents/stats', async (request, reply) => {
  try {
    const query = request.query as any
    const projectId = query?.projectId || '__org__'
    const agentType = query?.agentType as AgentType | undefined

    const stats = await agentMemory.getAgentStats(projectId, agentType)

    return {
      success: true,
      stats
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/agents/stats' })
    return reply.status(500).send({ error: 'Failed to get agent stats' })
  }
})

// Agent Evaluation API
server.post('/api/agents/evaluate', async (request, reply) => {
  try {
    const body = request.body as any
    const projectId = body?.projectId || ''

    if (!projectId) {
      return reply.status(400).send({ error: 'projectId required' })
    }

    const report = await agentEvaluator.evaluateAll(projectId)

    return {
      success: true,
      report
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/agents/evaluate' })
    return reply.status(500).send({ error: 'Failed to evaluate agents' })
  }
})

// Enterprise Features API
import { auditLogger } from './enterprise/audit'
import { complianceSystem } from './enterprise/compliance'
import { rbacManager } from './enterprise/rbac'

// Audit Logging API
server.get('/api/audit/logs', async (request, reply) => {
  try {
    const query = request.query as any
    const logs = await auditLogger.query({
      userId: query.userId,
      action: query.action,
      resource: query.resource,
      resourceId: query.resourceId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: Number(query.limit || 100),
      offset: Number(query.offset || 0)
    })

    return {
      success: true,
      logs,
      count: logs.length
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/audit/logs' })
    return reply.status(500).send({ error: 'Failed to get audit logs' })
  }
})

server.get('/api/audit/stats', async (request, reply) => {
  try {
    const query = request.query as any
    const stats = await auditLogger.getStats(
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined
    )

    return {
      success: true,
      stats
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/audit/stats' })
    return reply.status(500).send({ error: 'Failed to get audit stats' })
  }
})

// Compliance API
server.get('/api/compliance/status', async (request, reply) => {
  try {
    const status = complianceSystem.getStatus()
    return {
      success: true,
      status
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/compliance/status' })
    return reply.status(500).send({ error: 'Failed to get compliance status' })
  }
})

server.post('/api/compliance/gdpr/erasure', async (request, reply) => {
  try {
    const body = request.body as any
    const userId = body?.userId

    if (!userId) {
      return reply.status(400).send({ error: 'userId required' })
    }

    const result = await complianceSystem.gdprErasure(userId)
    return {
      success: result.success,
      result
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/compliance/gdpr/erasure' })
    return reply.status(500).send({ error: 'Failed to process GDPR erasure' })
  }
})

server.post('/api/compliance/gdpr/portability', async (request, reply) => {
  try {
    const body = request.body as any
    const userId = body?.userId

    if (!userId) {
      return reply.status(400).send({ error: 'userId required' })
    }

    const result = await complianceSystem.gdprPortability(userId)
    return {
      success: result.success,
      result
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/compliance/gdpr/portability' })
    return reply.status(500).send({ error: 'Failed to process GDPR portability' })
  }
})

server.post('/api/compliance/gdpr/retention', async (request, reply) => {
  try {
    const result = await complianceSystem.gdprRetention()
    return {
      success: result.success,
      result
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/compliance/gdpr/retention' })
    return reply.status(500).send({ error: 'Failed to process GDPR retention' })
  }
})

server.get('/api/compliance/soc2/audit', async (request, reply) => {
  try {
    const result = await complianceSystem.soc2AccessAudit()
    return {
      success: result.success,
      result
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/compliance/soc2/audit' })
    return reply.status(500).send({ error: 'Failed to get SOC2 audit' })
  }
})

server.get('/api/compliance/iso27001/audit', async (request, reply) => {
  try {
    const result = await complianceSystem.iso27001SecurityAudit()
    return {
      success: result.success,
      result
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/compliance/iso27001/audit' })
    return reply.status(500).send({ error: 'Failed to get ISO27001 audit' })
  }
})

// RBAC API
server.post('/api/rbac/users', async (request, reply) => {
  try {
    const body = request.body as any
    const email = body?.email
    const role = body?.role || 'user'
    const projects = body?.projects || []

    if (!email) {
      return reply.status(400).send({ error: 'email required' })
    }

    const result = await rbacManager.createUser(email, role, { projects })
    return {
      success: result.success,
      user: result.user
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/rbac/users' })
    return reply.status(500).send({ error: 'Failed to create user' })
  }
})

server.get('/api/rbac/users', async (request, reply) => {
  try {
    const users = await rbacManager.listUsers()
    return {
      success: true,
      users
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/rbac/users' })
    return reply.status(500).send({ error: 'Failed to list users' })
  }
})

server.get('/api/rbac/users/:userId', async (request, reply) => {
  try {
    const userId = (request.params as any).userId
    const user = await rbacManager.getUser(userId)

    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }

    return {
      success: true,
      user
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/rbac/users/:userId' })
    return reply.status(500).send({ error: 'Failed to get user' })
  }
})

server.put('/api/rbac/users/:userId/role', async (request, reply) => {
  try {
    const userId = (request.params as any).userId
    const body = request.body as any
    const role = body?.role

    if (!role) {
      return reply.status(400).send({ error: 'role required' })
    }

    const result = await rbacManager.updateUserRole(userId, role)
    return {
      success: result.success,
      result
    }
  } catch (error: any) {
    logError(error as Error, { context: 'PUT /api/rbac/users/:userId/role' })
    return reply.status(500).send({ error: 'Failed to update user role' })
  }
})

server.post('/api/rbac/users/:userId/projects/:projectId', async (request, reply) => {
  try {
    const userId = (request.params as any).userId
    const projectId = (request.params as any).projectId

    const result = await rbacManager.assignProject(userId, projectId)
    return {
      success: result.success,
      result
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/rbac/users/:userId/projects/:projectId' })
    return reply.status(500).send({ error: 'Failed to assign project' })
  }
})

server.delete('/api/rbac/users/:userId/projects/:projectId', async (request, reply) => {
  try {
    const userId = (request.params as any).userId
    const projectId = (request.params as any).projectId

    const result = await rbacManager.removeProject(userId, projectId)
    return {
      success: result.success,
      result
    }
  } catch (error: any) {
    logError(error as Error, { context: 'DELETE /api/rbac/users/:userId/projects/:projectId' })
    return reply.status(500).send({ error: 'Failed to remove project' })
  }
})

// Phase 3 - Enterprise-Grade System API
import { securitySystem } from './enterprise/security'
import { getPrometheusMetrics, recordHTTPRequest, recordAgentExecution, recordJob, updateMemoryUsage, updateCacheHitRate, updateActiveConnections } from './monitoring/prometheus'
import { advancedCache } from './performance/cache'
import { performanceOptimizer } from './performance/optimizer'
import { loadBalancer } from './scalability/loadBalancer'
import { autoScaler } from './scalability/autoScaler'
import { webhookSystem } from './integrations/webhooks'
import { apiGateway } from './api/gateway'

// Security API
server.get('/api/security/status', async (request, reply) => {
  try {
    const stats = securitySystem.getSecurityStats()
    return {
      success: true,
      stats
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/security/status' })
    return reply.status(500).send({ error: 'Failed to get security status' })
  }
})

server.post('/api/security/scan', async (request, reply) => {
  try {
    const result = await securitySystem.scanVulnerabilities()
    return {
      success: true,
      result
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/security/scan' })
    return reply.status(500).send({ error: 'Failed to scan vulnerabilities' })
  }
})

server.get('/api/security/report', async (request, reply) => {
  try {
    const report = await securitySystem.generateSecurityReport()
    return {
      success: true,
      report
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/security/report' })
    return reply.status(500).send({ error: 'Failed to generate security report' })
  }
})

server.get('/api/security/events', async (request, reply) => {
  try {
    const query = request.query as any
    const limit = Number(query?.limit || 100)
    const events = securitySystem.getSecurityEvents(limit)
    return {
      success: true,
      events,
      count: events.length
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/security/events' })
    return reply.status(500).send({ error: 'Failed to get security events' })
  }
})

// Monitoring API - Prometheus
// Prometheus metrics endpoint (replaces simple metrics)
server.get('/metrics', async (request, reply) => {
  try {
    const metrics = await getPrometheusMetrics()
    reply.type('text/plain')
    return metrics
  } catch (error: any) {
    logError(error as Error, { context: 'GET /metrics' })
    return reply.status(500).send({ error: 'Failed to get metrics' })
  }
})

// Performance API
server.get('/api/performance/cache/stats', async (request, reply) => {
  try {
    const stats = advancedCache.getStats()
    return {
      success: true,
      stats
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/performance/cache/stats' })
    return reply.status(500).send({ error: 'Failed to get cache stats' })
  }
})

server.post('/api/performance/cache/clear', async (request, reply) => {
  try {
    await advancedCache.clear()
    return {
      success: true,
      message: 'Cache cleared'
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/performance/cache/clear' })
    return reply.status(500).send({ error: 'Failed to clear cache' })
  }
})

server.get('/api/performance/optimizations', async (request, reply) => {
  try {
    const optimizations = await performanceOptimizer.generateOptimizations()
    return {
      success: true,
      optimizations
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/performance/optimizations' })
    return reply.status(500).send({ error: 'Failed to get optimizations' })
  }
})

// Scalability API
server.get('/api/scalability/load-balancer/stats', async (request, reply) => {
  try {
    const stats = loadBalancer.getStats()
    return {
      success: true,
      stats
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/scalability/load-balancer/stats' })
    return reply.status(500).send({ error: 'Failed to get load balancer stats' })
  }
})

server.get('/api/scalability/auto-scaler/stats', async (request, reply) => {
  try {
    const stats = autoScaler.getStats()
    return {
      success: true,
      stats
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/scalability/auto-scaler/stats' })
    return reply.status(500).send({ error: 'Failed to get auto-scaler stats' })
  }
})

server.post('/api/scalability/auto-scaler/evaluate', async (request, reply) => {
  try {
    const decision = await autoScaler.evaluate()
    return {
      success: true,
      decision
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/scalability/auto-scaler/evaluate' })
    return reply.status(500).send({ error: 'Failed to evaluate auto-scaling' })
  }
})

// Webhooks API
server.post('/api/webhooks', async (request, reply) => {
  try {
    const body = request.body as any
    const url = body?.url
    const events = body?.events || []
    const secret = body?.secret
    const retries = body?.retries || 3

    if (!url) {
      return reply.status(400).send({ error: 'url required' })
    }

    if (events.length === 0) {
      return reply.status(400).send({ error: 'events required' })
    }

    const result = await webhookSystem.register(url, events, { secret, retries })
    return {
      success: result.success,
      webhook: result.webhook
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/webhooks' })
    return reply.status(500).send({ error: 'Failed to register webhook' })
  }
})

server.get('/api/webhooks', async (request, reply) => {
  try {
    const query = request.query as any
    const eventType = query?.eventType
    const webhooks = webhookSystem.listWebhooks(eventType)
    return {
      success: true,
      webhooks
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/webhooks' })
    return reply.status(500).send({ error: 'Failed to list webhooks' })
  }
})

server.get('/api/webhooks/:webhookId', async (request, reply) => {
  try {
    const webhookId = (request.params as any).webhookId
    const webhook = webhookSystem.getWebhook(webhookId)

    if (!webhook) {
      return reply.status(404).send({ error: 'Webhook not found' })
    }

    return {
      success: true,
      webhook
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/webhooks/:webhookId' })
    return reply.status(500).send({ error: 'Failed to get webhook' })
  }
})

server.delete('/api/webhooks/:webhookId', async (request, reply) => {
  try {
    const webhookId = (request.params as any).webhookId
    const result = await webhookSystem.unregister(webhookId)
    return {
      success: result.success
    }
  } catch (error: any) {
    logError(error as Error, { context: 'DELETE /api/webhooks/:webhookId' })
    return reply.status(500).send({ error: 'Failed to unregister webhook' })
  }
})

server.get('/api/webhooks/:webhookId/deliveries', async (request, reply) => {
  try {
    const webhookId = (request.params as any).webhookId
    const query = request.query as any
    const limit = Number(query?.limit || 100)
    const deliveries = webhookSystem.getDeliveries(webhookId, limit)
    return {
      success: true,
      deliveries,
      count: deliveries.length
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/webhooks/:webhookId/deliveries' })
    return reply.status(500).send({ error: 'Failed to get webhook deliveries' })
  }
})

// API Gateway API
server.get('/api/gateway/stats', async (request, reply) => {
  try {
    const stats = apiGateway.getStats()
    return {
      success: true,
      stats
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/gateway/stats' })
    return reply.status(500).send({ error: 'Failed to get gateway stats' })
  }
})

// Data Governance API
import { dataGovernance } from './enterprise/governance'
import { enterpriseReporting } from './enterprise/reporting'

server.post('/api/governance/policies', async (request, reply) => {
  try {
    const body = request.body as any
    const name = body?.name
    const description = body?.description || ''
    const rules = body?.rules || []

    if (!name) {
      return reply.status(400).send({ error: 'name required' })
    }

    if (rules.length === 0) {
      return reply.status(400).send({ error: 'rules required' })
    }

    const result = await dataGovernance.createPolicy(name, description, rules)
    return {
      success: result.success,
      policy: result.policy
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/governance/policies' })
    return reply.status(500).send({ error: 'Failed to create policy' })
  }
})

server.get('/api/governance/policies', async (request, reply) => {
  try {
    const policies = dataGovernance.listPolicies()
    return {
      success: true,
      policies
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/governance/policies' })
    return reply.status(500).send({ error: 'Failed to list policies' })
  }
})

server.get('/api/governance/policies/:policyId', async (request, reply) => {
  try {
    const policyId = (request.params as any).policyId
    const policy = dataGovernance.getPolicy(policyId)

    if (!policy) {
      return reply.status(404).send({ error: 'Policy not found' })
    }

    return {
      success: true,
      policy
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/governance/policies/:policyId' })
    return reply.status(500).send({ error: 'Failed to get policy' })
  }
})

server.put('/api/governance/policies/:policyId/toggle', async (request, reply) => {
  try {
    const policyId = (request.params as any).policyId
    const body = request.body as any
    const enabled = body?.enabled !== false

    const result = await dataGovernance.togglePolicy(policyId, enabled)
    return {
      success: result.success,
      result
    }
  } catch (error: any) {
    logError(error as Error, { context: 'PUT /api/governance/policies/:policyId/toggle' })
    return reply.status(500).send({ error: 'Failed to toggle policy' })
  }
})

server.post('/api/governance/enforce/retention', async (request, reply) => {
  try {
    const result = await dataGovernance.enforceRetentionPolicy()
    return {
      success: result.success,
      result
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/governance/enforce/retention' })
    return reply.status(500).send({ error: 'Failed to enforce retention policy' })
  }
})

server.post('/api/governance/enforce/encryption', async (request, reply) => {
  try {
    const result = await dataGovernance.enforceEncryptionPolicy()
    return {
      success: result.success,
      result
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/governance/enforce/encryption' })
    return reply.status(500).send({ error: 'Failed to enforce encryption policy' })
  }
})

server.get('/api/governance/report', async (request, reply) => {
  try {
    const report = await dataGovernance.generateReport()
    return {
      success: true,
      report
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/governance/report' })
    return reply.status(500).send({ error: 'Failed to generate governance report' })
  }
})

// Enterprise Reporting API
server.get('/api/reporting/enterprise', async (request, reply) => {
  try {
    const query = request.query as any
    const startDate = query?.startDate ? new Date(query.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    const endDate = query?.endDate ? new Date(query.endDate) : new Date()

    const report = await enterpriseReporting.generateReport(startDate, endDate)
    return {
      success: true,
      report
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/reporting/enterprise' })
    return reply.status(500).send({ error: 'Failed to generate enterprise report' })
  }
})

server.get('/api/reporting/compliance', async (request, reply) => {
  try {
    const report = await enterpriseReporting.generateComplianceReport()
    return {
      success: true,
      report
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/reporting/compliance' })
    return reply.status(500).send({ error: 'Failed to generate compliance report' })
  }
})

server.get('/api/reporting/security', async (request, reply) => {
  try {
    const report = await enterpriseReporting.generateSecurityReport()
    return {
      success: true,
      report
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/reporting/security' })
    return reply.status(500).send({ error: 'Failed to generate security report' })
  }
})

server.get('/api/reporting/performance', async (request, reply) => {
  try {
    const report = await enterpriseReporting.generatePerformanceReport()
    return {
      success: true,
      report
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/reporting/performance' })
    return reply.status(500).send({ error: 'Failed to generate performance report' })
  }
})

// Data Governance API (already imported above)

// Phase 3 Completion - Advanced AI Capabilities
import { advancedOrchestration } from './ai/advancedOrchestration'

// Phase 3 Completion - Advanced Analytics
import { realTimeDashboard } from './analytics/dashboard'

// Phase 3 Completion - Machine Learning
import { machineLearning } from './ml/learning'

// Phase 3 Completion - Advanced Automation
import { workflowEngine } from './automation/workflow'

// Phase 4: Smart User Accounts
import { smartUserAccounts } from './users/accounts'
import { personalAIMemory } from './users/personalMemory'
import { referralSystem } from './users/referral'
import { notificationSystem } from './users/notifications'
import { billingSystem } from './users/billing'
import { personalCompanionAI } from './users/companion'
import { userAnalyticsSystem } from './users/analytics'

// Phase 5: Ultra-Intelligence & Surooh Neural Integration
import { suroohNeuralEngine } from './neural/engine'
import { nicholasCoreIntegration } from './neural/integration'

// Advanced Multi-Agent Orchestration API
server.post('/api/orchestration/tasks', async (request, reply) => {
  try {
    const body = request.body as any
    const goal = body?.goal
    const agents = body?.agents || []
    const priority = body?.priority || 'medium'

    if (!goal) {
      return reply.status(400).send({ error: 'goal required' })
    }

    if (agents.length === 0) {
      return reply.status(400).send({ error: 'agents required' })
    }

    const result = await advancedOrchestration.createTask(goal, agents, priority)
    return {
      success: result.success,
      task: result.task
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/orchestration/tasks' })
    return reply.status(500).send({ error: 'Failed to create multi-agent task' })
  }
})

server.get('/api/orchestration/tasks', async (request, reply) => {
  try {
    const query = request.query as any
    const limit = Number(query?.limit || 100)
    const tasks = advancedOrchestration.listTasks(limit)
    return {
      success: true,
      tasks
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/orchestration/tasks' })
    return reply.status(500).send({ error: 'Failed to list tasks' })
  }
})

server.get('/api/orchestration/tasks/:taskId', async (request, reply) => {
  try {
    const taskId = (request.params as any).taskId
    const task = advancedOrchestration.getTask(taskId)

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' })
    }

    const collaboration = advancedOrchestration.getCollaboration(taskId)

    return {
      success: true,
      task,
      collaboration
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/orchestration/tasks/:taskId' })
    return reply.status(500).send({ error: 'Failed to get task' })
  }
})

server.get('/api/orchestration/stats', async (request, reply) => {
  try {
    const stats = advancedOrchestration.getStats()
    return {
      success: true,
      stats
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/orchestration/stats' })
    return reply.status(500).send({ error: 'Failed to get orchestration stats' })
  }
})

// Real-Time Analytics Dashboard API
server.get('/api/analytics/dashboard', async (request, reply) => {
  try {
    const dashboard = await realTimeDashboard.generateDashboard()
    return {
      success: true,
      dashboard
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/analytics/dashboard' })
    return reply.status(500).send({ error: 'Failed to generate dashboard' })
  }
})

server.get('/api/analytics/dashboard/snapshot', async (request, reply) => {
  try {
    const snapshot = await realTimeDashboard.getSnapshot()
    return {
      success: true,
      snapshot
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/analytics/dashboard/snapshot' })
    return reply.status(500).send({ error: 'Failed to get dashboard snapshot' })
  }
})

// Machine Learning API
server.post('/api/ml/models/train', async (request, reply) => {
  try {
    const body = request.body as any
    const type = body?.type

    if (!type) {
      return reply.status(400).send({ error: 'type required' })
    }

    const result = await machineLearning.trainModel(type)
    return {
      success: result.success,
      model: result.model
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/ml/models/train' })
    return reply.status(500).send({ error: 'Failed to train model' })
  }
})

server.get('/api/ml/models', async (request, reply) => {
  try {
    const models = machineLearning.listModels()
    return {
      success: true,
      models
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/ml/models' })
    return reply.status(500).send({ error: 'Failed to list models' })
  }
})

server.get('/api/ml/models/:type', async (request, reply) => {
  try {
    const type = (request.params as any).type
    const model = machineLearning.getModel(type)

    if (!model) {
      return reply.status(404).send({ error: 'Model not found' })
    }

    return {
      success: true,
      model
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/ml/models/:type' })
    return reply.status(500).send({ error: 'Failed to get model' })
  }
})

server.post('/api/ml/predict', async (request, reply) => {
  try {
    const body = request.body as any
    const type = body?.type
    const input = body?.input || {}

    if (!type) {
      return reply.status(400).send({ error: 'type required' })
    }

    const result = await machineLearning.predict(type, input)
    return {
      success: result.success,
      prediction: result.prediction,
      confidence: result.confidence
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/ml/predict' })
    return reply.status(500).send({ error: 'Failed to make prediction' })
  }
})

server.get('/api/ml/insights', async (request, reply) => {
  try {
    const insights = await machineLearning.generateInsights()
    return {
      success: true,
      insights
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/ml/insights' })
    return reply.status(500).send({ error: 'Failed to generate insights' })
  }
})

server.get('/api/ml/stats', async (request, reply) => {
  try {
    const stats = machineLearning.getStats()
    return {
      success: true,
      stats
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/ml/stats' })
    return reply.status(500).send({ error: 'Failed to get ML stats' })
  }
})

// Workflow Automation API
server.post('/api/automation/workflows', async (request, reply) => {
  try {
    const body = request.body as any
    const name = body?.name
    const description = body?.description || ''
    const trigger = body?.trigger
    const steps = body?.steps || []

    if (!name) {
      return reply.status(400).send({ error: 'name required' })
    }

    if (!trigger) {
      return reply.status(400).send({ error: 'trigger required' })
    }

    if (steps.length === 0) {
      return reply.status(400).send({ error: 'steps required' })
    }

    const result = await workflowEngine.createWorkflow(name, description, trigger, steps)
    return {
      success: result.success,
      workflow: result.workflow
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/automation/workflows' })
    return reply.status(500).send({ error: 'Failed to create workflow' })
  }
})

server.get('/api/automation/workflows', async (request, reply) => {
  try {
    const workflows = workflowEngine.listWorkflows()
    return {
      success: true,
      workflows
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/automation/workflows' })
    return reply.status(500).send({ error: 'Failed to list workflows' })
  }
})

server.get('/api/automation/workflows/:workflowId', async (request, reply) => {
  try {
    const workflowId = (request.params as any).workflowId
    const workflow = workflowEngine.getWorkflow(workflowId)

    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' })
    }

    return {
      success: true,
      workflow
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/automation/workflows/:workflowId' })
    return reply.status(500).send({ error: 'Failed to get workflow' })
  }
})

server.post('/api/automation/workflows/:workflowId/execute', async (request, reply) => {
  try {
    const workflowId = (request.params as any).workflowId
    const result = await workflowEngine.executeWorkflow(workflowId)
    return {
      success: result.success,
      execution: result.execution
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/automation/workflows/:workflowId/execute' })
    return reply.status(500).send({ error: 'Failed to execute workflow' })
  }
})

server.put('/api/automation/workflows/:workflowId/toggle', async (request, reply) => {
  try {
    const workflowId = (request.params as any).workflowId
    const body = request.body as any
    const enabled = body?.enabled !== false

    const result = await workflowEngine.toggleWorkflow(workflowId, enabled)
    return {
      success: result.success
    }
  } catch (error: any) {
    logError(error as Error, { context: 'PUT /api/automation/workflows/:workflowId/toggle' })
    return reply.status(500).send({ error: 'Failed to toggle workflow' })
  }
})

server.get('/api/automation/executions', async (request, reply) => {
  try {
    const query = request.query as any
    const workflowId = query?.workflowId
    const limit = Number(query?.limit || 100)
    const executions = workflowEngine.listExecutions(workflowId, limit)
    return {
      success: true,
      executions
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/automation/executions' })
    return reply.status(500).send({ error: 'Failed to list executions' })
  }
})

server.get('/api/automation/executions/:executionId', async (request, reply) => {
  try {
    const executionId = (request.params as any).executionId
    const execution = workflowEngine.getExecution(executionId)

    if (!execution) {
      return reply.status(404).send({ error: 'Execution not found' })
    }

    return {
      success: true,
      execution
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/automation/executions/:executionId' })
    return reply.status(500).send({ error: 'Failed to get execution' })
  }
})

// Stream chat endpoint
server.post('/api/agents/chat/stream', async (request, reply) => {
  try {
    const body = request.body as any
    const msg = body?.message || ''
    const agentName = body?.agent || 'morpheus'

    if (!msg) {
      return reply.status(400).send({ error: 'message required' })
    }

    const agent = (agents as any)[agentName]
    if (!agent) {
      return reply.status(400).send({ error: `Agent ${agentName} not found` })
    }

    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')

    const messages = [
      {
        role: 'user' as const,
        content: msg
      }
    ]

    try {
      for await (const chunk of agent.streamChat(messages)) {
        reply.raw.write(`data: ${JSON.stringify({ chunk })}\n\n`)
      }
      reply.raw.write('data: [DONE]\n\n')
      reply.raw.end()
    } catch (error: any) {
      logError(error as Error, { context: 'POST /api/agents/chat/stream' })
      reply.raw.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
      reply.raw.end()
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/agents/chat/stream' })
    return reply.status(500).send({ error: 'Failed to stream agent response' })
  }
})

// Phase 4: Smart User Accounts API
server.post('/api/auth/register', async (request, reply) => {
  try {
    const body = request.body as any
    const email = body?.email
    const password = body?.password
    const name = body?.name

    if (!email || !password) {
      return reply.status(400).send({ error: 'email and password required' })
    }

    const ip = request.headers['x-forwarded-for'] || request.ip
    const userAgent = request.headers['user-agent']
    const referralToken = body?.referralToken

    const result = await smartUserAccounts.register(email, password, name, {
      ip: ip as string,
      userAgent: userAgent as string,
      referralToken,
    })

    if (!result.success) {
      return reply.status(400).send({ error: result.error })
    }

    return {
      success: true,
      user: result.user,
      token: result.token,
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/auth/register' })
    return reply.status(500).send({ error: 'Failed to register user' })
  }
})

server.post('/api/auth/login', async (request, reply) => {
  try {
    const body = request.body as any
    const email = body?.email
    const password = body?.password
    const twoFactorCode = body?.twoFactorCode

    if (!email || !password) {
      return reply.status(400).send({ error: 'email and password required' })
    }

    const ip = request.headers['x-forwarded-for'] || request.ip
    const userAgent = request.headers['user-agent']

    const result = await smartUserAccounts.login(email, password, {
      ip: ip as string,
      userAgent: userAgent as string,
      twoFactorCode,
    })

    if (!result.success) {
      return reply.status(401).send({ error: result.error })
    }

    return {
      success: true,
      user: result.user,
      token: result.token,
      session: result.session,
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/auth/login' })
    return reply.status(500).send({ error: 'Failed to login' })
  }
})

server.post('/api/auth/oauth/:provider', async (request, reply) => {
  try {
    const provider = (request.params as any).provider as 'google' | 'github' | 'microsoft'
    const body = request.body as any
    const code = body?.code

    if (!code) {
      return reply.status(400).send({ error: 'code required' })
    }

    const ip = request.headers['x-forwarded-for'] || request.ip
    const userAgent = request.headers['user-agent']

    const result = await smartUserAccounts.oauthLogin(provider, code, {
      ip: ip as string,
      userAgent: userAgent as string,
    })

    if (!result.success) {
      return reply.status(401).send({ error: result.error })
    }

    return {
      success: true,
      user: result.user,
      token: result.token,
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/auth/oauth/:provider' })
    return reply.status(500).send({ error: 'Failed to login with OAuth' })
  }
})

server.post('/api/auth/verify-email', async (request, reply) => {
  try {
    const body = request.body as any
    const token = body?.token

    if (!token) {
      return reply.status(400).send({ error: 'token required' })
    }

    const result = await smartUserAccounts.verifyEmail(token)

    if (!result.success) {
      return reply.status(400).send({ error: result.error })
    }

    return { success: true }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/auth/verify-email' })
    return reply.status(500).send({ error: 'Failed to verify email' })
  }
})

server.post('/api/auth/logout', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    // Get session ID from token (simplified - in production, store session ID in token)
    const sessionId = `session-${verification.userId}`
    const result = await smartUserAccounts.logout(sessionId)

    return { success: result.success }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/auth/logout' })
    return reply.status(500).send({ error: 'Failed to logout' })
  }
})

server.get('/api/auth/me', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const user = await smartUserAccounts.getUser(verification.userId)

    if (!user) {
      return reply.status(404).send({ error: 'user not found' })
    }

    return { success: true, user }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/auth/me' })
    return reply.status(500).send({ error: 'Failed to get user' })
  }
})

server.put('/api/auth/profile', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const body = request.body as any
    const result = await smartUserAccounts.updateProfile(verification.userId, {
      name: body?.name,
      avatar: body?.avatar,
      preferences: body?.preferences,
    })

    if (!result.success) {
      return reply.status(400).send({ error: result.error })
    }

    return { success: true, user: result.user }
  } catch (error: any) {
    logError(error as Error, { context: 'PUT /api/auth/profile' })
    return reply.status(500).send({ error: 'Failed to update profile' })
  }
})

server.get('/api/auth/activity', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const query = request.query as any
    const limit = parseInt(query?.limit || '50', 10)

    const activities = await smartUserAccounts.getActivityTimeline(verification.userId, limit)

    return { success: true, activities }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/auth/activity' })
    return reply.status(500).send({ error: 'Failed to get activity timeline' })
  }
})

server.get('/api/auth/security-logs', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const query = request.query as any
    const limit = parseInt(query?.limit || '50', 10)

    const logs = await smartUserAccounts.getSecurityLogs(verification.userId, limit)

    return { success: true, logs }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/auth/security-logs' })
    return reply.status(500).send({ error: 'Failed to get security logs' })
  }
})

server.get('/api/auth/sessions', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const sessions = await smartUserAccounts.getSessions(verification.userId)

    return { success: true, sessions }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/auth/sessions' })
    return reply.status(500).send({ error: 'Failed to get sessions' })
  }
})

server.delete('/api/auth/sessions/:sessionId', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const sessionId = (request.params as any).sessionId
    const result = await smartUserAccounts.revokeSession(sessionId)

    return { success: result.success }
  } catch (error: any) {
    logError(error as Error, { context: 'DELETE /api/auth/sessions/:sessionId' })
    return reply.status(500).send({ error: 'Failed to revoke session' })
  }
})

server.post('/api/auth/2fa/enable', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const result = await smartUserAccounts.enable2FA(verification.userId)

    if (!result.success) {
      return reply.status(400).send({ error: result.error })
    }

    return { success: true, secret: result.secret, qrCode: result.qrCode }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/auth/2fa/enable' })
    return reply.status(500).send({ error: 'Failed to enable 2FA' })
  }
})

server.post('/api/auth/2fa/disable', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const result = await smartUserAccounts.disable2FA(verification.userId)

    if (!result.success) {
      return reply.status(400).send({ error: result.error })
    }

    return { success: true }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/auth/2fa/disable' })
    return reply.status(500).send({ error: 'Failed to disable 2FA' })
  }
})

// Phase 4: Personal AI Memory API
server.post('/api/users/memory', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const body = request.body as any
    const text = body?.text
    const metadata = body?.metadata

    if (!text) {
      return reply.status(400).send({ error: 'text required' })
    }

    const result = await personalAIMemory.addMemory(verification.userId, text, metadata)

    if (!result.success) {
      return reply.status(400).send({ error: result.error })
    }

    return { success: true, memory: result.memory }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/users/memory' })
    return reply.status(500).send({ error: 'Failed to add memory' })
  }
})

server.get('/api/users/memory/search', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const query = request.query as any
    const q = query?.q || ''
    const topK = parseInt(query?.topK || '5', 10)

    const results = await personalAIMemory.searchMemory(verification.userId, q, topK)

    return { success: true, results }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/users/memory/search' })
    return reply.status(500).send({ error: 'Failed to search memory' })
  }
})

server.post('/api/users/memory/learn', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const body = request.body as any
    const type = body?.type
    const content = body?.content
    const metadata = body?.metadata

    if (!type || !content) {
      return reply.status(400).send({ error: 'type and content required' })
    }

    const result = await personalAIMemory.learnFromInteraction(verification.userId, {
      type: type as any,
      content,
      metadata,
    })

    if (!result.success) {
      return reply.status(400).send({ error: result.error })
    }

    return { success: true }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/users/memory/learn' })
    return reply.status(500).send({ error: 'Failed to learn from interaction' })
  }
})

server.get('/api/users/memory/suggestions', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const query = request.query as any
    const context = query?.context

    const result = await personalAIMemory.generateSuggestions(verification.userId, context)

    if (!result.success) {
      return reply.status(400).send({ error: result.error })
    }

    return { success: true, suggestions: result.suggestions }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/users/memory/suggestions' })
    return reply.status(500).send({ error: 'Failed to generate suggestions' })
  }
})

server.get('/api/users/memory/stats', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const stats = await personalAIMemory.getMemoryStats(verification.userId)

    return { success: true, stats }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/users/memory/stats' })
    return reply.status(500).send({ error: 'Failed to get memory stats' })
  }
})

server.get('/api/users/memory/timeline', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const query = request.query as any
    const limit = parseInt(query?.limit || '50', 10)

    const timeline = await personalAIMemory.getMemoryTimeline(verification.userId, limit)

    return { success: true, timeline }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/users/memory/timeline' })
    return reply.status(500).send({ error: 'Failed to get memory timeline' })
  }
})

// Phase 4: Referral & Reward System API
server.get('/api/users/referral/token', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const referralToken = await referralSystem.getUserReferralToken(verification.userId)

    if (!referralToken) {
      return reply.status(500).send({ error: 'Failed to generate referral token' })
    }

    return { success: true, token: referralToken }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/users/referral/token' })
    return reply.status(500).send({ error: 'Failed to get referral token' })
  }
})

server.get('/api/users/referral/stats', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const stats = await referralSystem.getReferralStats(verification.userId)

    return { success: true, stats }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/users/referral/stats' })
    return reply.status(500).send({ error: 'Failed to get referral stats' })
  }
})

server.get('/api/users/referral/list', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const query = request.query as any
    const limit = parseInt(query?.limit || '50', 10)

    const referrals = await referralSystem.getReferrals(verification.userId, limit)

    return { success: true, referrals }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/users/referral/list' })
    return reply.status(500).send({ error: 'Failed to get referrals' })
  }
})

server.get('/api/users/points', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return reply.status(401).send({ error: 'token required' })
    }

    const verification = smartUserAccounts.verifyToken(token)
    if (!verification.valid || !verification.userId) {
      return reply.status(401).send({ error: 'invalid token' })
    }

    const points = await referralSystem.getUserPoints(verification.userId)

    if (!points) {
      return reply.status(404).send({ error: 'User points not found' })
    }

    return { success: true, points }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/users/points' })
    return reply.status(500).send({ error: 'Failed to get user points' })
  }
})

// Phase 5: Surooh Neural Engine API
server.get('/api/neural/status', async (request, reply) => {
  try {
    const status = await suroohNeuralEngine.healthCheck()
    const stats = suroohNeuralEngine.getStats()
    const config = suroohNeuralEngine.getConfig()

    return {
      success: true,
      status,
      stats,
      config,
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/neural/status' })
    return reply.status(500).send({ error: 'Failed to get neural engine status' })
  }
})

server.post('/api/neural/generate', async (request, reply) => {
  try {
    const body = request.body as any
    const prompt = body?.prompt
    const maxTokens = body?.maxTokens
    const temperature = body?.temperature
    const systemPrompt = body?.systemPrompt
    const context = body?.context

    if (!prompt) {
      return reply.status(400).send({ error: 'prompt required' })
    }

    const response = await suroohNeuralEngine.generate(prompt, {
      maxTokens,
      temperature,
      systemPrompt,
      context,
    })

    return {
      success: true,
      response,
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/neural/generate' })
    return reply.status(500).send({ error: 'Failed to generate response' })
  }
})

server.post('/api/neural/stream', async (request, reply) => {
  try {
    const body = request.body as any
    const prompt = body?.prompt
    const maxTokens = body?.maxTokens
    const temperature = body?.temperature
    const systemPrompt = body?.systemPrompt
    const context = body?.context

    if (!prompt) {
      return reply.status(400).send({ error: 'prompt required' })
    }

    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.flushHeaders?.()

    try {
      for await (const chunk of suroohNeuralEngine.streamGenerate(prompt, {
        maxTokens,
        temperature,
        systemPrompt,
        context,
      })) {
        reply.raw.write(`data: ${JSON.stringify({ chunk })}\n\n`)
      }
      reply.raw.write('data: [DONE]\n\n')
      reply.raw.end()
    } catch (error: any) {
      logError(error as Error, { context: 'POST /api/neural/stream' })
      reply.raw.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
      reply.raw.end()
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/neural/stream' })
    return reply.status(500).send({ error: 'Failed to stream response' })
  }
})

// Phase 5: Nicholas Core Integration API
server.get('/api/ai/unified/status', async (request, reply) => {
  try {
    const status = await nicholasCoreIntegration.getStatus()

    return {
      success: true,
      status,
    }
  } catch (error: any) {
    logError(error as Error, { context: 'GET /api/ai/unified/status' })
    return reply.status(500).send({ error: 'Failed to get unified AI status' })
  }
})

server.post('/api/ai/unified/generate', async (request, reply) => {
  try {
    const body = request.body as any
    const prompt = body?.prompt
    const maxTokens = body?.maxTokens
    const temperature = body?.temperature
    const systemPrompt = body?.systemPrompt
    const context = body?.context
    const useNeural = body?.useNeural
    const useFallback = body?.useFallback

    if (!prompt) {
      return reply.status(400).send({ error: 'prompt required' })
    }

    const response = await nicholasCoreIntegration.generate(prompt, {
      maxTokens,
      temperature,
      systemPrompt,
      context,
      useNeural,
      useFallback,
    })

    return {
      success: true,
      response,
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/ai/unified/generate' })
    return reply.status(500).send({ error: 'Failed to generate unified response' })
  }
})

server.post('/api/ai/unified/stream', async (request, reply) => {
  try {
    const body = request.body as any
    const prompt = body?.prompt
    const maxTokens = body?.maxTokens
    const temperature = body?.temperature
    const systemPrompt = body?.systemPrompt
    const context = body?.context
    const useNeural = body?.useNeural
    const useFallback = body?.useFallback

    if (!prompt) {
      return reply.status(400).send({ error: 'prompt required' })
    }

    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.flushHeaders?.()

    try {
      for await (const chunk of nicholasCoreIntegration.streamGenerate(prompt, {
        maxTokens,
        temperature,
        systemPrompt,
        context,
        useNeural,
        useFallback,
      })) {
        reply.raw.write(`data: ${JSON.stringify({ chunk: chunk.chunk, source: chunk.source })}\n\n`)
      }
      reply.raw.write('data: [DONE]\n\n')
      reply.raw.end()
    } catch (error: any) {
      logError(error as Error, { context: 'POST /api/ai/unified/stream' })
      reply.raw.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
      reply.raw.end()
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/ai/unified/stream' })
    return reply.status(500).send({ error: 'Failed to stream unified response' })
  }
})

server.post('/api/ai/unified/agent/:agentName', async (request, reply) => {
  try {
    const agentName = (request.params as any).agentName
    const body = request.body as any
    const message = body?.message
    const useNeural = body?.useNeural
    const useFallback = body?.useFallback

    if (!message) {
      return reply.status(400).send({ error: 'message required' })
    }

    const response = await nicholasCoreIntegration.agentChat(agentName, message, {
      useNeural,
      useFallback,
    })

    return {
      success: true,
      response,
    }
  } catch (error: any) {
    logError(error as Error, { context: 'POST /api/ai/unified/agent/:agentName' })
    return reply.status(500).send({ error: 'Failed to generate agent response' })
  }
})

async function listenWithFallback(startPort: number, attempts = 20): Promise<number> {
  let port = startPort
  for (let i = 0; i < attempts; i++) {
    try {
      await server.listen({ port, host: '0.0.0.0' })
      try {
        const addr: any = (server as any).server?.address?.() || { port }
        port = Number(addr?.port || port)
        const rtDir = join(__dirname, '..', '..', 'storage', 'runtime')
        if (!existsSync(rtDir)) mkdirSync(rtDir, { recursive: true })
        writeFileSync(join(rtDir, 'port.txt'), String(port), 'utf8')
      } catch {}
      return port
    } catch (err: any) {
      if (err && err.code === 'EADDRINUSE') {
        port += 1
        continue
      }
      throw err
    }
  }
  throw new Error(`No free port in range starting at ${startPort}`)
}

const start = async () => {
  try {
    // Validate configuration
    const validation = validateConfig()
    if (!validation.valid) {
      logger.warn('Configuration validation warnings:', { errors: validation.errors })
    }

    logInfo('🚀 Starting Matrix Platform...', {
      region: config.region,
      environment: config.environment,
      version: config.monitoring.version || '0.1.0'
    })

    // Check database health
    const dbHealthy = await checkDatabaseHealth()
    if (!dbHealthy) {
      throw new Error('Database health check failed')
    }
    logInfo('✅ Database connected')

    // Enable pgvector extension
    try {
      await enablePgVector()
      logInfo('✅ pgvector extension enabled')
    } catch (error) {
      logError(error as Error, { context: 'pgvector setup' })
      logInfo('⚠️ pgvector not available, using fallback')
    }

    // Check Redis health
    const redisHealthy = await checkRedisHealth()
    if (!redisHealthy) {
      logInfo('⚠️ Redis not available, continuing without cache')
    } else {
      logInfo('✅ Redis connected')
    }

    // Register lifecycle integrations
    registerLifecycleHooks()
    logInfo('✅ Lifecycle hooks registered')

    // Initialize AI agents
    try {
      if (config.ai.openai.apiKey || config.ai.anthropic.apiKey) {
        initializeAgents()
        logInfo('✅ AI agents initialized')
      } else {
        logInfo('⚠️ AI API keys not configured, AI agents disabled')
      }
    } catch (error) {
      logError(error as Error, { context: 'AI agents initialization' })
      logInfo('⚠️ AI agents not available, continuing without them')
    }

    // Start Bots workers
    registerBots()
    logInfo('✅ Bots registered')

    // Start server
    const START_PORT = Number(process.env.PORT || 3000)
    const PORT = await listenWithFallback(START_PORT)
    logInfo(`✅ Backend listening on http://localhost:${PORT}`, {
      port: PORT,
      region: config.region,
      version: config.monitoring.version || '0.1.0'
    })

    // Periodic org sync (lightweight)
    setInterval(async () => {
      try {
        await syncOrgFromProjects()
      } catch (error) {
        logError(error as Error, { context: 'org sync' })
      }
    }, 30000)

    // Periodic KPIs snapshot
    setInterval(async () => {
      try {
        await captureKpisSnapshot()
      } catch (error) {
        logError(error as Error, { context: 'KPIs snapshot' })
      }
    }, 45000)

    // Start self-evolving analysis
    try {
      const { startSelfEvolvingAnalysis, startAutoImprovement } = require('./core/selfEvolving')
      startSelfEvolvingAnalysis(3600000) // Every hour
      startAutoImprovement(7200000) // Every 2 hours
      logInfo('✅ Self-evolving analysis and auto-improvement started')
    } catch (error) {
      logError(error as Error, { context: 'self-evolving setup' })
    }

    // Start Phase 3 - Enterprise-Grade System
    try {
      // Start security monitoring
      setInterval(async () => {
        try {
          await securitySystem.scanVulnerabilities()
        } catch (error) {
          logError(error as Error, { context: 'security scanning' })
        }
      }, 3600000) // Every hour
      logInfo('✅ Security monitoring started')

      // Start performance monitoring
      setInterval(async () => {
        try {
          const usage = process.memoryUsage()
          updateMemoryUsage('heap', usage.heapUsed)
          updateMemoryUsage('rss', usage.rss)
          updateMemoryUsage('external', usage.external)

          const cacheStats = advancedCache.getStats()
          updateCacheHitRate(cacheStats.hitRate)
        } catch (error) {
          logError(error as Error, { context: 'performance monitoring' })
        }
      }, 30000) // Every 30 seconds
      logInfo('✅ Performance monitoring started')

      // Start auto-scaling monitoring
      try {
        autoScaler.startMonitoring(60000) // Every minute
        logInfo('✅ Auto-scaling monitoring started')
      } catch (error) {
        logError(error as Error, { context: 'auto-scaling setup' })
      }

      // Start load balancer health checks
      try {
        loadBalancer.startHealthChecks()
        logInfo('✅ Load balancer health checks started')
      } catch (error) {
        logError(error as Error, { context: 'load balancer setup' })
      }
    } catch (error) {
      logError(error as Error, { context: 'Phase 3 setup' })
    }

    // Periodic system evolution
    setInterval(async () => {
      try {
        const { evolveSystem } = await import('./core/selfEvolving')
        await evolveSystem()
      } catch (error) {
        logError(error as Error, { context: 'system evolution' })
      }
    }, 300000) // Every 5 minutes

    logInfo('✅ Matrix Platform started successfully')
  } catch (err) {
    logError(err as Error, { context: 'startup' })
    captureException(err as Error, { context: 'startup' })
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logInfo('🛑 SIGTERM received, shutting down gracefully...')
  await disconnectDatabase()
  await disconnectRedis()
  await server.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logInfo('🛑 SIGINT received, shutting down gracefully...')
  await disconnectDatabase()
  await disconnectRedis()
  await server.close()
  process.exit(0)
})

// Start application
start()
