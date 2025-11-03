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
