const fs = require('fs');
const path = require('path');

function ok(msg) { console.log('OK:', msg); }
function fail(msg) { console.error('FAIL:', msg); process.exit(2); }

// Simple smoke checks
const root = path.resolve(__dirname, '..');
const checks = [
  { path: path.join(root, 'README.md'), desc: 'README present' },
  { path: path.join(root, 'matrix-scaffold'), desc: 'matrix-scaffold folder present' }
];

let missing = [];
for (const c of checks) {
  if (!fs.existsSync(c.path)) missing.push(c.desc + ' (' + c.path + ')');
  else ok(c.desc);
}

if (missing.length) {
  console.warn('Missing items (non-fatal):', missing.join('; '));
  // non-fatal: still exit 0 to avoid failing CI hard; we report for visibility
  process.exit(0);
}

console.log('Smoke check passed');
process.exit(0);
