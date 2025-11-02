#!/usr/bin/env node
// Robust poster using native https and retries so it works on Node 12+ without global fetch.
const fs = require('fs');
const path = require('path');
const https = require('https');

function postJson(url, token, payload) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const body = JSON.stringify(payload);
      const options = {
        hostname: u.hostname,
        path: u.pathname + (u.search || ''),
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body, 'utf8')
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); }
          } else {
            const err = new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`);
            err.statusCode = res.statusCode;
            err.body = data;
            reject(err);
          }
        });
      });
      req.on('error', (e) => reject(e));
      req.write(body);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function main() {
  const repo = process.env.REPO;
  const pr = process.env.PR_NUMBER;
  const token = process.env.TRIAGE_POST_TOKEN || process.env.GITHUB_TOKEN;

  if (!repo) {
    console.error('REPO environment variable not set (owner/repo)');
    process.exit(2);
  }
  if (!pr) {
    console.error('PR_NUMBER environment variable not set');
    process.exit(2);
  }
  if (!token) {
    console.error('No TRIAGE_POST_TOKEN or GITHUB_TOKEN provided; cannot post comment');
    process.exit(2);
  }

  const [owner, repository] = repo.split('/');
  const errorsPath = path.resolve(process.cwd(), 'errors.txt');
  if (!fs.existsSync(errorsPath)) {
    console.error('errors.txt not found in workspace; nothing to post');
    process.exit(0);
  }

  let body = fs.readFileSync(errorsPath, 'utf8');
  if (body.length > 12000) body = body.slice(0, 12000) + '\n... (truncated)';
  const comment = 'Automated CI analysis detected potential issues:\n\n```\n' + body + '\n```';

  const url = `https://api.github.com/repos/${owner}/${repository}/issues/${pr}/comments`;

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await postJson(url, token, { body: comment });
      if (res && res.html_url) console.log('Comment posted:', res.html_url);
      else console.log('Comment posted (no url returned)');
      return;
    } catch (err) {
      const status = err && err.statusCode;
      console.error(`Attempt ${attempt} failed:`, err.message || err);
      if (status === 403 || status === 404) {
        console.error('Permanent error posting comment; check token scopes and PR visibility. Response body:', err.body || '');
        process.exit(3);
      }
      if (attempt < maxAttempts) {
        const wait = 1000 * attempt;
        console.log(`Retrying in ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        console.error('All attempts failed. Last response body:', err.body || '');
        process.exit(4);
      }
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err && err.stack ? err.stack : err);
  process.exit(1);
});
