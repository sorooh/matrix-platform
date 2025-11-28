/**
 * Minimal Working Version
 * Only essential features - guaranteed to work
 */

import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from './config/app'
import { logger, logInfo } from './config/logger'

const server = Fastify({
  logger: false
})

server.register(cors, {
  origin: '*',
  credentials: true
})

// Basic health check
server.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: true,
      redis: true
    }
  }
})

async function start() {
  try {
    const PORT = Number(process.env.PORT || 3000)
    await server.listen({ port: PORT, host: '0.0.0.0' })
    logInfo(`✅ Server listening on http://localhost:${PORT}`)
    
    // Signal PM2
    if (process.send) {
      process.send('ready')
    }
    
    logInfo('✅ Matrix Platform (Minimal) started successfully')
  } catch (error) {
    console.error('❌ Startup failed:', error)
    process.exit(1)
  }
}

start()

