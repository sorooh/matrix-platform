# Matrix Scaffold — Acceptance Criteria (Milestone 1)

This document lists the acceptance criteria for the Dashboard MVP.

Must-have (pass all to accept Milestone 1)
- `docker-compose up --build` runs the backend and frontend on ports 3000 and 5173 respectively.
- Frontend UI loads and shows the Apps list from `GET /api/apps`.
- Running an app via the UI triggers a job and the job lifecycle (pending -> running -> completed) is visible.
- When the job completes the preview iframe reloads and shows `/apps/{slug}` content.
- The Agent chat accepts a message and displays a simulated reply from `POST /api/agents/chat`.
- The included smoke check (`matrix-scaffold/test/smoke.ps1`) finishes successfully.

Optional / Nice-to-have (for early review)
- SSE events are delivered to the frontend and status updates are real-time.
- A screenshot/GIF demonstrating Run -> Job -> Preview is attached to the PR.

Milestone 2 (Snapshots)
- Worker captures PNG+HTML snapshots of running previews using Puppeteer.
- POST /api/snapshot/:app enqueues a snapshot job (returns 202 + id).
- GET /api/snapshots/:id returns snapshot metadata with paths to png/html when completed.

Verification steps (Snapshots)
1. Start the backend and start the worker:

```powershell
# in one terminal
cd matrix-scaffold\backend
npm ci
npm run dev

# in another terminal
cd matrix-scaffold\backend
npm run worker
```

2. Call the snapshot endpoint:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/snapshot/admin-dashboard -Method POST
# returns { id: "..." }
```

3. Poll GET /api/snapshots/:id until status is 'completed' and then inspect `matrix-scaffold/storage/<id>/preview.png` and `preview.html`.

Notes on optional S3 storage
- If you set the environment variable `SNAPSHOT_S3_BUCKET` (or `S3_BUCKET`) and provide AWS credentials in the environment, the worker will upload snapshot artifacts to S3 and the backend will redirect to signed S3 URLs when serving snapshot files.
- CI-friendly: set AWS credentials as Actions secrets and the bucket name in `SNAPSHOT_S3_BUCKET` to store artifacts in S3 instead of the runner workspace.


Verification steps
1. Follow README run steps to start services.
2. Use the frontend to run an app and observe status.
3. Run the smoke script to confirm end-to-end.
4. Add any issues to the PR as comments.
