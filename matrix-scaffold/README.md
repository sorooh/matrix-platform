# Matrix Scaffold (simulation)

This scaffold provides a simulated backend API and a small React frontend (dashboard) to preview apps.

Quick start (requires Node.js and Docker Compose):

1. Run with docker-compose (development):

```powershell
cd matrix-scaffold
docker-compose up --build
```

2. Backend API: http://localhost:3000
   - GET /api/apps
   - POST /api/run { app }
   - GET /apps/:slug (preview)

3. Frontend dev: http://localhost:5173

This is the MVP simulation used to build the Dashboard UI.

Acceptance checklist (how to verify MVP)
1. Start services (docker-compose up --build) and confirm services are healthy:
   - Backend: http://localhost:3000
   - Frontend: http://localhost:5173
2. Open the frontend and use the UI to Run an app. The preview iframe must load the simulated app page.
3. The job should transition from pending -> running -> completed (visible in the UI status). The iframe should refresh when job completes.
4. Run the smoke script to verify end-to-end behavior:

```powershell
cd matrix-scaffold/test
.\smoke.ps1
```

5. Agents chat: in the left panel send a message — you should see a simulated agent reply.

If all the above pass, the MVP is accepted for Milestone 1.

Snapshots, thumbnails and CI notes

- Thumbnails: the snapshot worker generates a full-page PNG (`preview.png`) and a thumbnail (`thumb.png`) for each snapshot. By default thumbnails are PNG to preserve visual fidelity.
- sharp: the worker prefers to use the native `sharp` library to create high-quality thumbnails from the full PNG. `sharp` is included as a dependency; CI (GitHub Actions) supports installing its native binaries. On some local Windows setups you may need build tools if prebuilt binaries are unavailable.
- S3: optionally set `SNAPSHOT_S3_BUCKET` (and AWS credentials in env) to upload snapshot artifacts to S3. See `matrix-scaffold/docs/aws-iam-policy.md` for a minimal IAM policy and instructions.

If you need thumbnails as JPEG to save space, I can switch the worker to produce JPEG thumbs instead — currently PNG is used for best visual fidelity.
