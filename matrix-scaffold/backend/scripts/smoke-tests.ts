/**
 * Smoke Tests - Matrix Platform v11
 * 
 * Quick smoke tests for production
 */

import { productionHealth } from '../src/health/productionHealth'

async function runSmokeTests() {
  console.log('💨 Running smoke tests...')
  
  try {
    // Health check
    const health = await productionHealth.checkHealth()
    console.log('✅ Health check:', health.status)
    
    // Basic checks
    console.log('✅ Database:', health.checks.database.status)
    console.log('✅ Redis:', health.checks.redis.status)
    console.log('✅ Modules:', Object.values(health.checks.modules).every(m => m === 'active') ? 'active' : 'inactive')
    console.log('✅ Services:', Object.values(health.checks.services).every(s => s === 'healthy') ? 'healthy' : 'unhealthy')
    
    console.log('✅ Smoke tests passed!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Smoke tests failed:', error)
    process.exit(1)
  }
}

runSmokeTests()

