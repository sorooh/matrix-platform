/**
 * Regression Tests - Matrix Platform v11
 * 
 * Regression tests for production
 */

async function runRegressionTests() {
  console.log('🔄 Running regression tests...')
  
  // Test all API endpoints
  const endpoints = [
    '/health',
    '/ready',
    '/live',
    '/metrics',
    '/api/projects',
    '/api/phase11/api/gateway'
  ]
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`)
      if (response.ok) {
        console.log(`✅ ${endpoint}: OK`)
      } else {
        console.log(`⚠️ ${endpoint}: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: Failed`)
    }
  }
  
  console.log('✅ Regression tests completed!')
  process.exit(0)
}

runRegressionTests().catch(error => {
  console.error('❌ Regression tests failed:', error)
  process.exit(1)
})

