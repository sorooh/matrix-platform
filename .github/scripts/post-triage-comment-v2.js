#!/usr/bin/env node
// Simple triage poster v2
// Usage: node post-triage-comment-v2.js errors.txt
// Environment:
// - DRY_RUN=1 to only print the comment
// - REPO owner/repo
// - PR_NUMBER pull request number
// - TRIAGE_POST_TOKEN optional PAT with repo or public_repo

const fs = require('fs')
const path = require('path')

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: node post-triage-comment-v2.js <errors.txt>')
    process.exitCode = 2
    return
  }
  let txt
  try {
    txt = fs.readFileSync(arg, 'utf8')
  } catch (e) {
    console.error('Cannot read file', arg)
    process.exitCode = 2
    return
  }

  const repo = process.env.REPO || process.env.GITHUB_REPOSITORY || ''
  const pr = process.env.PR_NUMBER || process.env.GITHUB_REF_NAME || '1'
  const dry = !!process.env.DRY_RUN
  const runUrl = process.env.GITHUB_RUN_URL || ''
  const title = 'CI Triage Report'

  const bodyLines = []
  bodyLines.push('### CI Triage Report')
  if (runUrl) bodyLines.push(`Workflow run: ${runUrl}`)
  bodyLines.push('\n<details>')
  bodyLines.push('\n<summary>Errors (click to expand)</summary>\n')
  bodyLines.push('')
  bodyLines.push('```')
  bodyLines.push(txt.trim())
  bodyLines.push('```')
  bodyLines.push('\n</details>')
  bodyLines.push('')
  bodyLines.push('_This is an automated triage comment. Set `TRIAGE_POST_TOKEN` as a repository secret to enable real posting from CI._')

  const body = bodyLines.join('\n')

  if (dry) {
    console.log('DRY_RUN=1 -> printing comment that would be posted:')
    console.log('---')
    console.log(body)
    console.log('---')
    return
  }

  const token = process.env.TRIAGE_POST_TOKEN
  if (!token) {
    console.error('TRIAGE_POST_TOKEN not set; run with DRY_RUN=1 to preview')
    process.exitCode = 3
    return
  }

  // post comment to PR
  if (!repo) {
    console.error('REPO not set')
    process.exitCode = 4
    return
  }
  const [owner, repoName] = repo.split('/')
  const prNumber = pr
  const url = `https://api.github.com/repos/${owner}/${repoName}/issues/${prNumber}/comments`

  const payload = { body: `**${title}**\n\n${body}` }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `token ${token}`,
        'User-Agent': 'triage-poster-script'
      },
      body: JSON.stringify(payload)
    })
    const data = await res.text()
    if (res.status >= 200 && res.status < 300) {
      console.log('Posted triage comment to PR', prNumber)
      return
    }
    console.error('Failed to post comment', res.status, data)
    process.exitCode = 5
  } catch (e) {
    console.error('Error posting comment', String(e))
    process.exitCode = 6
  }
}

// Node 18+ has global fetch. If not available, require('node-fetch') dynamically.
if (typeof fetch === 'undefined') {
  try {
    global.fetch = require('node-fetch')
  } catch (e) {
    console.error('No fetch available; install Node 18+ or add node-fetch')
    process.exitCode = 1
    process.exit()
  }
}

main()
#!/usr/bin/env node
// Robust poster using native https and retries so it works on Node 12+ without global fetch.
// Improvements: accepts args/env fallbacks, reads GITHUB_EVENT_PATH to discover PR number,
// includes a run URL when available, and sets a User-Agent header.
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
          'Content-Length': Buffer.byteLength(body, 'utf8'),
          'User-Agent': 'matrix-platform-triage-bot/1.0'
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

function tryParseEventPrNumber() {
  const evPath = process.env.GITHUB_EVENT_PATH;
  if (!evPath) return undefined;
  try {
    const ev = JSON.parse(fs.readFileSync(evPath, 'utf8'));
    if (ev && ev.pull_request && Number(ev.pull_request.number)) return String(ev.pull_request.number);
    if (ev && ev.issue && Number(ev.issue.number)) return String(ev.issue.number);
  } catch (e) {
    // ignore
  }
  return undefined;
}

function extractPrFromRef(ref) {
  // refs/pull/123/merge
  if (!ref) return undefined;
  const m = ref.match(/^refs\/pull\/(\d+)\/merge$/) || ref.match(/^refs\/pull\/(\d+)\/head$/);
  return m ? m[1] : undefined;
}

async function main() {
  // args: [node, script, optional-errors-path]
  const argErrors = process.argv[2];
  const errorsPath = path.resolve(process.cwd(), argErrors || process.env.ERRORS_PATH || 'errors.txt');

  const repo = process.env.REPO || process.env.GITHUB_REPOSITORY;
  let pr = process.env.PR_NUMBER || process.env.PR || process.env.GITHUB_PR_NUMBER;
  if (!pr) pr = tryParseEventPrNumber() || extractPrFromRef(process.env.GITHUB_REF);

  const token = process.env.TRIAGE_POST_TOKEN || process.env.GITHUB_TOKEN;

  if (!repo) {
    console.error('REPO environment variable not set (owner/repo) and GITHUB_REPOSITORY not present');
    process.exit(2);
  }
  if (!pr) {
    console.error('PR number not found. Set PR_NUMBER env or run in a pull_request context.');
    process.exit(2);
  }
  if (!token) {
    console.error('No TRIAGE_POST_TOKEN or GITHUB_TOKEN provided; cannot post comment');
    process.exit(2);
  }

  if (!fs.existsSync(errorsPath)) {
    console.error(`errors file not found at ${errorsPath}; nothing to post`);
    process.exit(0);
  }

  let body = fs.readFileSync(errorsPath, 'utf8').trim();
  if (!body) {
    console.log('errors.txt is empty; nothing to post');
    process.exit(0);
  }

  const maxBody = 12000;
  let truncated = false;
  if (body.length > maxBody) { body = body.slice(0, maxBody); truncated = true; }

  // include run url if running under Actions
  let runUrl = '';
  if (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID) {
    runUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  }

  const header = 'Automated CI analysis detected potential issues';
  const runLine = runUrl ? `\nRun: ${runUrl}\n` : '';
  const truncNote = truncated ? '\n... (truncated)' : '';
  const comment = `${header}${runLine}\n\n\`\`\`\n${body}${truncNote}\n\`\`\``;

  const [owner, repository] = repo.split('/');
  const url = `https://api.github.com/repos/${owner}/${repository}/issues/${pr}/comments`;

  // DRY_RUN mode: don't perform network calls, just print what would be posted.
  if (process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true') {
    console.log('DRY_RUN enabled — will not post to GitHub. Constructed comment:');
    console.log('--- BEGIN COMMENT ---');
    console.log(comment);
    console.log('--- END COMMENT ---');
    process.exit(0);
  }

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Posting comment to ${owner}/${repository}#${pr} (attempt ${attempt})`);
      const res = await postJson(url, token, { body: comment });
      if (res && res.html_url) console.log('Comment posted:', res.html_url);
      else console.log('Comment posted (no url returned)');
      process.exit(0);
    } catch (err) {
      const status = err && err.statusCode;
      console.error(`Attempt ${attempt} failed:`, (err && err.message) || err);
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
