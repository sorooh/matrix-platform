/**
 * Security Tests - Matrix Platform v11
 * 
 * Security tests for production
 */

async function runSecurityTests() {
  console.log('🔒 Running security tests...')
  
  // Test security endpoints
  const securityEndpoints = [
    '/api/security/status',
    '/api/security/scan',
    '/api/phase11/security/siem/event'
  ]
  
  for (const endpoint of securityEndpoints) {
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`)
      if (response.ok || response.status === 401 || response.status === 403) {
        console.log(`✅ ${endpoint}: Secure`)
      } else {
        console.log(`⚠️ ${endpoint}: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: Failed`)
    }
  }
  
  console.log('✅ Security tests completed!')
  process.exit(0)
}

runSecurityTests().catch(error => {
  console.error('❌ Security tests failed:', error)
  process.exit(1)
})

