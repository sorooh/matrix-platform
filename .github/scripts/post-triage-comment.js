#!/usr/bin/env node
// Post triage errors (errors.txt) as a PR comment using GitHub REST API
// Usage (in workflow):
//   TRIAGE_POST_TOKEN=... PR_NUMBER=4 REPO=owner/repo node ./.github/scripts/post-triage-comment.js

const fs = require('fs');
const path = require('path');

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
  // truncate to a safe length
  if (body.length > 12000) body = body.slice(0, 12000) + '\n... (truncated)';
  const comment = `Automated CI analysis detected potential issues:\n\n\`\`\`\n${body}\n\`\`\``;

  const url = `https://api.github.com/repos/${owner}/${repository}/issues/${pr}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `token ${token}`,
      'accept': 'application/vnd.github.v3+json',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ body: comment })
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Failed to post comment:', res.status, res.statusText);
    console.error(text);
    process.exit(3);
  }

  const json = await res.json();
  console.log('Comment posted:', json.html_url);
}

// Node v18+ has global fetch. If not available, fail elegantly.
if (typeof fetch !== 'function') {
  console.error('Global fetch not available in this Node runtime. Use Node 18+ or add a small fetch polyfill.');
  process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
