/**
 * Simple Startup Test
 * Tests if the application can start without errors
 */

import Fastify from 'fastify'

const testServer = Fastify({
  logger: true
})

testServer.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

async function test() {
  try {
    const PORT = Number(process.env.PORT || 3000)
    await testServer.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`✅ Test server listening on http://localhost:${PORT}`)
    
    // Signal PM2 that app is ready
    if (process.send) {
      process.send('ready')
      console.log('✅ Sent ready signal to PM2')
    }
    
    console.log('✅ Test server started successfully!')
  } catch (error) {
    console.error('❌ Test server failed:', error)
    process.exit(1)
  }
}

test()

