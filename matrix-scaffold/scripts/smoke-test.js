// Simple smoke test: verify node can require package.json and exit 0
const fs = require('fs');
try {
  const pkg = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'package.json'), 'utf8'))
  console.log('Found package.json, name=' + (pkg.name||'<unknown>'))
  process.exit(0)
} catch (e) {
  console.error('Smoke test failed:', e.message)
  process.exit(2)
}
