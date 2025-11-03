Triage automation notes
=======================

This folder contains CI triage helpers used by the repository workflows.

post-triage-comment-v2.js
------------------------
- A small, dependency-free Node script that posts `errors.txt` to a pull request
  as a comment using the GitHub REST API.
- It uses Node's built-in `https` module and retries (3 attempts) before failing.
- The script truncates the comment to ~12KB to avoid very large PR comments.

Enabling automatic posting from the workflow
--------------------------------------------
1. Create a repository secret named `TRIAGE_POST_TOKEN` containing a personal
   access token (PAT). For private repos the token requires `repo` -> `issues`
   scope so it can create issue comments on PRs. Use the least-privilege token
   that still permits posting comments.

2. The triage workflow (`.github/workflows/ci-triage.yml`) will detect the
   presence of `TRIAGE_POST_TOKEN` and run the poster script automatically.
   If the secret is not present the workflow will still upload `errors.txt` as
   an artifact and the local triage agent (or a maintainer) can download and
   post the comment manually.

Troubleshooting
---------------
- If the workflow logs show `Resource not accessible by integration` or `403`,
  verify the PAT scopes and ensure the PR isn't from a fork where the token is
  restricted.
- If the poster step fails with network errors the script will retry; check
  the run logs for the last response body to diagnose API errors.

Local posting (for maintainers)
-------------------------------
You can post `errors.txt` locally using the authenticated GitHub CLI or the
poster script (if you prefer):

Using `gh` (authenticated on your machine):

```powershell
gh pr comment <PR_NUMBER> --body-file .github/errors.txt
```

Using the in-repo script (node 12+):

```powershell
$env:TRIAGE_POST_TOKEN = '<your-PAT>'
$env:REPO = 'owner/repo'
$env:PR_NUMBER = '4'
node .github/scripts/post-triage-comment-v2.js
```

Notes
-----
- Keep `TRIAGE_POST_TOKEN` secret and rotate it regularly. For CI posting you
  may prefer using a machine user with a scoped PAT.
