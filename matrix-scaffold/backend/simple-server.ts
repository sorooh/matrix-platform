/**
 * Simple Test Server
 * Minimal server to test if the issue is with the code or environment
 */

import Fastify from 'fastify'

const server = Fastify({
  logger: true
})

server.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

async function start() {
  try {
    const PORT = Number(process.env.PORT || 3000)
    await server.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`✅ Simple server listening on http://localhost:${PORT}`)
    
    // Signal PM2 that app is ready
    if (process.send) {
      process.send('ready')
      console.log('✅ Sent ready signal to PM2')
    }
  } catch (error) {
    console.error('❌ Server failed:', error)
    process.exit(1)
  }
}

start()

