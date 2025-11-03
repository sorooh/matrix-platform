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

Verification steps
1. Follow README run steps to start services.
2. Use the frontend to run an app and observe status.
3. Run the smoke script to confirm end-to-end.
4. Add any issues to the PR as comments.
